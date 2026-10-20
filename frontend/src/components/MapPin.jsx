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
    onClick,
    innerRef,
    reportLocation
}) {
    const [imgFailed, setImgFailed] = useState(false);

    if (!report) return null;

    const rawImg = report.photo_url || report.photo_thumbnail || report.image_url || report.media_url || report.image;
    let photoUrl = null;
    if (rawImg && !imgFailed) {
        photoUrl = rawImg.startsWith('http') || rawImg.startsWith('data:')
            ? rawImg
            : `${API_BASE_URL}${rawImg.startsWith('/') ? rawImg : `/${rawImg}`}`;
    }

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
            className={`group relative w-14 h-14 rounded-full flex items-center justify-center select-none cursor-pointer transition-transform duration-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#ff6b00] ${
                isSelected ? 'scale-105 z-50' : 'hover:scale-105 z-30'
            }`}
            style={{
                boxShadow: isSelected
                    ? `0 0 0 3px #ff6b00, 0 0 0 5px ${cardBgColor}, 0 10px 25px rgba(0,0,0,0.4)`
                    : `0 0 0 2.5px #ff6b00, 0 0 0 4px ${cardBgColor}, 0 6px 18px rgba(0,0,0,0.3)`
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
                    <CategoryIcon size={24} className="text-[#ff6b00]" />
                </div>
            )}
        </button>
    );
}
