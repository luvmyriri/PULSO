import React from 'react';

/**
 * TablePagination
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared, accessible pagination footer component for PULSO tables (Staff Members,
 * Resident Accounts, etc.).
 *
 * Requirements:
 * - Sits inside the table card with a thin top border, matching padding and height.
 * - Left side: Soft gray Inter 14px count text: "Showing X to Y of N [itemLabel]".
 * - Right side: "Previous", numbered page buttons with orange outline on active page, "Next".
 * - When total <= pageSize (<= 5 rows), page buttons are hidden and only count text shows.
 * - When total === 0, returns null (empty state component handles the message).
 * - Narrow phones (<640px): Displays "Previous", "Page X of Y", "Next" for compact 44px tap targets.
 * - Gaps (>7 pages): Shortens with ellipses [1, '...', curr-1, curr, curr+1, '...', last].
 * - WCAG 2.2 AA accessible: nav landmark, aria-current="page", aria-disabled, aria-live="polite".
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function TablePagination({
    page = 1,
    pageSize = 5,
    total = 0,
    itemLabel = 'records',
    onPageChange,
    className = '',
}) {
    if (total === 0) return null;

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const startItem = (safePage - 1) * pageSize + 1;
    const endItem = Math.min(safePage * pageSize, total);

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (safePage <= 4) {
            return [1, 2, 3, 4, 5, '...', totalPages];
        }
        if (safePage >= totalPages - 3) {
            return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
    };

    return (
        <div
            className={`min-h-14 shrink-0 border-t border-slate-200 dark:border-slate-800 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 ${className}`}
        >
            {/* Count text on the left in soft gray, Inter 14px */}
            <div aria-live="polite" className="font-normal text-slate-500 dark:text-slate-400 text-sm">
                Showing <span className="font-medium text-slate-700 dark:text-slate-200">{startItem}</span> to{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">{endItem}</span> of{' '}
                <span className="font-medium text-slate-700 dark:text-slate-200">{total}</span> {itemLabel}
            </div>

            {/* Pagination Controls on the right (hidden when total <= pageSize) */}
            {total > pageSize && (
                <nav
                    className="flex items-center gap-1.5"
                    aria-label={`${itemLabel} pagination`}
                >
                    {/* Previous Button */}
                    <button
                        type="button"
                        onClick={() => onPageChange && onPageChange(Math.max(1, safePage - 1))}
                        disabled={safePage <= 1}
                        aria-disabled={safePage <= 1 ? 'true' : 'false'}
                        className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600 dark:text-slate-300 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                        aria-label="Previous page"
                    >
                        Previous
                    </button>

                    {/* Narrow Mobile Indicator (<640px) */}
                    <span className="sm:hidden text-xs font-medium text-slate-500 dark:text-slate-400 px-2 select-none">
                        Page {safePage} of {totalPages}
                    </span>

                    {/* Page Numbers (640px+) */}
                    <div className="hidden sm:flex items-center gap-1">
                        {getPageNumbers().map((p, idx) => {
                            if (p === '...') {
                                return (
                                    <span
                                        key={`ellipsis-${idx}`}
                                        className="w-8 text-center text-slate-400 select-none font-bold"
                                        aria-hidden="true"
                                    >
                                        &hellip;
                                    </span>
                                );
                            }
                            const isActive = p === safePage;
                            return (
                                <button
                                    key={`page-${p}`}
                                    type="button"
                                    onClick={() => onPageChange && onPageChange(p)}
                                    aria-current={isActive ? 'page' : undefined}
                                    aria-label={`Go to page ${p}`}
                                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-xs rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                                        isActive
                                            ? 'bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] border-2 border-[#ff6b00] shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
                                    }`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                    </div>

                    {/* Next Button */}
                    <button
                        type="button"
                        onClick={() => onPageChange && onPageChange(Math.min(totalPages, safePage + 1))}
                        disabled={safePage >= totalPages}
                        aria-disabled={safePage >= totalPages ? 'true' : 'false'}
                        className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-slate-600 dark:text-slate-300 cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                        aria-label="Next page"
                    >
                        Next
                    </button>
                </nav>
            )}
        </div>
    );
}
