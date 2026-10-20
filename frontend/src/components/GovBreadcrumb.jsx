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
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-mono-data text-slate-400 select-none whitespace-nowrap min-w-0 flex-nowrap">
                {items.map((item, idx) => {
                    const isLast = idx === items.length - 1;
                    const isMiddle = idx > 0 && !isLast;
                    return (
                        <React.Fragment key={idx}>
                            {idx > 0 && <span className="text-slate-400/60 shrink-0">/</span>}
                            {item.to && !isLast ? (
                                <Link
                                    to={item.to}
                                    className={`hover:text-[#ff6b00] transition-colors shrink-0 ${isMiddle ? 'hidden sm:inline max-w-[140px] truncate' : ''}`}
                                    title={item.label}
                                >
                                    {item.label}
                                </Link>
                            ) : isLast ? (
                                <span
                                    aria-current="page"
                                    className="text-[#ff6b00] font-semibold shrink-0"
                                    title={item.label}
                                >
                                    {item.label}
                                </span>
                            ) : (
                                <span
                                    className={`text-slate-600 dark:text-slate-300 shrink-0 ${isMiddle ? 'hidden sm:inline max-w-[140px] truncate' : ''}`}
                                    title={item.label}
                                >
                                    {item.label}
                                </span>
                            )}
                            {isMiddle && (
                                <span className="sm:hidden text-slate-400 shrink-0" title={item.label}>
                                    ...
                                </span>
                            )}
                        </React.Fragment>
                    );
                })}
            </nav>
        );
    }

    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-mono-data text-slate-400 select-none whitespace-nowrap min-w-0 flex-nowrap">
            <Link to="/gov/dashboard" className="hover:text-[#ff6b00] transition-colors shrink-0" title="Home">
                Home
            </Link>
            <span className="text-slate-400/60 shrink-0">/</span>
            {categoryLink ? (
                <>
                    <Link
                        to={categoryLink}
                        className="hidden sm:inline text-slate-600 dark:text-slate-300 hover:text-[#ff6b00] transition-colors shrink-0 max-w-[140px] truncate"
                        title={category}
                    >
                        {category}
                    </Link>
                    <span className="sm:hidden text-slate-400 shrink-0" title={category}>
                        ...
                    </span>
                </>
            ) : (
                <>
                    <span
                        className="hidden sm:inline text-slate-600 dark:text-slate-300 shrink-0 max-w-[140px] truncate"
                        title={category}
                    >
                        {category}
                    </span>
                    <span className="sm:hidden text-slate-400 shrink-0" title={category}>
                        ...
                    </span>
                </>
            )}
            <span className="text-slate-400/60 shrink-0">/</span>
            <span
                aria-current="page"
                className="text-[#ff6b00] font-semibold shrink-0"
                title={current}
            >
                {current}
            </span>
        </nav>
    );
}
