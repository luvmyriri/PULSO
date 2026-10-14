import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, ChevronDown } from '../icons';
import UserAvatar from './UserAvatar';

/**
 * Friendly formatter for government roles:
 * Converts raw codes like "SYSTEM_ADMIN" or "admin_officer" into clean title text like "System Admin".
 */
export const formatRoleLabel = (role) => {
    if (!role) return 'Staff Member';
    const map = {
        system_admin: 'System Admin',
        admin_officer: 'Administrative Officer',
        admin_clerk: 'Administrative Clerk',
        city_engineer: 'City Engineer',
        asst_city_engineer: 'Assistant City Engineer',
        division_chief: 'Division Chief',
        division_chief_arch: 'Division Chief (Architectural)',
        division_chief_structural: 'Division Chief (Structural)',
        division_chief_electrical: 'Division Chief (Electrical)',
        project_engineer: 'Project Engineer',
        design_engineer: 'Design Engineer',
        estimator: 'Estimator',
        cad_operator: 'CAD Operator',
        construction_foreman: 'Construction Foreman',
        field_worker: 'Field Worker',
        building_inspector: 'Building Inspector',
        electrical_inspector: 'Electrical Inspector',
        mechanical_inspector: 'Mechanical Inspector',
        dispatcher: 'Dispatcher',
        records_officer: 'Records Officer',
        manager: 'Manager',
    };
    const key = String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (map[key]) return map[key];
    return String(role).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

/**
 * Shared UserMenu dropdown for PULSO:
 * Used across both Resident and Government experiences with identical layout,
 * dark-surface styling, avatar snapshot card, keyboard navigation, and hover resilience.
 */
export default function UserMenu({
    name = '',
    avatarUrl = null,
    avatarUpdatedAt = null,
    fallbackInitial = null,
    subtitle = '',
    items = [],
    showTriggerName = false,
    showConfirmation = true,
    align = 'right',
    triggerClassName = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);
    const [pendingSignOutItem, setPendingSignOutItem] = useState(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const itemRefs = useRef([]);

    const openTimerRef = useRef(null);
    const closeTimerRef = useRef(null);

    const location = useLocation();

    const initials = fallbackInitial || getInitials(name);
    const hasPhoto = Boolean(avatarUrl);

    // Auto-close on route transitions
    useEffect(() => {
        setIsOpen(false);
        setIsConfirmingSignOut(false);
    }, [location.pathname]);

    // Clear timers on unmount
    useEffect(() => {
        return () => {
            if (openTimerRef.current) clearTimeout(openTimerRef.current);
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Handle mouse enter with 100ms open delay
    const handleMouseEnter = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        openTimerRef.current = setTimeout(() => {
            setIsOpen(true);
        }, 100);
    };

    // Handle mouse leave with 180ms close delay
    const handleMouseLeave = () => {
        if (openTimerRef.current) {
            clearTimeout(openTimerRef.current);
            openTimerRef.current = null;
        }
        closeTimerRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 180);
    };

    // Toggle on explicit click/tap
    const handleTriggerClick = () => {
        if (openTimerRef.current) clearTimeout(openTimerRef.current);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setIsOpen((prev) => !prev);
    };

    // Filter interactive items (excluding dividers) for keyboard navigation
    const actionableItems = items.filter((item) => !item.divider);

    // Keyboard navigation
    const handleTriggerKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setIsOpen(true);
            setFocusedIndex(0);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleMenuKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            triggerRef.current?.focus();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex((prev) => (prev + 1) % actionableItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex((prev) => (prev - 1 + actionableItems.length) % actionableItems.length);
        } else if (e.key === 'Tab') {
            setIsOpen(false);
        }
    };

    // Keep focus in sync with focusedIndex
    useEffect(() => {
        if (isOpen && focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex]?.focus();
        }
    }, [isOpen, focusedIndex]);

    const handleItemClick = (item) => {
        if (item.danger || item.isSignOut) {
            if (showConfirmation) {
                setPendingSignOutItem(item);
                setIsConfirmingSignOut(true);
                setIsOpen(false);
                return;
            }
        }
        setIsOpen(false);
        if (item.onClick) item.onClick();
    };

    const confirmSignOut = () => {
        setIsConfirmingSignOut(false);
        if (pendingSignOutItem?.onClick) {
            pendingSignOutItem.onClick();
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative shrink-0"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* User Avatar Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={handleTriggerClick}
                onKeyDown={handleTriggerKeyDown}
                className={
                    showTriggerName
                        ? `min-h-[40px] flex items-center gap-2 pl-2 pr-1 border-l border-slate-200 dark:border-slate-800 transition-all duration-150 cursor-pointer group text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                              isOpen ? 'opacity-100' : 'hover:opacity-90'
                          } ${triggerClassName}`
                        : `${triggerClassName || 'w-8 h-8 sm:w-9 sm:h-9'} rounded-full flex items-center justify-center text-white shadow-xs shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer overflow-hidden p-0 border ${
                              hasPhoto
                                  ? 'border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800'
                                  : 'border-orange-500/20 bg-gradient-to-br from-orange-400 to-orange-600 font-bold text-[11px] sm:text-sm'
                          }`
                }
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={`User menu for ${name} (${subtitle})`}
                title={`${name} — ${subtitle}`}
            >
                <div
                    className={
                        showTriggerName
                            ? `w-7 h-7 xs:w-8 xs:h-8 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs overflow-hidden border ${
                                  hasPhoto
                                      ? 'border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800'
                                      : 'border-orange-500/20 bg-gradient-to-br from-orange-400 to-orange-600 font-bold text-xs text-white'
                              }`
                            : `w-full h-full rounded-full flex items-center justify-center overflow-hidden ${
                                  hasPhoto
                                      ? 'bg-slate-100 dark:bg-slate-800'
                                      : 'bg-gradient-to-br from-orange-400 to-orange-600 font-bold text-xs sm:text-sm text-white'
                              }`
                    }
                >
                    <UserAvatar
                        avatarUrl={avatarUrl}
                        updatedAt={avatarUpdatedAt}
                        fallbackInitial={initials}
                        alt={name || 'User'}
                    />
                </div>

                {showTriggerName && (
                    <>
                        <div className="hidden xl:flex flex-col text-left leading-tight min-w-0">
                            <span
                                className="font-heading font-bold text-xs text-slate-800 dark:text-white group-hover:text-[#ff6b00] transition-colors truncate max-w-[140px] 2xl:max-w-[200px]"
                                title={name}
                            >
                                {name}
                            </span>
                            <span
                                className="text-[10px] font-mono-data text-slate-400 truncate max-w-[140px] 2xl:max-w-[200px]"
                                title={subtitle}
                            >
                                {subtitle}
                            </span>
                        </div>
                        <ChevronDown
                            size={13}
                            className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 shrink-0 hidden sm:block ${
                                isOpen ? 'rotate-180 text-[#ff6b00]' : ''
                            }`}
                        />
                    </>
                )}
            </button>

            {/* Dropdown Menu Panel (Unified Resident Design) */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={menuRef}
                        role="menu"
                        aria-label="User navigation"
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.14 }}
                        onKeyDown={handleMenuKeyDown}
                        className={`absolute top-full mt-1.5 ${
                            align === 'right' ? 'right-0' : 'left-0'
                        } w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-2 z-[100] text-slate-900 dark:text-white ring-1 ring-black/5 select-none`}
                    >
                        {/* Profile Snapshot Card */}
                        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 mb-1 border border-slate-100 dark:border-slate-800/80">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs overflow-hidden border ${
                                hasPhoto
                                    ? 'border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800'
                                    : 'border-orange-500/20 bg-gradient-to-br from-orange-400 to-orange-600 font-bold text-xs'
                            }`}>
                                <UserAvatar
                                    avatarUrl={avatarUrl}
                                    updatedAt={avatarUpdatedAt}
                                    fallbackInitial={initials}
                                    alt={name || 'User'}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p
                                    className="text-xs font-bold text-slate-900 dark:text-white break-words leading-snug line-clamp-2"
                                    title={name}
                                >
                                    {name}
                                </p>
                                <p
                                    className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5"
                                    title={subtitle}
                                >
                                    {subtitle}
                                </p>
                            </div>
                        </div>

                        {/* Menu Item Actions */}
                        <div className="space-y-0.5">
                            {items.map((item, idx) => {
                                if (item.divider) {
                                    return (
                                        <div
                                            key={`divider-${idx}`}
                                            className="my-1 border-t border-slate-100 dark:border-slate-800"
                                            role="separator"
                                        />
                                    );
                                }

                                const actionableIdx = actionableItems.findIndex((ai) => ai.id === item.id);
                                const isDanger = item.danger || item.isSignOut;
                                const IconComponent = item.icon || (isDanger ? LogOut : User);

                                return (
                                    <button
                                        key={item.id || `item-${idx}`}
                                        ref={(el) => (itemRefs.current[actionableIdx] = el)}
                                        type="button"
                                        role="menuitem"
                                        tabIndex={-1}
                                        onClick={() => handleItemClick(item)}
                                        className={
                                            isDanger
                                                ? 'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer group focus:outline-none focus:bg-red-50 dark:focus:bg-red-950/30'
                                                : 'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left cursor-pointer focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-800'
                                        }
                                        title={item.label}
                                    >
                                        <IconComponent
                                            size={15}
                                            className={
                                                isDanger
                                                    ? 'text-red-500 dark:text-red-400 shrink-0 group-hover:translate-x-0.5 transition-transform'
                                                    : 'text-slate-400 dark:text-slate-500 shrink-0'
                                            }
                                        />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sign Out Confirmation Modal */}
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {isConfirmingSignOut && (
                            <div
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
                                onClick={() => setIsConfirmingSignOut(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    role="alertdialog"
                                    aria-modal="true"
                                    aria-labelledby="logout-confirm-title"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center select-none"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
                                        <LogOut size={22} />
                                    </div>
                                    <div>
                                        <h3
                                            id="logout-confirm-title"
                                            className="text-base font-bold text-slate-900 dark:text-white"
                                        >
                                            Are you sure you want to sign out?
                                        </h3>
                                    </div>
                                    <div className="flex gap-2.5 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsConfirmingSignOut(false)}
                                            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[44px]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={confirmSignOut}
                                            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-sm shadow-red-500/20 min-h-[44px]"
                                        >
                                            Sign Out
                                        </button>
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
