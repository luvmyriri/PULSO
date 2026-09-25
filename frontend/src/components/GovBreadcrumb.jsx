import React from 'react';
import { Link } from 'react-router-dom';

/**
 * GovBreadcrumb
 * Standard breadcrumb trail for all government workspace headers.
 * Signature: Home / Category / Current Page
 */
export default function GovBreadcrumb({ category = 'Operations', current, categoryLink, items }) {
    if (items && items.length > 0) {
        return (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-mono-data text-slate-400 select-none">
                {items.map((item, idx) => {
                    const isLast = idx === items.length - 1;
                    return (
                        <React.Fragment key={idx}>
                            {idx > 0 && <span className="text-slate-400/60">/</span>}
                            {item.to && !isLast ? (
                                <Link to={item.to} className="hover:text-[#ff6b00] transition-colors">
                                    {item.label}
                                </Link>
                            ) : isLast ? (
                                <span className="text-[#ff6b00] font-semibold truncate max-w-[240px] sm:max-w-none">
                                    {item.label}
                                </span>
                            ) : (
                                <span className="text-slate-600 dark:text-slate-300">
                                    {item.label}
                                </span>
                            )}
                        </React.Fragment>
                    );
                })}
            </nav>
        );
    }

    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-mono-data text-slate-400 select-none">
            <Link to="/gov/dashboard" className="hover:text-[#ff6b00] transition-colors">
                Home
            </Link>
            <span className="text-slate-400/60">/</span>
            {categoryLink ? (
                <Link to={categoryLink} className="text-slate-600 dark:text-slate-300 hover:text-[#ff6b00] transition-colors">
                    {category}
                </Link>
            ) : (
                <span className="text-slate-600 dark:text-slate-300">
                    {category}
                </span>
            )}
            <span className="text-slate-400/60">/</span>
            <span className="text-[#ff6b00] font-semibold truncate max-w-[240px] sm:max-w-none">
                {current}
            </span>
        </nav>
    );
}
