import { useEffect } from 'react';
import { useGoogleMap } from '@react-google-maps/api';

// Screen-space, additive density overlay using the supported Maps OverlayView API.
// Each point contributes its supplied weight; no synthetic points are introduced.
export function createDensityLayer(map, data, options = {}) {
    const layer = new window.google.maps.OverlayView();
    let canvas;
    layer.onAdd = () => {
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;pointer-events:none;';
        canvas.setAttribute('aria-hidden', 'true');
        layer.getPanes().overlayLayer.appendChild(canvas);
    };
    layer.draw = () => {
        if (!canvas) return;
        const projection = layer.getProjection();
        const bounds = map.getBounds();
        if (!projection || !bounds) return;
        const topLeft = projection.fromLatLngToDivPixel(new window.google.maps.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng()));
        const width = map.getDiv().clientWidth;
        const height = map.getDiv().clientHeight;
        if (!width || !height) return;
        canvas.width = width;
        canvas.height = height;
        canvas.style.left = `${topLeft.x}px`;
        canvas.style.top = `${topLeft.y}px`;
        canvas.style.opacity = String(options.opacity ?? 0.7);
        const ctx = canvas.getContext('2d');
        const radius = options.radius ?? 35;
        for (const point of data) {
            const location = point.location || point;
            const lat = typeof location.lat === 'function' ? location.lat() : Number(location.lat);
            const lng = typeof location.lng === 'function' ? location.lng() : Number(location.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
            const pixel = projection.fromLatLngToDivPixel(new window.google.maps.LatLng(lat, lng));
            const x = pixel.x - topLeft.x, y = pixel.y - topLeft.y;
            if (x < -radius || y < -radius || x > width + radius || y > height + radius) continue;
            const strength = Math.min(1, Math.max(0, Number(point.weight ?? 1)) / (options.maxIntensity || 5));
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(0,0,0,${strength})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x-radius, y-radius, radius*2, radius*2);
        }
        const pixels = ctx.getImageData(0, 0, width, height);
        for (let i = 0; i < pixels.data.length; i += 4) {
            const intensity = pixels.data[i+3] / 255;
            pixels.data[i] = Math.round(255 * Math.min(1, intensity * 2));
            pixels.data[i+1] = Math.round(210 * (1-intensity));
            pixels.data[i+2] = 35;
        }
        ctx.putImageData(pixels, 0, 0);
    };
    layer.onRemove = () => { canvas?.remove(); canvas = null; };
    layer.setMap(map);
    return layer;
}

export default function ReportDensityLayer({ data, options }) {
    const map = useGoogleMap();
    useEffect(() => {
        if (!map || !data?.length) return;
        const layer = createDensityLayer(map, data, options);
        return () => layer.setMap(null);
    }, [map, data, options]);
    return null;
}
