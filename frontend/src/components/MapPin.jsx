import React, { useState } from 'react';
import { API_BASE_URL } from '../utils/apiBase';
import { getCategoryIconComponent, getFriendlyStatusName } from './ReportPopup';

/**
 * MapPin Component
 * 
 * Selected pin: 3.5rem (56px) round photo with a 3px ring in the existing orange token
 * and a 2px ring in the card color outside it, so it stands out on any map color.
 * If the report has no approved photo or image failed, shows a navy circle with category icon.
 * 
 * Accessible button with descriptive aria-label.
 */
export default function MapPin({
    report,
    isSelected = false,
    isDark = false,
    categoryColor,
    onClick,
    innerRef,
    reportLocation
}) {
    const [imgFailed, setImgFailed] = useState(false);

    if (!report) return null;

    const getCategoryColorFallback = (rep) => {
        const cat = (rep?.category || rep?.raw_category || rep?.title || '').toLowerCase();
        if (cat.includes('flood') || cat.includes('drain')) return '#06B6D4'; // Drainage
        if (cat.includes('light') || cat.includes('lamp') || cat.includes('streetlight')) return '#F59E0B'; // Lighting
        if (cat.includes('water') || cat.includes('tubig') || cat.includes('pipe')) return '#0EA5E9'; // Water
        if (cat.includes('safety') || cat.includes('hazard') || cat.includes('danger')) return '#F43F5E'; // Safety
        if (cat.includes('traffic') || cat.includes('sign') || cat.includes('signal')) return '#A855F7'; // Traffic
        if (cat.includes('building') || cat.includes('facilit') || cat.includes('hall')) return '#6366F1'; // Buildings
        if (cat.includes('electric') || cat.includes('wire') || cat.includes('kuryente')) return '#EAB308'; // Electrical
        if (cat.includes('waste') || cat.includes('garbage') || cat.includes('basura')) return '#10B981'; // Waste
        return '#EA580C'; // Roads
    };

    const categoryPinColor = categoryColor || getCategoryColorFallback(report);

    const rawImg = (
        report.photo_url ||
        report.image_url ||
        report.image ||
        report.photo_thumbnail ||
        report.media_url ||
        (Array.isArray(report.photos) ? report.photos[0] : null) ||
        (Array.isArray(report.media_urls) ? report.media_urls[0] : null)
    );
    let photoUrl = null;
    if (rawImg && !imgFailed) {
        photoUrl = rawImg.startsWith('http') || rawImg.startsWith('data:')
            ? rawImg
            : `${API_BASE_URL}${rawImg.startsWith('/') ? rawImg : `/${rawImg}`}`;
    }
    const pinColor = categoryPinColor;

    const categoryName = report.category || report.raw_category || report.report_type || report.title || 'Civic Infrastructure';
    const CategoryIcon = getCategoryIconComponent(categoryName, report.raw_category);
    const ticketId = report.ticket_id || `#PUL-${report.id}`;
    const statusObj = getFriendlyStatusName(report.status);
    const hasLocation = Boolean(reportLocation?.lat && reportLocation?.lng);
    const distanceStr = hasLocation ? (report.formattedDistance || report.dynamicDistance || report.distance) : null;

    const ariaLabel = `${categoryName}, ${ticketId}, ${statusObj.name}${distanceStr ? `, ${distanceStr.replace(/\s*away\s*/i, '')} away` : ''}`;

    const cardBgColor = isDark ? '#0c1427' : '#ffffff';

    return (
        <button
            ref={innerRef}
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            title={ariaLabel}
            tabIndex={0}
            className={`group relative w-14 h-14 rounded-full flex items-center justify-center select-none cursor-pointer transition-transform duration-200 focus-visible:outline-3 focus-visible:outline-offset-6 ${
                isSelected ? 'scale-105 z-50' : 'hover:scale-105 z-30'
            }`}
            style={{
                outlineColor: pinColor,
                boxShadow: isSelected
                    ? `0 0 0 3.5px ${pinColor}, 0 0 0 5.5px ${cardBgColor}, 0 10px 25px rgba(0,0,0,0.4)`
                    : `0 0 0 2.5px ${pinColor}, 0 0 0 4.5px ${cardBgColor}, 0 6px 18px rgba(0,0,0,0.3)`
            }}
        >
            {photoUrl ? (
                <img
                    src={photoUrl}
                    alt=""
                    aria-hidden="true"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover rounded-full"
                />
            ) : (
                <div
                    aria-hidden="true"
                    className="w-full h-full rounded-full flex items-center justify-center bg-[#0c1427] dark:bg-[#0c1427] text-white"
                >
                    <CategoryIcon size={24} style={{ color: pinColor }} />
                </div>
            )}
        </button>
    );
}
