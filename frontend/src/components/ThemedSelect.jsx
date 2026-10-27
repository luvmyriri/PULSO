import React, { useState, useEffect, useRef, useMemo, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * ThemedSelect.jsx
 * Accessible, responsive themed dropdown component for PULSO.
 *
 * Consistent bottom panel (bottom sheet) architecture across all viewports:
 * - Desktop & Tablets: Centered at bottom, max-width 480px.
 * - Mobile Phones: Full width (100%), rounded-t-[20px].
 * - Plain dim backdrop (bg-black/40, NO blur).
 * - Drag handle, 16px bold header title, 44px close button.
 * - Search filter for long lists (>8 items, e.g. Barangay), ignoring accents/case/spaces.
 * - Min 48px option rows, 16px text, orange selection badge, check icon, 120ms feedback delay.
 * - Background body scroll lock, touch swipe-down dismiss, full keyboard accessibility.
 * - Preserves hidden native <select> for form submission, autofill, and fallback.
 */
export default function ThemedSelect({
    label,
    name,
    value,
    onChange,
    options = [],
    placeholder = 'Select…',
    searchable,
    required = false,
    disabled = false,
    error = false,
    helperText = '',
    className = '',
    id
}) {
    const generatedId = useId();
    const selectId = id || generatedId;
    const triggerRef = useRef(null);
    const searchInputRef = useRef(null);
    const listboxRef = useRef(null);
    const panelRef = useRef(null);
    const touchStartYRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const [pendingValue, setPendingValue] = useState(null);

    // Normalize options into { value, label }
    const normalizedOptions = useMemo(() => {
        return (options || []).map(opt => {
            if (typeof opt === 'object' && opt !== null) {
                return {
                    value: String(opt.value ?? ''),
                    label: String(opt.label ?? opt.value ?? '')
                };
            }
            return {
                value: String(opt ?? ''),
                label: String(opt ?? '')
            };
        });
    }, [options]);

    // Show search if explicitly requested or if option list has more than 8 items (e.g. Barangay)
    const shouldShowSearch = searchable !== undefined ? searchable : normalizedOptions.length > 8;

    // Filter options by search query (case-insensitive, space-insensitive, accent-insensitive)
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return normalizedOptions;
        const normalizeStr = (str) =>
            str.toLowerCase()
               .normalize('NFD')
               .replace(/[\u0300-\u036f]/g, '')
               .replace(/\s+/g, '');

        const q = normalizeStr(searchQuery);
        return normalizedOptions.filter(opt => {
            const labelNorm = normalizeStr(opt.label);
            const valueNorm = normalizeStr(opt.value);
            return labelNorm.includes(q) || valueNorm.includes(q);
        });
    }, [normalizedOptions, searchQuery]);

    // Currently selected option object
    const selectedOption = useMemo(() => {
        return normalizedOptions.find(opt => opt.value === String(value));
    }, [normalizedOptions, value]);

    // Body scroll locking while bottom sheet is open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    // Focus management and reset on open/close
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setPendingValue(null);
            const currentIdx = filteredOptions.findIndex(o => o.value === String(value));
            setActiveIndex(currentIdx >= 0 ? currentIdx : 0);

            // Give the panel a moment to mount before focusing search or selected item
            const timer = setTimeout(() => {
                if (shouldShowSearch && searchInputRef.current) {
                    searchInputRef.current.focus();
                } else if (listboxRef.current) {
                    const selectedElem = listboxRef.current.querySelector('[aria-selected="true"]');
                    if (selectedElem) {
                        selectedElem.scrollIntoView({ block: 'center' });
                    }
                }
            }, 60);
            return () => clearTimeout(timer);
        } else {
            setSearchQuery('');
            setActiveIndex(-1);
            setPendingValue(null);
        }
    }, [isOpen]);

    // Scroll active item into view when navigating via keyboard
    useEffect(() => {
        if (isOpen && activeIndex >= 0 && listboxRef.current) {
            const items = listboxRef.current.querySelectorAll('[role="option"]');
            if (items[activeIndex]) {
                items[activeIndex].scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex, isOpen]);

    // Close panel safely and return focus to trigger button
    const closePanel = useCallback(() => {
        setIsOpen(false);
        triggerRef.current?.focus();
    }, []);

    // Handle option selection with 120ms feedback delay
    const handleSelect = (val) => {
        setPendingValue(val);
        setTimeout(() => {
            if (onChange) {
                onChange({
                    target: {
                        name,
                        value: val,
                        type: 'select-one'
                    }
                });
            }
            closePanel();
        }, 120);
    };

    // Global Escape key listener & back gesture/button
    useEffect(() => {
        if (!isOpen) return;
        const handleGlobalKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closePanel();
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isOpen, closePanel]);

    // Touch swipe down handlers on the bottom sheet
    const handleTouchStart = (e) => {
        touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
        if (touchStartYRef.current === null) return;
        const currentY = e.touches[0].clientY;
        const diffY = currentY - touchStartYRef.current;
        // If swiping down more than 75px while at top of list, dismiss
        if (diffY > 75 && listboxRef.current && listboxRef.current.scrollTop <= 0) {
            touchStartYRef.current = null;
            closePanel();
        }
    };

    const handleTouchEnd = () => {
        touchStartYRef.current = null;
    };

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (disabled) return;

        if (!isOpen) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
                break;
            case 'Home':
                e.preventDefault();
                setActiveIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setActiveIndex(filteredOptions.length - 1);
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions[activeIndex]) {
                    handleSelect(filteredOptions[activeIndex].value);
                }
                break;
            case 'Escape':
                e.preventDefault();
                closePanel();
                break;
            default:
                break;
        }
    };

    return (
        <div className={`relative flex flex-col ${className}`}>
            {/* Field Label */}
            {label && (
                <label
                    htmlFor={selectId}
                    className="text-sm font-bold text-black dark:text-white mb-2 block truncate"
                >
                    {label}
                    {required && (
                        <>
                            <span className="text-red-500 font-bold ml-1" aria-hidden="true">*</span>
                            <span className="sr-only"> (required)</span>
                        </>
                    )}
                </label>
            )}

            {/* Hidden native select for autofill, form submission & fallback */}
            <select
                id={selectId}
                name={name}
                value={value ?? ''}
                onChange={onChange}
                required={required}
                disabled={disabled}
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only pointer-events-none"
            >
                <option value="">{placeholder}</option>
                {normalizedOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>

            {/* Custom Themed Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={`listbox-${selectId}`}
                aria-label={label ? `${label}, ${selectedOption?.label || placeholder}` : placeholder}
                aria-invalid={Boolean(error)}
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(prev => !prev)}
                onKeyDown={handleKeyDown}
                className={`w-full min-h-[50px] h-[52px] rounded-[14px] px-4 bg-white dark:bg-slate-800/80 border text-base text-left flex items-center justify-between transition-colors outline-none cursor-pointer ${
                    error
                        ? 'border-red-500 ring-1 ring-red-500'
                        : isOpen
                        ? 'border-[#ff6b00] ring-2 ring-orange-500'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:ring-2 focus:ring-orange-500'
                } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : ''}`}
            >
                <span className={`truncate mr-2 ${selectedOption ? 'text-black dark:text-white font-medium' : 'text-black/60 dark:text-white/60 italic'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={18}
                    className={`shrink-0 text-black dark:text-white transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#ff6b00]' : ''}`}
                    aria-hidden="true"
                />
            </button>

            {/* Helper or Error message */}
            {helperText && (
                <p className={`text-xs mt-1 ${error ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                    {helperText}
                </p>
            )}

            {/* Unified Bottom Sheet Panel (Desktop, Tablet & Mobile) */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div id={`select-portal-${selectId}`} className="fixed inset-0 z-[9999] flex flex-col justify-end items-center">
                            {/* Plain Dim Backdrop (max 40% dark, strictly NO blur) */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={closePanel}
                                className="fixed inset-0 bg-black/40"
                                aria-hidden="true"
                            />

                            {/* Bottom Sheet Container */}
                            <motion.div
                                ref={panelRef}
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                role="dialog"
                                aria-modal="true"
                                aria-label={label || placeholder}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onClick={(e) => e.stopPropagation()}
                                className="relative z-10 w-full sm:max-w-[480px] bg-white dark:bg-slate-900 rounded-t-[20px] max-h-[70vh] landscape:max-h-[88vh] flex flex-col shadow-2xl border-t border-slate-200 dark:border-slate-800 pb-safe"
                            >
                                {/* Small Drag Handle in Middle at Top */}
                                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 shrink-0" />

                                {/* Header Row: Title (16px bold) + Close Button (44px) */}
                                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                                    <h3 className="text-base font-bold text-black dark:text-white truncate">
                                        {label || placeholder}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={closePanel}
                                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        aria-label="Close dialog"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Search Box (for lists of more than 8 options, e.g. Barangay) */}
                                {shouldShowSearch && (
                                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                                        <div className="relative">
                                            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Type name or number to search…"
                                                className="w-full min-h-[46px] pl-10 pr-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-base text-black dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-black dark:hover:text-white"
                                                    aria-label="Clear search"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Options List */}
                                <div
                                    ref={listboxRef}
                                    role="listbox"
                                    id={`listbox-${selectId}`}
                                    className="overflow-y-auto px-3 py-2 space-y-0.5 max-h-[60vh] overscroll-contain"
                                >
                                    {filteredOptions.length === 0 ? (
                                        <div className="py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            No results found for "{searchQuery}".
                                        </div>
                                    ) : (
                                        filteredOptions.map((opt, idx) => {
                                            const isCurrentlySelected = opt.value === String(value);
                                            const isSelected = pendingValue !== null
                                                ? opt.value === String(pendingValue)
                                                : isCurrentlySelected;
                                            const isActive = idx === activeIndex;

                                            return (
                                                <div
                                                    key={opt.value || `empty-${idx}`}
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    onClick={() => handleSelect(opt.value)}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    className={`min-h-[48px] px-4 py-3 rounded-xl flex items-center justify-between text-base cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 ${
                                                        isSelected
                                                            ? 'bg-orange-50/80 dark:bg-orange-950/30 text-[#ff6b00] font-semibold border-orange-200/80 dark:border-orange-900/60'
                                                            : isActive
                                                            ? 'bg-slate-100/80 dark:bg-slate-800 text-black dark:text-white font-medium'
                                                            : 'text-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 font-medium active:bg-slate-100 dark:active:bg-slate-800'
                                                    }`}
                                                >
                                                    <span className="truncate pr-2 text-left break-words flex-1">
                                                        {opt.label}
                                                    </span>
                                                    {isSelected && (
                                                        <Check size={18} className="text-[#ff6b00] shrink-0 ml-2" strokeWidth={2.5} />
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
