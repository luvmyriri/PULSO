"""Read-only GeoRiskPH public map views. No inferred asset hazard classifications."""
from datetime import datetime, timezone
from threading import Lock
from time import monotonic
import base64
import math
from urllib.parse import urlparse
from functools import lru_cache
from io import BytesIO

import httpx
from PIL import Image, ImageChops, ImageDraw
from shapely.geometry import shape
from shapely.ops import unary_union
from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_user
from government_access import can
import models

router = APIRouter(prefix="/api/gov/predictive/hazard-layers", tags=["predictive"])
ROOT = "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/"
LAYERS = {
    "flood": ("Flood susceptibility", "MGB", "MGBPublic/Flood"),
    "landslide": ("Rain-induced landslide susceptibility", "MGB", "MGBPublic/RainInducedLandslide"),
    "faults": ("Active faults", "PHIVOLCS", "PHIVOLCSPublic/ActiveFault"),
    "liquefaction": ("Liquefaction susceptibility", "PHIVOLCS", "PHIVOLCSPublic/Liquefaction"),
}
_cache = {}
_lock = Lock()
_render_cache = {}


@lru_cache(maxsize=1)
def _city_outline():
    # The same versioned reference geometries used by the Reports map outlines.
    from map_reference import load_bundle
    features, digest = load_bundle()
    return unary_union([shape(feature["geometry"]).buffer(0) for feature in features
                        if feature["properties"]["layer"] == "city"]), digest


def _boundary_mask(size, bounds, city):
    west, south, east, north = bounds
    width, height = size
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    def pixels(ring):
        return [((lon - west) / (east - west) * width,
                 (north - lat) / (north - south) * height) for lon, lat in ring.coords]
    polygons = [city] if city.geom_type == "Polygon" else city.geoms
    for polygon in polygons:
        draw.polygon(pixels(polygon.exterior), fill=255)
        for ring in polygon.interiors:
            draw.polygon(pixels(ring), fill=0)
    return mask


def _clip_to_city(content, bounds, city):
    with Image.open(BytesIO(content)) as source:
        image = source.convert("RGBA")
    image.putalpha(ImageChops.multiply(image.getchannel("A"), _boundary_mask(image.size, bounds, city)))
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


@lru_cache(maxsize=1)
def _city_sectors():
    from map_reference import load_bundle
    return [(feature["properties"]["sector"], shape(feature["geometry"]).buffer(0))
            for feature in load_bundle()[0] if feature["properties"]["layer"] == "city"]


def _visible_coverage(content, bounds, sector_shapes=None):
    """Visible source pixels, never an assertion that an unshaded area is safe."""
    with Image.open(BytesIO(content)) as source:
        image = source.convert("RGBA")
    alpha = image.getchannel("A")
    west, south, east, north = bounds
    def geographic_box(pixels):
        if pixels is None:
            return None
        left, top, right, bottom = pixels
        return dict(west=west + left / image.width * (east - west),
                    south=north - bottom / image.height * (north - south),
                    east=west + right / image.width * (east - west),
                    north=north - top / image.height * (north - south))
    sectors = []
    for name, geometry in (_city_sectors() if sector_shapes is None else sector_shapes):
        sector_alpha = ImageChops.multiply(alpha, _boundary_mask(image.size, bounds, geometry))
        sectors.append(dict(name=name,
                            has_visible_features=sector_alpha.getbbox() is not None,
                            bounds=geographic_box(sector_alpha.getbbox())))
    return dict(has_visible_features=alpha.getbbox() is not None,
                bounds=geographic_box(alpha.getbbox()), sectors=sectors)


def _access(user):
    if not isinstance(user, models.Official) or not can(user, "maintenance", "view"):
        raise HTTPException(403, "Maintenance access is required.")


def _source(layer_id):
    if layer_id not in LAYERS:
        raise HTTPException(404, "Hazard layer not found.")
    return ROOT + LAYERS[layer_id][2] + "/MapServer"


def _fetch(url, params, binary=False):
    key = (url, tuple(sorted(params.items())))
    with _lock:
        cached = _cache.get(key)
        if cached and cached[0] > monotonic():
            return cached[1]
    try:
        with httpx.Client(timeout=15, follow_redirects=False, trust_env=False) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
        if len(response.content) > 5_000_000:
            raise ValueError("Source response too large")
        if binary:
            if not response.content.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError("Source did not return a PNG")
            result = response.content
        else:
            result = response.json()
            if not isinstance(result, dict) or result.get("error"):
                raise ValueError("Source service error")
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(502, "The GeoRiskPH source is unavailable. Retry the layer or use the source portal.") from exc
    with _lock:
        if len(_cache) >= 128:
            _cache.clear()
        _cache[key] = (monotonic() + 3600, result)
    return result


@router.get("")
def catalog(user=Depends(get_current_user)):
    _access(user)
    return dict(items=[dict(id=key, name=value[0], agency=value[1], source_url=_source(key)) for key, value in LAYERS.items()],
                limitation="Static mapped susceptibility and fault traces support planning. They do not show current flooding, earthquake predictions, or engineering clearance.",
                portal_url="https://hazardhunter.georisk.gov.ph/", source_date="Not published by these map services")


@router.get("/{layer_id}/legend")
def legend(layer_id: str, user=Depends(get_current_user)):
    _access(user)
    source = _source(layer_id)
    data = _fetch(source + "/legend", {"f": "json"})
    items = [dict(label=item.get("label") or "Unlabeled source symbol", image_data=item.get("imageData"))
             for layer in data.get("layers", []) for item in layer.get("legend", [])
             if item.get("contentType") == "image/png" and len(item.get("imageData", "")) < 100_000]
    return dict(items=items, source_url=source, agency=LAYERS[layer_id][1],
                checked_at=datetime.now(timezone.utc).isoformat(), source_date="Not published by the service")


@router.get("/{layer_id}/map")
def map_image(layer_id: str, west: float = Query(..., ge=120.85, le=121.2, allow_inf_nan=False),
              south: float = Query(..., ge=14.5, le=14.85, allow_inf_nan=False),
              east: float = Query(..., ge=120.85, le=121.2, allow_inf_nan=False),
              north: float = Query(..., ge=14.5, le=14.85, allow_inf_nan=False), user=Depends(get_current_user)):
    _access(user)
    source = _source(layer_id)
    if west >= east or south >= north:
        raise HTTPException(422, "Choose a valid map extent within the Caloocan area.")
    city, boundary_digest = _city_outline()
    if city.is_empty:
        raise HTTPException(503, "City outlines are unavailable. Hazard shading cannot be clipped safely.")
    cache_key = (layer_id, west, south, east, north, boundary_digest)
    with _lock:
        cached = _render_cache.get(cache_key)
        if cached and cached[0] > monotonic():
            return cached[1]
    # Match the request's aspect ratio and bound the rendered image size.
    ratio = (east - west) / (north - south)
    size = f"1600,{max(1, round(1600 / ratio))}" if ratio >= 1 else f"{max(1, round(1600 * ratio))},1600"
    # ArcGIS adjusts the extent for image aspect ratio. Use its returned extent,
    # otherwise the hazard image will be shifted relative to assets and boundaries.
    exported = _fetch(source + "/export", dict(f="json", bbox=f"{west},{south},{east},{north}", bboxSR=4326,
                     imageSR=4326, size=size, format="png32", transparent="true"))
    href = exported.get("href", "")
    parsed = urlparse(href)
    expected_prefix = "/arcgis/rest/directories/arcgisoutput/" + LAYERS[layer_id][2] + "_MapServer/_ags_map"
    extent = exported.get("extent", {})
    values = [extent.get(key) for key in ("xmin", "ymin", "xmax", "ymax")]
    if (parsed.scheme != "https" or parsed.netloc != "ulap-hazards.georisk.gov.ph" or parsed.query
            or not parsed.path.startswith(expected_prefix) or not parsed.path.endswith(".png")
            or "/../" in parsed.path or "%" in parsed.path
            or not all(isinstance(value, (int, float)) and math.isfinite(value) for value in values)
            or extent.get("spatialReference", {}).get("wkid") != 4326):
        raise HTTPException(502, "The source returned an unsupported map extent or image location.")
    x1, y1, x2, y2 = values
    if not (-180 <= x1 < x2 <= 180 and -90 <= y1 < y2 <= 90):
        raise HTTPException(502, "The source returned an invalid map extent.")
    content = _fetch(href, {}, binary=True)
    try:
        content = _clip_to_city(content, values, city)
    except (OSError, ValueError) as exc:
        raise HTTPException(502, "The hazard image could not be clipped to the city outlines.") from exc
    result = dict(image_data=base64.b64encode(content).decode("ascii"),
                  bounds=dict(west=x1, south=y1, east=x2, north=y2),
                  clipped_to_city=True, boundary_digest=boundary_digest,
                  coverage=_visible_coverage(content, values))
    with _lock:
        if len(_render_cache) >= 32:
            _render_cache.clear()
        _render_cache[cache_key] = (monotonic() + 3600, result)
    return result
