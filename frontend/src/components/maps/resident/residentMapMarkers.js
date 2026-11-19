import { getReportCategoryMeta } from './residentMapCategories';

// System Pin Design: SVG pin with embedded category icon and exact anchor
function getMarkerSVG(categoryOrReport, status, isSelected = false) {
    const obj = typeof categoryOrReport === 'object' && categoryOrReport !== null
        ? categoryOrReport
        : { category: categoryOrReport };
    const meta = getReportCategoryMeta(obj);
    const color = meta.color || '#EA580C';

    let svgIcon = '';
    switch (meta.id) {
        case 'drainage':
            svgIcon = `<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>`;
            break;
        case 'water':
            svgIcon = `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>`;
            break;
        case 'streetlights':
            svgIcon = `<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4.5 12.4c.9.8 1.5 2 1.5 3.1h6c0-1.1.6-2.3 1.5-3.1A7 7 0 0 0 12 2z" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>`;
            break;
        case 'electrical':
            svgIcon = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>`;
            break;
        case 'waste':
            svgIcon = `<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
            break;
        case 'traffic':
            svgIcon = `<path d="M12 3v3M18.5 6H5.5a1.5 1.5 0 0 0-1.5 1.5v3A1.5 1.5 0 0 0 5.5 12H18.5l3.5-3-3.5-3zM12 12v9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
            break;
        case 'facilities':
            svgIcon = `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2ZM18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2ZM10 6h4M10 10h4M10 14h4M10 18h4" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>`;
            break;
        case 'safety':
            svgIcon = `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
            break;
        case 'roads':
        default:
            svgIcon = `<path d="M4 19L9 5M20 19L15 5M12 7V9M12 13V15M12 19V21" stroke="white" stroke-width="2.3" stroke-linecap="round" fill="none"/>`;
            break;
    }

    const strokeColor = '#ffffff';
    const strokeWidth = isSelected ? '3.5' : '2.5';
    const scale = isSelected ? '1.18' : '1.0';

    const svgString = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 46" width="40" height="46">
            <g transform="scale(${scale})" transform-origin="20 23">
                <path d="M20 44c0 0 16-15.5 16-24a16 16 0 0 0-32 0c0 8.5 16 24 16 24z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" filter="drop-shadow(0px 3px 2px rgba(0,0,0,0.3))" />
                <circle cx="20" cy="18" r="11" fill="rgba(0,0,0,0.22)"/>
                <g transform="translate(10, 8) scale(0.8)">
                    ${svgIcon}
                </g>
            </g>
        </svg>
    `.trim().replace(/\n/g, '').replace(/\s+/g, ' ');

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
}

export { getMarkerSVG };
