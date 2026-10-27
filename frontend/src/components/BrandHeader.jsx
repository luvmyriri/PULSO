import React, { useRef, useEffect } from 'react';
import { Search, Bell, X } from 'lucide-react';
import Branding from './Branding';
import UserMenu from './UserMenu';
import NotificationDropdown from './NotificationDropdown';
import ThemeToggle from './ThemeToggle';

/**
 * BrandHeader Component
 * ─────────────────────────────────────────────────────────────────────────────
 * PULSO Mobile App / Resident Brand Header (used on Reports, Updates, Account,
 * Settings, and all non-Home resident screens).
 *
 * Structure (< 768px):
 * - Left block: Municipal seal (2.5rem / 40px)
 * - Two lines beside it:
 *   - Small "CALOOCAN ENGINEERING" (11px, soft gray)
 *   - Bold page title (18px bold, white in dark / navy in light)
 * - Right side: Completely empty (no search, no bell, no avatar).
 *   Full width prevents title from wrapping awkwardly at 320px.
 * - Min-height matches HomeHeader's Row 1 (48px) for stable tab switching.
 *
 * Desktop (≥ 768px):
 * Standard municipal top bar with seal, centered search, bell, and avatar.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function BrandHeader({
    activeTab,
    screenTitle = 'PULSO',
    user,
    unreadCount = 0,
    searchQuery = '',
    setSearchQuery,
    isSearchOpen = false,
    setIsSearchOpen,
    renderSearchDropdown,
    notifications = [],
    showNotifications = false,
    setShowNotifications,
    onNotificationClick,
    onMarkAllRead,
    loadingNotifications = false,
    notificationsError = null,
    onRetryNotifications,
    renderNotificationsContent,
    userMenuItems = [],
    avatarInitials = 'ME',
    handleSetTab,
    onGoHome,
    t = (k, o) => o?.defaultValue || k,
    hideMobileHeader = false,
    showSearch = false,
    className = ''
}) {
    const desktopSearchInputRef = useRef(null);
    const desktopSearchRef = useRef(null);
    const desktopBellRef = useRef(null);
    const prevShowNotificationsRef = useRef(showNotifications);

    // Return focus to desktop bell on close
    useEffect(() => {
        if (prevShowNotificationsRef.current && !showNotifications) {
            desktopBellRef.current?.focus();
        }
        prevShowNotificationsRef.current = showNotifications;
    }, [showNotifications]);

    const residentName = user?.name || user?.fullName || 'Resident';
    const unreadBadgeText = unreadCount > 9 ? '9+' : String(unreadCount);

    return (
        <div className={`w-full relative ${className}`}>
            {/* ── MOBILE BRAND HEADER (< 768px: Seal + Brand Line + Title only, right side empty) ── */}
            {!hideMobileHeader && (
                <div className="flex md:hidden w-full px-[clamp(1rem,5vw,1.25rem)] pt-[max(env(safe-area-inset-top,0px),12px)] pb-3">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            if (onGoHome) onGoHome();
                            else if (handleSetTab) handleSetTab('overview');
                        }}
                        className="flex items-center gap-3 w-full min-h-[48px] text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-xl transition-opacity active:scale-[0.99]"
                        aria-label="PULSO home, Caloocan City Engineering Department"
                        title="Go to Home"
                    >
                        {/* Municipal Seal (2.5rem / 40px) */}
                        <img
                            src="/city-engineering-logo.png"
                            alt="Caloocan City Seal"
                            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full aspect-square object-contain shrink-0 border border-slate-200 dark:border-slate-800"
                            loading="eager"
                        />

                        {/* Brand line + Full-width screen title (empty right side prevents wrapping at 320px) */}
                        <div className="min-w-0 flex-1">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight">
                                Caloocan Engineering
                            </span>
                            <h1 className="text-lg font-bold font-heading text-slate-900 dark:text-white truncate leading-tight tracking-tight mt-0.5">
                                {screenTitle}
                            </h1>
                        </div>
                    </button>
                </div>
            )}

            {/* ── DESKTOP BRAND HEADER (≥ 768px: Official municipal bar intact) ── */}
            <div className="hidden md:flex w-full px-4 lg:px-6 relative items-center justify-between gap-4 md:gap-6 h-14 sm:h-16 py-1 sm:py-0">
                {/* Brand Block */}
                <div className={`items-center shrink-0 min-w-0 ${showSearch && isSearchOpen ? 'hidden md:flex' : 'flex'}`}>
                    <a
                        href="/dashboard"
                        onClick={(e) => {
                            e.preventDefault();
                            if (onGoHome) onGoHome();
                            else if (handleSetTab) handleSetTab('overview');
                        }}
                        className="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-xl cursor-pointer min-w-0 transition-opacity hover:opacity-90 active:scale-[0.99]"
                        title="Go to Home"
                        aria-label="PULSO home, Caloocan City Engineering Department"
                    >
                        <Branding showText={true} />
                    </a>
                </div>

                {/* Search Bar */}
                {showSearch ? (
                <div
                    role="search"
                    ref={desktopSearchRef}
                    data-pulso-search="true"
                    className="flex-1 max-w-[520px] mx-4 relative"
                >
                    <div
                        className={`flex items-center rounded-full bg-slate-100/90 dark:bg-[#0c1424] px-3.5 h-10 transition-all ${
                            isSearchOpen
                                ? 'border-2 border-[#ff6b00] ring-0'
                                : 'border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                        }`}
                    >
                        <Search size={17} className="text-slate-400 mr-2.5 shrink-0" />
                        <input
                            ref={desktopSearchInputRef}
                            type="text"
                            data-pulso-search-input="true"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsSearchOpen(false);
                                    setSearchQuery('');
                                    desktopSearchInputRef.current?.blur();
                                }
                            }}
                            placeholder="Search PULSO"
                            aria-label="Search PULSO"
                            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm flex-1 min-w-0 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    desktopSearchInputRef.current?.focus();
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {isSearchOpen && renderSearchDropdown && (
                        <div
                            data-pulso-search-dropdown="true"
                            onPointerDown={(e) => e.stopPropagation()}
                            className="absolute left-0 top-full mt-2 w-full max-h-[calc(100dvh-5rem)] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 text-slate-900 dark:text-white ring-1 ring-black/5"
                        >
                            {renderSearchDropdown(false)}
                        </div>
                    )}
                </div>

                
                ) : (
                    <div className="flex-1" />
                )}

                {/* Actions: Theme Mode Toggle + Notifications + User Menu */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <ThemeToggle />
                    <button
                        ref={desktopBellRef}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            const next = !showNotifications;
                            if (setShowNotifications) setShowNotifications(next);
                            if (next && isSearchOpen && setIsSearchOpen) setIsSearchOpen(false);
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={showNotifications}
                        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                        className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors relative cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                                {unreadBadgeText}
                            </span>
                        )}
                    </button>

                    <UserMenu
                        name={residentName}
                        avatarUrl={user?.avatarPhoto}
                        avatarUpdatedAt={user?.updatedAt}
                        fallbackInitial={avatarInitials}
                        subtitle={user?.barangay || 'Resident'}
                        triggerClassName="w-10 h-10 p-0.5"
                        items={userMenuItems}
                        showTriggerName={false}
                        showConfirmation={true}
                        align="right"
                    />
                </div>
            </div>

            {/* Notification Dropdown (Desktop) */}
            <NotificationDropdown
                isOpen={showNotifications}
                onClose={() => setShowNotifications && setShowNotifications(false)}
                notifications={notifications}
                onNotificationClick={onNotificationClick}
                onMarkAllRead={onMarkAllRead}
                onViewAllUpdates={() => {
                    if (handleSetTab) handleSetTab('updates');
                }}
                unreadCount={unreadCount}
                loading={loadingNotifications}
                error={notificationsError}
                onRetry={onRetryNotifications}
                triggerRefs={[desktopBellRef]}
                activeTriggerRef={desktopBellRef}
            />
        </div>
    );
}
