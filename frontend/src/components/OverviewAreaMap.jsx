import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import boundaries from '../data/caloocan_simplified_boundary.json';

const formatCount = new Intl.NumberFormat('en-PH');
const TILE_SIZE = 256;
const project = ([longitude, latitude]) => {
    const sinLatitude = Math.sin(latitude * Math.PI / 180);
    return [
        TILE_SIZE * (longitude + 180) / 360,
        TILE_SIZE * (.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)),
    ];
};
const defaultSummary = { current: 0, blocked: 0, verification: 0 };

const geometryByBarangay = new Map(boundaries.features.map(({ properties, geometry }) => {
    const rings = (geometry.type === 'MultiPolygon' ? geometry.coordinates.flat() : geometry.coordinates)
        .map(ring => ring.map(project));
    const points = rings.flat();
    return [properties.brgy_num, {
        sector: properties.sector,
        path: rings.map(ring => `M${ring.map(point => point.map(value => value.toFixed(8)).join(' ')).join('L')}Z`).join(' '),
        bounds: [
            Math.min(...points.map(point => point[0])), Math.min(...points.map(point => point[1])),
            Math.max(...points.map(point => point[0])), Math.max(...points.map(point => point[1])),
        ],
    }];
}));

function summarize(areas) {
    return areas.reduce((totals, area) => ({
        current: totals.current + area.current,
        blocked: totals.blocked + area.blocked,
        verification: totals.verification + area.verification,
    }), defaultSummary);
}

function mapRegions(scope) {
    const districts = scope.districts.map(district => ({
        ...district, key: `district:${district.id}`, label: district.label,
        areas: district.barangays.map(area => ({
            ...area, key: `barangay:${area.id}`, districtKey: `district:${district.id}`,
            districtLabel: district.label, geometry: geometryByBarangay.get(area.reference),
        })),
    }));
    const barangays = districts.flatMap(district => district.areas);
    const sectors = ['North', 'South'].flatMap(sector => {
        const areas = barangays.filter(area => area.geometry?.sector === sector);
        return areas.length ? [{ key: `sector:${sector}`, label: `${sector} Caloocan sector`, areas, ...summarize(areas) }] : [];
    });
    return { districts, barangays, sectors };
}

function fitBounds(areas) {
    const bounds = areas.map(area => area.geometry.bounds);
    const minX = Math.min(...bounds.map(box => box[0]));
    const minY = Math.min(...bounds.map(box => box[1]));
    const width = Math.max(...bounds.map(box => box[2])) - minX;
    const height = Math.max(...bounds.map(box => box[3])) - minY;
    const padding = Math.max(width, height, .000001) * .085;
    return [minX - padding, minY - padding, width + 2 * padding, height + 2 * padding];
}

function visibleTiles(areas, viewBox, size) {
    if (!size?.width || !size.height) return [];
    const [left, top, width, height] = viewBox;
    const scale = Math.min(size.width / width, size.height / height);
    const zoom = Math.min(19, Math.max(0, Math.ceil(Math.log2(scale))));
    const step = TILE_SIZE / 2 ** zoom;
    const tiles = [];
    for (let x = Math.floor(left / step); x < Math.ceil((left + width) / step); x++) {
        for (let y = Math.floor(top / step); y < Math.ceil((top + height) / step); y++) {
            const tileLeft = x * step;
            const tileTop = y * step;
            if (areas.some(({ geometry: { bounds: [x1, y1, x2, y2] } }) =>
                tileLeft < x2 && tileLeft + step > x1 && tileTop < y2 && tileTop + step > y1)) {
                tiles.push({ key: `${zoom}/${x}/${y}`, x: tileLeft, y: tileTop, size: step });
            }
        }
    }
    return tiles;
}

function MapPreview({ areas, shapes, activeKey, title, onSelect }) {
    const clipId = useId();
    const svg = useRef(null);
    const [size, setSize] = useState(null);
    const [failed, setFailed] = useState(() => new Set());
    useEffect(() => {
        const element = svg.current;
        const observer = new ResizeObserver(([{ contentRect }]) => {
            setSize({ width: contentRect.width, height: contentRect.height });
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const viewBox = fitBounds(areas);
    const tiles = visibleTiles(areas, viewBox, size);
    const detailUnavailable = tiles.length > 0 && tiles.every(tile => failed.has(tile.key));
    return <figure className="gov-bi-area-map__preview">
        <svg ref={svg} className="gov-bi-map" viewBox={viewBox.join(' ')} role="img"
            aria-label={`${title}. Select a boundary on the map or use the area list.`}>
            <defs>
                <clipPath id={clipId}>
                    {areas.map(area => <path key={area.key} d={area.geometry.path} clipRule="evenodd"/>)}
                </clipPath>
            </defs>
            <g className="gov-bi-map__basemap" clipPath={`url(#${clipId})`} pointerEvents="none" aria-hidden="true">
                <rect x={viewBox[0]} y={viewBox[1]} width={viewBox[2]} height={viewBox[3]}/>
                {tiles.map(tile => !failed.has(tile.key) && <image key={tile.key}
                    href={`https://tile.openstreetmap.org/${tile.key}.png`}
                    x={tile.x} y={tile.y} width={tile.size} height={tile.size}
                    onError={() => setFailed(previous => new Set([...previous, tile.key]))}/>)}
            </g>
            <g className="gov-bi-area-map__shapes gov-bi-map__boundaries">{shapes.map(shape => {
                const canZoom = shape.key !== activeKey;
                return <g key={shape.key} className={canZoom ? 'can-zoom' : 'is-selected'}
                    onClick={canZoom ? () => onSelect(shape.key) : undefined}>
                    {shape.areas.map(area => <path key={area.key} d={area.geometry.path} fillRule="evenodd"
                        className={area.current ? 'has-work' : undefined}><title>{shape.label}</title></path>)}
                </g>;
            })}</g>
        </svg>
        {detailUnavailable && <span className="gov-bi-area-map__unavailable" role="status">Map detail unavailable</span>}
        <figcaption><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a></figcaption>
    </figure>;
}

export default function OverviewAreaMap({ scope }) {
    const [selection, setSelection] = useState('');
    const regions = useMemo(() => scope && mapRegions(scope), [scope]);
    if (!regions) return <p className="gov-bi-empty">Area records are unavailable.</p>;
    const { districts, sectors, barangays } = regions;
    if (!districts.length) return <p className="gov-bi-empty">No districts are recorded for your work-order scope.</p>;

    const region = [...districts, ...sectors, ...barangays].find(item => item.key === selection);
    const activeKey = region?.key ?? '';
    const title = region?.label ?? 'All permitted areas';
    const summary = region ?? scope.totals;
    const areas = region ? (region.areas ?? [region]) : barangays;
    const mapped = areas.filter(area => area.geometry);
    const groupByDistrict = !region && new Set(mapped.map(area => area.districtKey)).size > 1;
    const shapes = groupByDistrict
        ? districts.map(district => ({ ...district, areas: district.areas.filter(area => area.geometry) })).filter(district => district.areas.length)
        : mapped.map(area => ({ key: area.key, label: area.label, areas: [area] }));

    return <div className="gov-bi-area-map">
        <div className="gov-bi-area-map__controls">
            <label><span className="sr-only">Work order map area</span>
                <select className="gov-bi-select" value={activeKey} onChange={event => setSelection(event.target.value)}>
                    <option value="">All permitted areas</option>
                    <optgroup label="Districts">{districts.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</optgroup>
                    {sectors.length > 0 && <optgroup label="Sectors">{sectors.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</optgroup>}
                    {barangays.length > 0 && <optgroup label="Barangays">{barangays.map(item => <option key={item.key} value={item.key}>{item.label} · {item.districtLabel}</option>)}</optgroup>}
                </select>
            </label>
            <button type="button" className="gov-bi-select gov-bi-area-map__reset" onClick={() => setSelection('')} disabled={!activeKey}>
                <RotateCcw size={13} aria-hidden="true"/> Reset map
            </button>
        </div>
        <div className="gov-bi-area-map__body">
            <div className="gov-bi-area-map__frame">
                {mapped.length ? <MapPreview key={activeKey} areas={mapped} shapes={shapes} activeKey={activeKey}
                    title={title} onSelect={setSelection}/> : <p>Boundary unavailable</p>}
            </div>
            <div className="gov-bi-area-map__summary" aria-live="polite">
                <h3>{title}</h3>
                {region?.districtLabel && <p>{region.districtLabel}</p>}
                {activeKey.startsWith('sector:') && <p>Mapped barangays in scope</p>}
                <dl>
                    <div><dt>Current orders</dt><dd>{formatCount.format(summary.current)}</dd></div>
                    <div><dt>Blocked</dt><dd>{formatCount.format(summary.blocked)}</dd></div>
                    <div><dt>For verification</dt><dd>{formatCount.format(summary.verification)}</dd></div>
                    {summary.without_barangay > 0 && <div><dt>Without a matched barangay</dt><dd>{formatCount.format(summary.without_barangay)}</dd></div>}
                </dl>
            </div>
        </div>
        <p className="gov-bi-area-map__note">
            {mapped.length < areas.length ? 'Some permitted areas are available only in the list.' : 'Select a boundary to zoom, or choose an area above.'}
        </p>
    </div>;
}
