import AiBrandMark from './AiBrandMark';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Bell, X, ChevronLeft, User } from 'lucide-react';
import Branding from './Branding';
import UserMenu from './UserMenu';
import NotificationDropdown from './NotificationDropdown';
import ThemeToggle from './ThemeToggle';
import { API_BASE_URL } from '../utils/apiBase';
import { formatGreetingName } from '../utils/greetingHelper';

/**
 * HomeHeader Component
 * ─────────────────────────────────────────────────────────────────────────────
 * PULSO Mobile App / Resident Home Header (used ONLY on Home screen).
 *
 * Structure (< 768px):
 * 1. Row 1:
 *    - Left: Round profile avatar (44px, 2.75rem, round, 1px border token:
 *      profile photo, initials fallback on orange, or guest icon) + 0.75rem gap +
 *      text block: "Hello," (14px regular, soft gray, no emoji) + resident's name
 *      (18px bold, white in dark / navy in light, 1 line ellipsis).
 *      Avatar and text block form ONE tap target (min 48px tall) that opens Account.
 *      If guest: person icon circle + "Welcome" with "Sign in" text link.
 *    - Right: Action cluster:
 *      1. Round AI Assistant button (3rem / 48px) with the supplied PULSO AI brand mark.
 *      2. Round bell button (3rem / 48px) with unread badge (capped at "9+",
 *         alert color, only when unreadCount > 0). Tapping opens/toggles the Notification Dropdown.
 * 2. Row 2:
 *    - Full-width search field: 3rem (48px) tall, rounded corners (0.875rem),
 *      20px search icon, placeholder "Search reports, maps, guides".
 *      NO filter button.
 *      16px typed text to prevent iOS zoom.
 *      Chevron inside field on focus.
 *      2px clean orange focus border with no glow.
 *      Clear (X) button when typing.
 *
 * Desktop (≥ 768px):
 * Standard municipal top bar with seal, centered search, bell (with Notification Dropdown), and action cluster.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function HomeHeader({
    user,
    unreadCount = 0,
    onOpenAccount,
    onOpenUpdates,
    onOpenAllNotifications,
    onSignIn,
    onOpenAIChat,
    isAIChatOpen = false,
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
    handleLogout,
    handleSetTab,
    onGoHome,
    t = (k, o) => o?.defaultValue || k,
    className = ''
}) {
    const inputRef = useRef(null);
    const desktopSearchInputRef = useRef(null);
    const desktopSearchRef = useRef(null);
    const mobileBellRef = useRef(null);
    const desktopBellRef = useRef(null);
    const prevShowNotificationsRef = useRef(showNotifications);
    const [isFocused, setIsFocused] = useState(false);

    const residentFullName = (() => {
        if (user?.fullName && user.fullName !== 'Loading...' && user.fullName.trim()) {
            return user.fullName.trim();
        }
        if (user?.name && user.name !== 'Resident' && user.name !== 'Loading...' && user.name.trim()) {
            return user.name.trim();
        }
        return 'Resident';
    })();

    const greetingDisplayName = useMemo(() => formatGreetingName(user), [user]);

    const isSignedIn = Boolean(user && (user.id || user.email || (user.name && user.name !== 'Guest') || (user.fullName && user.fullName !== 'Guest')));

    const avatarInitials = (() => {
        if (user?.avatarInitials) return user.avatarInitials;
        const nameForInitials = greetingDisplayName || residentFullName;
        if (!nameForInitials || nameForInitials === 'Resident') return 'ME';
        const parts = nameForInitials.trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return nameForInitials.slice(0, 2).toUpperCase();
    })();

    const userPhotoRaw = user?.avatarPhoto || user?.avatar_url || user?.photo || user?.photo_url || user?.profile_photo || user?.avatarUrl;
    const resolvedPhotoUrl = useMemo(() => {
        if (!userPhotoRaw || typeof userPhotoRaw !== 'string') return null;
        let url = userPhotoRaw.trim();
        if (!url) return null;
        if (url.startsWith('/')) {
            url = `${API_BASE_URL}${url}`;
        }
        return url;
    }, [userPhotoRaw]);

    const [photoLoadError, setPhotoLoadError] = useState(false);
    const [photoLoaded, setPhotoLoaded] = useState(false);

    useEffect(() => {
        setPhotoLoadError(false);
        setPhotoLoaded(false);
    }, [resolvedPhotoUrl]);

    // Return focus to bell when notifications dropdown closes
    useEffect(() => {
        if (prevShowNotificationsRef.current && !showNotifications) {
            if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                desktopBellRef.current?.focus();
            } else {
                mobileBellRef.current?.focus();
            }
        }
        prevShowNotificationsRef.current = showNotifications;
    }, [showNotifications]);

    const unreadBadgeText = unreadCount > 9 ? '9+' : String(unreadCount);

    const handleProfileClick = () => {
        if (isSignedIn) {
            if (onOpenAccount) onOpenAccount();
            else if (handleSetTab) handleSetTab('profile');
        } else {
            if (onSignIn) onSignIn();
        }
    };

    const handleBellClick = (e) => {
        e?.stopPropagation?.();
        const next = !showNotifications;
        if (setShowNotifications) {
            setShowNotifications(next);
        }
        // Exclusivity: opening notifications closes search dropdown
        if (next && isSearchOpen && setIsSearchOpen) {
            setIsSearchOpen(false);
        }
    };

    const handleOpenSearch = () => {
        setIsSearchOpen?.(true);
        // Exclusivity: opening search closes notification dropdown
        if (showNotifications && setShowNotifications) {
            setShowNotifications(false);
        }
    };

    return (
        <div className={`w-full relative ${className}`}>
            {/* ── MOBILE HOME HEADER (< 768px) ── */}
            <div className="flex md:hidden flex-col w-full px-[clamp(1rem,5vw,1.25rem)] pt-[max(env(safe-area-inset-top,0px),12px)] pb-3">
                {/* ── ROW 1: Avatar + Greeting + Full Name (Left) and Round Bell Button (Right) ── */}
                <div className="flex items-center justify-between gap-3 w-full min-h-[48px]">
                    {/* Left: Avatar + Greeting + Full Name (One Tap Target -> Account; at least 48px tall) */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={handleProfileClick}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleProfileClick();
                            }
                        }}
                        aria-label={isSignedIn ? `Account, ${greetingDisplayName}` : 'Welcome, sign in to your account'}
                        className="flex items-center gap-3 min-w-0 flex-1 min-h-[48px] cursor-pointer select-none rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] p-0.5 active:opacity-85 transition-opacity"
                    >
                        {/* 1. Avatar (2.75rem / 44px round, 1px border token) */}
                        {isSignedIn ? (
                            resolvedPhotoUrl && !photoLoadError ? (
                                <div className="relative w-11 h-11 min-w-[44px] min-h-[44px] rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    {/* Plain circle placeholder while photo loads to prevent layout jump */}
                                    {!photoLoaded && (
                                        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 rounded-full" />
                                    )}
                                    <img
                                        src={resolvedPhotoUrl}
                                        alt=""
                                        aria-hidden="true"
                                        onLoad={() => setPhotoLoaded(true)}
                                        onError={() => setPhotoLoadError(true)}
                                        className={`w-full h-full object-cover rounded-full ${photoLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}
                                    />
                                </div>
                            ) : (
                                /* Fallback: Initials circle in existing orange token with white text (16px semibold) */
                                <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full shrink-0 border border-slate-200 dark:border-slate-800 bg-[#ff6b00] text-white flex items-center justify-center font-heading font-semibold text-base select-none">
                                    {avatarInitials}
                                </div>
                            )
                        ) : (
                            /* Guest: Plain circle with person icon from shared icon set */
                            <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full shrink-0 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center shrink-0">
                                <User size={22} strokeWidth={1.8} aria-hidden="true" />
                            </div>
                        )}

                        {/* 2. Text Block: "Hello," (14px regular, soft gray) above First + Last Name (18px bold, white in dark / navy in light) */}
                        <div className="flex flex-col justify-center min-w-0 flex-1">
                            <span className="text-sm font-normal text-slate-500 dark:text-slate-400 leading-tight">
                                {isSignedIn ? 'Hello,' : 'Welcome'}
                            </span>

                            {isSignedIn ? (
                                <h1
                                    title={greetingDisplayName}
                                    className="text-base sm:text-lg font-bold font-heading text-slate-900 dark:text-white leading-tight tracking-tight mt-0.5 break-words"
                                >
                                    {greetingDisplayName}
                                </h1>
                            ) : (
                                <span className="text-base font-bold text-[#ff6b00] hover:underline leading-tight mt-0.5">
                                    Sign in
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Right: Theme Toggle + Round Bell Button (Mobile only) */}
                    <div className="flex items-center gap-2 shrink-0">
                        <ThemeToggle responsiveBreakpoint="sm" />
                        {/* Round Bell Button (3rem / 48px) with Unread Alert Badge */}
                        <button
                            ref={mobileBellRef}
                            type="button"
                            onClick={handleBellClick}
                            aria-haspopup="dialog"
                            aria-expanded={showNotifications}
                            aria-label={
                                unreadCount > 0
                                    ? `Notifications, ${unreadCount} unread`
                                    : 'Notifications'
                            }
                            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-2xs relative shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] cursor-pointer"
                        >
                            <Bell size={20} strokeWidth={2.2} />

                            {unreadCount > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-white dark:ring-slate-900 pointer-events-none select-none z-10"
                                >
                                    {unreadBadgeText}
                                </span>
                            )}
                        </button>
                    </div>

                </div>

                {/* ── ROW 2: Full-Width Search Bar (No Filter Button) ── */}
                <div
                    role="search"
                    data-pulso-search="true"
                    aria-label="Search PULSO"
                    className="w-full relative mt-2.5"
                >
                    <div
                        className={`w-full h-12 rounded-[14px] bg-white dark:bg-slate-900 border transition-all flex items-center px-3.5 gap-2.5 relative ${
                            isFocused || isSearchOpen
                                ? 'border-2 border-[#ff6b00] ring-0'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                        }`}
                    >
                        {/* Left: Chevron inside on focus; otherwise 20px soft gray search magnifier */}
                        {isFocused || isSearchOpen ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSearchOpen(false);
                                    setIsFocused(false);
                                    setSearchQuery('');
                                    inputRef.current?.blur();
                                }}
                                className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center text-[#ff6b00] hover:bg-orange-500/10 active:scale-95 transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                aria-label="Close search"
                                title="Close search"
                            >
                                <ChevronLeft size={20} strokeWidth={2.4} />
                            </button>
                        ) : (
                            <Search size={20} className="text-slate-400 shrink-0" aria-hidden="true" />
                        )}

                        <input
                            ref={inputRef}
                            type="text"
                            data-pulso-search-input="true"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                handleOpenSearch();
                            }}
                            onFocus={() => {
                                setIsFocused(true);
                                handleOpenSearch();
                            }}
                            onBlur={() => {
                                setIsFocused(false);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsSearchOpen(false);
                                    setIsFocused(false);
                                    setSearchQuery('');
                                    inputRef.current?.blur();
                                }
                            }}
                            placeholder="Search PULSO"
                            aria-label="Search PULSO"
                            className="flex-1 min-w-0 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-base font-normal text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 truncate caret-[#ff6b00]"
                            style={{ outline: 'none', boxShadow: 'none' }}
                        />

                        {searchQuery && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery('');
                                    inputRef.current?.focus();
                                }}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                                aria-label="Clear search"
                                title="Clear search query"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {/* Search Dropdown Popup: sits directly under search bar */}
                    {isSearchOpen && renderSearchDropdown && (
                        <div
                            data-pulso-search-dropdown="true"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                            }}
                            className="fixed inset-x-2.5 top-[148px] max-h-[calc(100dvh-10rem)] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 text-slate-900 dark:text-white ring-1 ring-black/5 animate-fadeIn"
                        >
                            {renderSearchDropdown(true)}
                        </div>
                    )}
                </div>
            </div>

            {/* ── DESKTOP HOME HEADER (≥ 768px: Official municipal bar intact) ── */}
            <div className="hidden md:flex w-full px-4 lg:px-6 relative items-center justify-between gap-4 md:gap-6 h-14 sm:h-16 py-1 sm:py-0">
                {/* Brand Block */}
                <div className={`items-center shrink-0 min-w-0 ${isSearchOpen ? 'hidden md:flex' : 'flex'}`}>
                    <a
                        href="/dashboard"
                        onClick={(e) => {
                            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                            if (onGoHome) {
                                e.preventDefault();
                                onGoHome();
                            } else if (handleSetTab) {
                                e.preventDefault();
                                handleSetTab('overview');
                            }
                        }}
                        className="flex items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-xl cursor-pointer min-w-0 transition-opacity hover:opacity-90 active:scale-[0.99]"
                        aria-label="PULSO home, Caloocan City Engineering Department"
                        title="Go to Home"
                    >
                        <Branding showText={true} />
                    </a>
                </div>

                {/* Search Bar */}
                <div
                    role="search"
                    data-pulso-search="true"
                    ref={desktopSearchRef}
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
                                handleOpenSearch();
                            }}
                            onFocus={() => handleOpenSearch()}
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
                            onPointerDown={(e) => {
                                e.stopPropagation();
                            }}
                            className="absolute left-0 top-full mt-2 w-full max-h-[calc(100dvh-5rem)] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 text-slate-900 dark:text-white ring-1 ring-black/5"
                        >
                            {renderSearchDropdown(false)}
                        </div>
                    )}
                </div>

                {/* Actions: Theme Mode Toggle + Notifications + User Menu */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <ThemeToggle />

                    <button
                        ref={desktopBellRef}
                        type="button"
                        onClick={handleBellClick}
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
                        name={residentFullName || 'Resident'}
                        avatarUrl={user?.avatarPhoto || resolvedPhotoUrl}
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

            {/* Notification Dropdown: Opens directly under the header on mobile & desktop */}
            <NotificationDropdown
                isOpen={showNotifications}
                onClose={() => setShowNotifications && setShowNotifications(false)}
                notifications={notifications}
                onNotificationClick={(notif) => {
                    if (onNotificationClick) {
                        onNotificationClick(notif);
                    } else if (onOpenAllNotifications) {
                        onOpenAllNotifications();
                    }
                }}
                onMarkAllRead={onMarkAllRead}
                onOpenAllNotifications={onOpenAllNotifications}
                onViewAllUpdates={() => {
                    if (onOpenAllNotifications) {
                        onOpenAllNotifications();
                    }
                }}
                unreadCount={unreadCount}
                loading={loadingNotifications}
                error={notificationsError}
                onRetry={onRetryNotifications}
                triggerRefs={[mobileBellRef, desktopBellRef]}
                activeTriggerRef={typeof window !== 'undefined' && window.innerWidth >= 768 ? desktopBellRef : mobileBellRef}
            />
        </div>
    );
}
