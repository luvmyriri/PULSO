import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

/**
 * SearchInput
 * ─────────────────────────────────────────────────────────────────────────────
 * Single unified search component for the entire PULSO Government side.
 * 
 * Strict specifications:
 *   - Pill shape, fully rounded corners (rounded-full), 1px subtle border
 *   - 40px desktop height, 44px on touch screens
 *   - 14px horizontal padding, 10px icon-to-text gap
 *   - Exactly 13px (0.8125rem) font size for both typed text and placeholder
 *   - >= 4.5:1 contrast for placeholder against light/dark surfaces
 *   - Magnifier icon (16px) on left (replaces with spinner when isLoading=true)
 *   - Clear (X) button on right when text is present
 *   - "/" desktop shortcut hint badge and global keydown listener to focus
 *   - Escape key clears query
 *   - semantic role="search", type="search", autocomplete="off"
 * ─────────────────────────────────────────────────────────────────────────────
 */
const SearchInput = React.forwardRef(function SearchInput({
    value = '',
    onChange,
    placeholder = 'Search...',
    ariaLabel,
    onClear,
    isLoading = false,
    className = '',
    id,
    disabled = false,
    autoFocus = false,
    debounceMs = 0,
}, forwardedRef) {
    const internalRef = useRef(null);
    const inputRef = forwardedRef || internalRef;
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const debounceTimerRef = useRef(null);

    // Sync external value
    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    // Handle input change with optional debounce
    const handleInputChange = (e) => {
        const nextVal = typeof e === 'string' ? e : e?.target?.value ?? '';
        setLocalValue(nextVal);

        if (debounceMs > 0) {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                if (onChange) onChange(nextVal);
            }, debounceMs);
        } else {
            if (onChange) onChange(nextVal);
        }
    };

    // Clear search handler
    const handleClear = useCallback(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        setLocalValue('');
        if (onClear) {
            onClear();
        } else if (onChange) {
            onChange('');
        }
        inputRef.current?.focus();
    }, [onChange, onClear]);

    // Keyboard handlers: Escape clears search; "/" globally focuses
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            if (localValue) {
                e.preventDefault();
                handleClear();
            } else {
                inputRef.current?.blur();
            }
        }
    };

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Check if user pressed "/" outside of any form control or editable element
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const activeTag = document.activeElement?.tagName?.toLowerCase();
                const isEditable = document.activeElement?.isContentEditable;
                if (activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select' && !isEditable) {
                    e.preventDefault();
                    inputRef.current?.focus();
                    inputRef.current?.select();
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    const accessibleLabel = ariaLabel || placeholder;

    return (
        <div
            role="search"
            className={`gov-search-wrapper ${className}`}
        >
            {/* Search Icon / Loading Spinner */}
            <span className="gov-search-icon" aria-hidden="true">
                {isLoading ? (
                    <Loader2 size={16} className="animate-spin text-[#ff6b00]" />
                ) : (
                    <Search size={16} />
                )}
            </span>

            {/* Accessible Native Search Input */}
            <input
                ref={inputRef}
                id={id}
                type="search"
                value={localValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                aria-label={accessibleLabel}
                title={accessibleLabel}
                disabled={disabled}
                autoFocus={autoFocus}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="gov-search-input"
            />

            {/* Clear (X) Button */}
            {localValue ? (
                <button
                    type="button"
                    onClick={handleClear}
                    className="gov-search-clear-btn"
                    aria-label="Clear search query"
                    title="Clear search query (Esc)"
                    tabIndex={0}
                >
                    <X size={13} strokeWidth={2.5} />
                </button>
            ) : (
                /* Desktop "/" Shortcut Hint Badge (Hidden on touch / narrow viewports) */
                <kbd className="gov-search-kbd" title="Press / to search">
                    /
                </kbd>
            )}
        </div>
    );
});

export default SearchInput;

/**
 * SearchEmptyState
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared empty state shown across government tables and lists when search has no matches.
 */
export function SearchEmptyState({ query, onClear, message = null }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
                <Search size={20} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                No results for &ldquo;{query}&rdquo;
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
                {message || "Check your spelling or try searching with different keywords."}
            </p>
            {onClear && (
                <button
                    type="button"
                    onClick={onClear}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#ff6b00] hover:border-[#ff6b00]/40 transition-colors cursor-pointer"
                >
                    Clear search
                </button>
            )}
        </div>
    );
}
