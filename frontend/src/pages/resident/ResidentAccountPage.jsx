import NativeBottomSheet from "../../components/mobile/NativeBottomSheet";
import ResidentNotificationSettings from "../../components/ResidentNotificationSettings";
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { isNativeAndroid } from "../../utils/appContext";
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, Cookie, Palette, LogOut, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, MessageSquare, X, Camera, MapPin, PhoneCall, Star, BookOpen, ShieldCheck, Info, FileText, Sun, Moon, Monitor, Mail, Eye, Lock, EyeOff, Check, Loader2, Landmark, Edit3, HelpCircle, Globe } from 'lucide-react';
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from 'react-i18next';
import { getAuthUser, setAuthSession } from "../../utils/authSession";
import { API_BASE_URL } from "../../utils/apiBase";
import AvatarCropModal, { validateAvatarFile } from "../../components/AvatarCropModal";
import { FlagPH, FlagUS } from "../../components/FlagIcons";
import { isUsingNameFallback } from "../../utils/greetingHelper";
import { formatAddress } from './residentUtils';
import { UserAvatar } from './ResidentAvatar';

const ProfileView = ({
    user,
    setUser,
    handleUpdateProfile,
    updatingProfile,
    containerVariants,
    userReports = [],
    showToast,
    handleLogout,
    handleSetModal,
    t,
    i18n: propI18n,
    subView: propSubView,
    setSubView: propSetSubView,
    token,
    currentUser,
    fetchUser
}) => {
    const navigate = useNavigate();
    const { theme, themeMode = 'system', changeTheme } = useTheme();
    const translationHook = useTranslation();
    const activeI18n = propI18n || translationHook.i18n;
    const isFilipino = Boolean(activeI18n?.language?.startsWith('tl') || activeI18n?.language?.startsWith('fil'));

    const handleSwitchLanguage = (lang) => {
        if (activeI18n?.changeLanguage) {
            activeI18n.changeLanguage(lang);
        }
    };

    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const langDropdownRef = useRef(null);

    // Close language dropdown on outside click or Escape key
    useEffect(() => {
        if (!isLangDropdownOpen) return;
        const handleClickOutside = (e) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
                setIsLangDropdownOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsLangDropdownOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isLangDropdownOpen]);

    const [internalSubView, setInternalSubView] = useState('settings');
    const activeSubView = propSubView !== undefined ? propSubView : internalSubView;
    const changeSubView = propSetSubView || setInternalSubView;

    // Default to top when entering profile settings
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [activeSubView]);
    const [editingField, setEditingField] = useState(null); // 'email' | 'phone' | null
    const [tempValues, setTempValues] = useState({ email: user.email || '', phone: user.phone || '' });
    const [activeTooltip, setActiveTooltip] = useState(null); // 'verified' | 'name' | 'barangay' | 'address' | null
    const [cropModalData, setCropModalData] = useState(null); // { imageSrc, naturalWidth, naturalHeight, revokeUrl }
    const fileInputRef = useRef(null);

    // Settings States & Dialogs
    const [notificationsEnabled,setNotificationsEnabled]=useState(user?.preferences?.notifications_enabled!==false);

    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [ratingScore, setRatingScore] = useState(5);
    const [ratingSubmitted, setRatingSubmitted] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const nativeContactSheet = isNativeAndroid();
    const closeContact = () => setIsContactModalOpen(false);
    const contactTitle = t('nativeAndroid.contact.title');
    const contactDescription = t('nativeAndroid.contact.description');
    const contactCloseLabel = t('nativeAndroid.contact.close');
    const contactDetails = (
        <div className="space-y-2 pt-1 text-left">
            <div className="space-y-0.5 rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{t('nativeAndroid.contact.engineeringOffice')}</div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">888-1234 / 8397-6212</div>
                <div className="break-all text-sm text-slate-600 dark:text-slate-300">engineering@caloocancity.gov.ph</div>
            </div>
            <div className="space-y-0.5 rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{t('nativeAndroid.contact.emergencyHotlines')}</div>
                <div className="text-sm font-semibold text-orange-700 dark:text-orange-400">{t('nativeAndroid.contact.emergencyNumber')}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">Caloocan DRRMO: 8397-6212</div>
            </div>
        </div>
    );
    const contactCloseButton = (
        <button type="button" onClick={closeContact}
            className="min-h-11 w-full cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            {contactCloseLabel}
        </button>
    );

    // Password & Security States
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
    const [changingPassword, setChangingPassword] = useState(false);

    const handleSavePreference = async (key, val) => {
        const nextPreferences = { [key]: val };
        if (key === 'notifications_enabled') {
            localStorage.setItem('pulso_notifications_enabled', String(val));
        } else if (key === 'notification_categories') {
            localStorage.setItem('pulso_notification_categories', JSON.stringify(val));
        } else if (key === 'language') {
            localStorage.setItem('pulso_language', String(val));
        } else if (key === 'theme') {
            localStorage.setItem('pulso_theme', String(val));
            localStorage.setItem('theme', String(val));
        }

        if (handleUpdateProfile) {
            await handleUpdateProfile('preferences', nextPreferences);
        }
    };

    const [languageAnnouncement, setLanguageAnnouncement] = useState('');

    const handleToggleLanguage = async () => {
        const prevLang = isFilipino ? 'tl' : 'en';
        const nextLang = isFilipino ? 'en' : 'tl';
        try {
            handleSwitchLanguage(nextLang);
            await handleSavePreference('language', nextLang);
            const announcementText = nextLang === 'tl' ? 'Language changed to Tagalog' : 'Language changed to English';
            setLanguageAnnouncement(announcementText);
        } catch (err) {
            console.error('Failed to save language preference:', err);
            handleSwitchLanguage(prevLang);
            setLanguageAnnouncement(prevLang === 'tl' ? 'Language changed to Tagalog' : 'Language changed to English');
            if (showToast) {
                showToast("We couldn't change the language. Please try again.", 'error');
            }
        }
    };

    const [themeAnnouncement, setThemeAnnouncement] = useState('');

    const handleToggleDarkMode = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        changeTheme(nextTheme);
        handleSavePreference('theme', nextTheme);
        const announcementText = nextTheme === 'dark'
            ? t('dashboard.profile.darkModeOn', { defaultValue: 'Dark mode on' })
            : t('dashboard.profile.lightModeOn', { defaultValue: 'Light mode on' });
        setThemeAnnouncement(announcementText);
    };

    const hasLength = passwords.new.length >= 8;
    const hasCapital = /[A-Z]/.test(passwords.new);
    const hasNumber = /[0-9]/.test(passwords.new);
    const hasSpecial = /[^A-Za-z0-9]/.test(passwords.new);
    const passwordScore = [hasLength, hasCapital, hasNumber, hasSpecial].filter(Boolean).length;

    const getStrengthMeter = () => {
        if (!passwords.new) return { label: 'None', text: 'Enter password', color: 'text-slate-400 dark:text-slate-500', bar: 'bg-slate-300 dark:bg-slate-700' };
        if (passwordScore === 1) return { label: 'Weak', text: 'Weak', color: 'text-rose-500', bar: 'bg-rose-500' };
        if (passwordScore === 2) return { label: 'Fair', text: 'Fair', color: 'text-amber-500', bar: 'bg-amber-500' };
        if (passwordScore === 3) return { label: 'Good', text: 'Good', color: 'text-orange-500', bar: 'bg-orange-500' };
        return { label: 'Strong', text: 'Strong', color: 'text-emerald-500', bar: 'bg-emerald-500' };
    };

    const meter = getStrengthMeter();
    const hasConfirm = passwords.confirm.length > 0;
    const passwordsMatch = hasConfirm && passwords.new === passwords.confirm;
    const isPasswordFormValid = passwords.current.trim().length > 0 && hasLength && hasCapital && hasNumber && hasSpecial && passwordsMatch && passwords.new !== passwords.current;

    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!isPasswordFormValid) {
            if (!passwords.current) {
                showToast?.('Please enter your current password', 'error');
                return;
            }
            if (passwords.new.length < 8) {
                showToast?.('Password must be at least 8 characters', 'error');
                return;
            }
            if (passwords.new !== passwords.confirm) {
                showToast?.('New passwords do not match', 'error');
                return;
            }
            if (passwords.new === passwords.current) {
                showToast?.('New password cannot be the same as current password', 'error');
                return;
            }
            return;
        }

        setChangingPassword(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: passwords.current,
                    new_password: passwords.new
                })
            });

            if (res.ok) {
                showToast?.('Password updated successfully');
                setPasswords({ current: '', new: '', confirm: '' });
                changeSubView('settings');
            } else {
                const err = await res.json().catch(() => ({}));
                showToast?.(err.detail || 'Failed to update password', 'error');
            }
        } catch (err) {
            showToast?.('Network error while updating password', 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleShareApp = async () => {
        const shareData = {
            title: 'PULSO - Caloocan City Engineering Dept',
            text: 'Report civic issues, track public infrastructure works, and get live alerts with PULSO.',
            url: window.location.origin
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    navigator.clipboard?.writeText(window.location.origin);
                    if (showToast) showToast('PULSO link copied to clipboard!');
                }
            }
        } else {
            navigator.clipboard?.writeText(window.location.origin);
            if (showToast) showToast('PULSO link copied to clipboard!');
        }
    };

    const handleOpenPrivacy = () => {
        if (handleSetModal) {
            handleSetModal('privacy');
        }
    };

    const handleOpenTerms = () => {
        if (handleSetModal) {
            handleSetModal('terms');
        }
    };

    // Sync tempValues whenever user prop updates
    useEffect(() => {
        setTempValues(prev => {
            const nextEmail = user.email || '';
            const nextPhone = user.phone || '';
            if (prev.email === nextEmail && prev.phone === nextPhone) return prev;
            return { email: nextEmail, phone: nextPhone };
        });
    }, [user.email, user.phone]);

    const handleStartEdit = (field) => {
        setTempValues({ email: user.email || '', phone: user.phone || '' });
        setEditingField(field);
    };

    const handleCancelEdit = () => {
        setTempValues({ email: user.email || '', phone: user.phone || '' });
        setEditingField(null);
    };

    const handleSaveField = async (field) => {
        const val = tempValues[field];
        if (field === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
                if (showToast) showToast('Please enter a valid email address', 'error');
                return;
            }
        }
        if (field === 'phone') {
            if (!val || val.length < 10) {
                if (showToast) showToast('Please enter a valid mobile number', 'error');
                return;
            }
        }

        await handleUpdateProfile(field, val);
        setEditingField(null);
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Perform strict validation first (format, file size, decode integrity & bounds)
        const validation = await validateAvatarFile(file);

        if (!validation.valid) {
            if (showToast) showToast(validation.error, 'error');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Validation passed: open the Civic Aperture Rotate & Crop adjustment modal
        setCropModalData({
            imageSrc: validation.imageSrc,
            naturalWidth: validation.naturalWidth,
            naturalHeight: validation.naturalHeight,
            revokeUrl: validation.revokeUrl
        });
    };

    const handleSaveCroppedAvatar = async (croppedBase64) => {
        const targetUserId = currentUser?.id || user?.id;
        if (!targetUserId) {
            if (showToast) showToast('Session not found. Please log in again.', 'error');
            return;
        }

        try {
            // Convert base64 data URL to a clean binary Blob/File for multipart upload
            const responseBlob = await fetch(croppedBase64);
            const blob = await responseBlob.blob();
            const formData = new FormData();
            formData.append('file', blob, 'avatar.jpg');

            const res = await fetch(`${API_BASE_URL}/api/residents/${targetUserId}/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Failed to upload profile photo to server.');
            }

            const data = await res.json();
            const serverAvatarUrl = data.avatar_url;
            const updatedAt = data.updated_at || new Date().toISOString();

            // 1. Immediately update local state with server URL and version timestamp
            if (setUser) {
                setUser(prev => ({
                    ...prev,
                    avatarPhoto: serverAvatarUrl,
                    updatedAt: updatedAt
                }));
            }

            // 2. Harmonize active session storage
            try {
                const currentStored = getAuthUser();
                if (currentStored) {
                    setAuthSession(token, {
                        ...currentStored,
                        avatar_url: serverAvatarUrl,
                        updated_at: updatedAt
                    });
                }
            } catch (err) {
                // silent
            }

            // 3. Trigger full user refresh across all components
            if (fetchUser) {
                await fetchUser(targetUserId);
            }

            if (showToast) showToast('Profile photo updated and saved to server successfully!');
        } catch (err) {
            console.error("Avatar upload error:", err);
            if (showToast) showToast(err.message || 'Error updating profile photo', 'error');
        } finally {
            if (cropModalData?.revokeUrl) {
                cropModalData.revokeUrl();
            }
            setCropModalData(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCloseCropModal = () => {
        if (cropModalData?.revokeUrl) {
            cropModalData.revokeUrl();
        }
        setCropModalData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const totalReports = userReports.length;
    const resolvedReports = userReports.filter(r => r.status === 'resolved').length;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full relative"
        >
            <AnimatePresence mode="wait">
                {activeSubView === 'settings' && (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="w-full space-y-4 sm:space-y-6 pb-28 sm:pb-24"
                    >
                        {/* Page Header */}
                        <div className="px-0.5 sm:px-1 pt-0 sm:pt-1">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                Account &amp; Settings
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Manage your profile, security, and how you use PULSO.
                            </p>
                        </div>

                        {/* Top User Banner Card */}
                        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full font-black flex items-center justify-center text-white text-lg sm:text-2xl shadow-sm bg-[#EA580C] shrink-0 select-none overflow-hidden ring-2 ring-orange-500/20">
                                    {user.avatarPhoto ? (
                                        <UserAvatar
                                            avatarUrl={user.avatarPhoto}
                                            updatedAt={user.updatedAt}
                                            fallbackInitial={user.avatar || 'M'}
                                            alt={user.fullName || 'Resident'}
                                        />
                                    ) : (
                                        (user.name ? user.name[0].toUpperCase() : 'M')
                                    )}
                                </div>

                                <div className="min-w-0 text-left">
                                    <h3 className="font-heading font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl tracking-tight truncate">
                                        {user.fullName || user.name || 'Marc Alexis'}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                        {user.email ? user.email.replace(/(.{2})(.*)(?=@)/, '$1••••') : 'marc••••@gmail.com'}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        <MapPin size={14} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{user.barangay ? `${user.barangay}, Caloocan` : 'Barangay 171, Caloocan'}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => changeSubView('profile-details')}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl border border-[#EA580C] text-[#EA580C] hover:bg-orange-50 dark:hover:bg-orange-950/20 text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0"
                            >
                                <Edit3 size={15} />
                                <span>Edit profile</span>
                            </button>
                        </div>

                        {/* 2-Column Desktop Grid Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">

                            {/* ── LEFT COLUMN: Account & Preferences (~7 cols) ── */}
                            <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6">

                                {/* Card 1: Account */}
                                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs text-left">
                                    <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white mb-2">
                                        Account
                                    </h3>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                        <button
                                            type="button"
                                            onClick={() => changeSubView('profile-details')}
                                            className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <User size={20} strokeWidth={2} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                                                        Personal information
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Name, email, phone number, and address
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => changeSubView('security')}
                                            className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <Lock size={20} strokeWidth={2} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                                                        Password &amp; security
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Update password and manage session security
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </button>
                                    </div>
                                </div>

                                {/* Card 2: Preferences */}
                                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
                                    <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white mb-2">
                                        Preferences
                                    </h3>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                        {/* Notifications */}
                                        <button
                                            type="button"
                                            onClick={() => changeSubView('notifications')}
                                            className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <Bell size={20} strokeWidth={2} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                                                        Notifications
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Push and SMS updates about your reports
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs font-bold text-[#EA580C]">On</span>
                                                <ChevronRight size={18} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </button>

                                        {/* Language Selector with Custom Civic Dropdown List */}
                                        <div className="py-3.5 flex items-center justify-between gap-3 text-left -mx-2 px-2 relative">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <Globe size={20} strokeWidth={2} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                                                        Language
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Current: {isFilipino ? 'Filipino (Tagalog)' : 'English'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Custom Dropdown Trigger & List */}
                                            <div className="relative shrink-0" ref={langDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                                    aria-haspopup="listbox"
                                                    aria-expanded={isLangDropdownOpen}
                                                    className={`h-10 px-3.5 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2.5 transition-all shadow-2xs cursor-pointer select-none ${
                                                        isLangDropdownOpen
                                                            ? 'border-[#EA580C] ring-2 ring-[#EA580C]/25 shadow-xs'
                                                            : 'border-slate-200/90 dark:border-slate-700 hover:border-[#EA580C]/60 hover:bg-slate-50/80 dark:hover:bg-slate-700/60'
                                                    }`}
                                                >
                                                    <div className="w-4.5 h-4.5 rounded-full overflow-hidden shrink-0 shadow-2xs border border-black/10 flex items-center justify-center">
                                                        {isFilipino ? <FlagPH className="w-full h-full object-cover" /> : <FlagUS className="w-full h-full object-cover" />}
                                                    </div>
                                                    <span>{isFilipino ? 'Filipino' : 'English'}</span>
                                                    <ChevronDown
                                                        size={14}
                                                        className={`text-slate-400 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180 text-[#EA580C]' : ''}`}
                                                    />
                                                </button>

                                                {/* Custom Dropdown List Menu */}
                                                <AnimatePresence>
                                                    {isLangDropdownOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                                            role="listbox"
                                                            aria-label="Select language"
                                                            className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#0C1528] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/60 p-1.5 z-50 overflow-hidden"
                                                        >
                                                            <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 mb-1">
                                                                <span>Language Selection</span>
                                                                <span className="text-[9px] font-mono text-slate-400 font-normal">PULSO</span>
                                                            </div>

                                                            {/* Option 1: English */}
                                                            <button
                                                                type="button"
                                                                role="option"
                                                                aria-selected={!isFilipino}
                                                                onClick={() => {
                                                                    handleSwitchLanguage('en');
                                                                    setIsLangDropdownOpen(false);
                                                                }}
                                                                className={`w-full px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                                                                    !isFilipino
                                                                        ? 'bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-900/50 shadow-2xs'
                                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium border border-transparent'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 shadow-2xs border border-black/10">
                                                                        <FlagUS className="w-full h-full object-cover" />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <div className="leading-tight">English</div>
                                                                        <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">English (US)</div>
                                                                    </div>
                                                                </div>
                                                                {!isFilipino && (
                                                                    <div className="w-5 h-5 rounded-full bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0">
                                                                        <Check size={12} strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                            </button>

                                                            {/* Option 2: Filipino */}
                                                            <button
                                                                type="button"
                                                                role="option"
                                                                aria-selected={isFilipino}
                                                                onClick={() => {
                                                                    handleSwitchLanguage('tl');
                                                                    setIsLangDropdownOpen(false);
                                                                }}
                                                                className={`w-full px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer mt-1 ${
                                                                    isFilipino
                                                                        ? 'bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-900/50 shadow-2xs'
                                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium border border-transparent'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 shadow-2xs border border-black/10">
                                                                        <FlagPH className="w-full h-full object-cover" />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <div className="leading-tight">Filipino</div>
                                                                        <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500">Tagalog (Salin)</div>
                                                                    </div>
                                                                </div>
                                                                {isFilipino && (
                                                                    <div className="w-5 h-5 rounded-full bg-[#EA580C]/10 text-[#EA580C] flex items-center justify-center shrink-0">
                                                                        <Check size={12} strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        {/* Appearance 3-way Segmented Control */}
                                        <div className="py-3.5 -mx-2 px-2">
                                            <div className="flex items-center gap-3.5 min-w-0 mb-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <Palette size={20} strokeWidth={2} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                                                        Appearance
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Choose your display style
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                                                <button
                                                    type="button"
                                                    onClick={() => changeTheme('light')}
                                                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        themeMode === 'light'
                                                            ? 'bg-white dark:bg-slate-700 text-[#EA580C] dark:text-[#ff6b00] border border-slate-200/80 dark:border-slate-600 shadow-xs'
                                                            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    <Sun size={15} />
                                                    <span>Light</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => changeTheme('dark')}
                                                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        themeMode === 'dark'
                                                            ? 'bg-white dark:bg-slate-700 text-[#EA580C] dark:text-[#ff6b00] border border-slate-200/80 dark:border-slate-600 shadow-xs'
                                                            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    <Moon size={15} />
                                                    <span>Dark</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => changeTheme('system')}
                                                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                        themeMode === 'system'
                                                            ? 'bg-white dark:bg-slate-700 text-[#EA580C] dark:text-[#ff6b00] border border-slate-200/80 dark:border-slate-600 shadow-xs'
                                                            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    <Monitor size={15} />
                                                    <span>System</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 text-left">
                                        Preferences apply to your account.
                                    </p>
                                </div>
                            </div>

                            {/* ── RIGHT COLUMN: Help & Support, Privacy & Legal, Sign Out (~5 cols) ── */}
                            <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-6">

                                {/* Card: Help & support */}
                                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
                                    <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white mb-2">
                                        Help &amp; support
                                    </h3>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                        {/* Row 1: How PULSO works */}
                                        <button
                                            type="button"
                                            onClick={() => handleSetModal('reporting-guide')}
                                            className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <BookOpen size={20} strokeWidth={2} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                                                        How PULSO works
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Reporting guide.
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </button>

                                        {/* Row 2: Help center */}
                                        <button
                                            type="button"
                                            onClick={() => handleSetModal('help-center')}
                                            className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <HelpCircle size={20} strokeWidth={2} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                                                        Help center
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Common questions.
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </button>

                                        {/* Row 3: Contact support */}
                                        <button
                                            type="button"
                                            onClick={() => setIsContactModalOpen(true)}
                                            aria-haspopup="dialog"
                                            className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <MessageSquare size={20} strokeWidth={2} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                                                        Contact support
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        Get help with your account.
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </button>
                                    </div>
                                </div>

                                {/* Card: Privacy & legal */}
                                <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
                                    <h3 className="font-heading font-extrabold text-base text-slate-900 dark:text-white mb-2">
                                        Privacy &amp; legal
                                    </h3>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                        {/* Row 1: Privacy policy */}
                                        <button
                                            type="button"
                                            onClick={() => handleSetModal('privacy')}
                                            className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <ShieldCheck size={20} strokeWidth={2} />
                                                </div>
                                                <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                                                    Privacy policy
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </button>

                                        {/* Row 2: Terms of use */}
                                        <button
                                            type="button"
                                            onClick={() => handleSetModal('terms')}
                                            className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <FileText size={20} strokeWidth={2} />
                                                </div>
                                                <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                                                    Terms of use
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </button>

                                        {/* Row 3: Cookie preferences */}
                                        <button
                                            type="button"
                                            onClick={() => handleSetModal('cookies')}
                                            className="w-full py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-xl transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                                    <Cookie size={20} strokeWidth={2} />
                                                </div>
                                                <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                                                    Cookie preferences
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </button>
                                    </div>
                                </div>

                                {/* Card: Sign out (Card button) */}
                                <button
                                    type="button"
                                    onClick={() => setIsLogoutConfirmOpen(true)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs flex flex-col justify-center gap-1 hover:border-red-300 dark:hover:border-red-900/50 hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-all cursor-pointer text-left group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <LogOut size={18} className="text-slate-700 dark:text-slate-300 group-hover:text-red-600 transition-colors shrink-0" />
                                        <span className="font-heading font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">
                                            Sign out
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-7">
                                        End your session on this device.
                                    </p>
                                </button>

                            </div>

                        </div>
                    </motion.div>
                )}

                {/* Sub-view: Password & Security */}
                {activeSubView === 'security' && (
                    <motion.div
                        key="security"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.15 }}
                        className="w-full max-w-[640px] mx-auto space-y-5 pb-36 sm:pb-28"
                    >
                        {/* Navigation / Header */}
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => changeSubView('settings')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[38px] outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                                aria-label="Back to Settings"
                            >
                                <ChevronLeft size={16} className="shrink-0" />
                                <span>Settings</span>
                            </button>
                            <div className="px-1">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Password &amp; Security
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Manage your credentials, linked accounts, and active device sessions
                                </p>
                            </div>
                        </div>

                        {/* Change Password Form */}
                        <div className="w-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <Lock size={18} className="text-slate-400 dark:text-slate-500" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Change Password
                                </h3>
                            </div>

                            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Current Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPass.current ? 'text' : 'password'}
                                            value={passwords.current}
                                            onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                                            placeholder="Enter current password"
                                            className="w-full px-3.5 py-2.5 pr-11 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-300 placeholder:opacity-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(prev => ({ ...prev, current: !prev.current }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                            aria-label={showPass.current ? 'Hide password' : 'Show password'}
                                        >
                                            {showPass.current ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPass.new ? 'text' : 'password'}
                                            value={passwords.new}
                                            onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                                            placeholder="At least 8 characters"
                                            className="w-full px-3.5 py-2.5 pr-11 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-300 placeholder:opacity-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(prev => ({ ...prev, new: !prev.new }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                            aria-label={showPass.new ? 'Hide password' : 'Show password'}
                                        >
                                            {showPass.new ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>

                                    {/* Upfront helper requirement: visible when empty so user sees full requirement without relying on placeholder */}
                                    {!passwords.new && (
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                                            At least 8 characters with numbers &amp; symbols
                                        </p>
                                    )}

                                    {/* Password Strength Meter */}
                                    {passwords.new && (
                                        <div className="mt-2 space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-400">Password Strength:</span>
                                                <span className={`font-bold ${meter.color}`}>{meter.text}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${meter.bar} transition-all duration-300`}
                                                    style={{ width: `${(passwordScore / 4) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPass.confirm ? 'text' : 'password'}
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                                            placeholder="Re-type new password"
                                            className="w-full px-3.5 py-2.5 pr-11 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-300 placeholder:opacity-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(prev => ({ ...prev, confirm: !prev.confirm }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                                            aria-label={showPass.confirm ? 'Hide password' : 'Show password'}
                                        >
                                            {showPass.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {hasConfirm && (
                                        <p className={`text-[11px] mt-1 font-medium ${passwordsMatch ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={changingPassword || !isPasswordFormValid}
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm shadow-orange-500/20 min-h-[44px] flex items-center justify-center gap-2"
                                    >
                                        {changingPassword && <Loader2 size={14} className="animate-spin" />}
                                        <span>{changingPassword ? 'Updating...' : 'Update Password'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Linked Google Account */}
                        <div className="w-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Linked Accounts
                            </h3>
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-xs border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-700 dark:text-slate-200">
                                        G
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            Google Account
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {user.email || 'alexismarcaida@gmail.com'}
                                        </div>
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                                    Connected
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 px-1">
                                You can sign in with your linked Google account or set your standard password above.
                            </p>
                        </div>

                        {/* Active Sessions */}
                        <div className="w-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Active Sessions
                            </h3>
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                                <div className="flex items-center gap-3">
                                    <Monitor size={18} className="text-slate-400" />
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <span>This device</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">Active now</span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Caloocan City, PH • Web Browser
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => showToast?.('Signed out of all other device sessions')}
                                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[44px]"
                            >
                                Sign Out of Other Devices
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Sub-view: Notification Preferences */}
                {activeSubView === 'notifications' && (
                    <motion.div
                        key="notifications"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.15 }}
                        className="w-full max-w-[640px] mx-auto space-y-5 pb-36 sm:pb-28"
                    >
                        {/* Navigation / Header */}
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => changeSubView('settings')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-11 focus-visible:outline-3 focus-visible:outline-blue-600"
                                aria-label={t('nativeAndroid.notificationSettingsBack')}
                            >
                                <ChevronLeft size={16} className="shrink-0" />
                                <span>{t('nativeAndroid.notificationSettingsBack')}</span>
                            </button>
                        </div>

                        <ResidentNotificationSettings onSaved={preferences=>setNotificationsEnabled(preferences.enabled)}/>
                    </motion.div>
                )}

                {/* Sub-view: Profile Details */}
                {activeSubView === 'profile-details' && (
                    <motion.div
                        key="profile-details"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="w-full space-y-4"
                    >
                        {/* Navigation: Back to Settings button */}
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => changeSubView('settings')}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/90 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[38px] outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shadow-xs"
                                aria-label="Back to Settings"
                            >
                                <ChevronLeft size={16} className="shrink-0" />
                                <span>Back to Settings</span>
                            </button>
                        </div>

                        {/* Full Profile Card */}
                        <div className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-xl dark:shadow-2xl transition-colors">
                            {/* Subtle Ambient Glow */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 blur-3xl rounded-full -mr-24 -mt-24 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full -ml-20 -mb-20 pointer-events-none" />

                            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10">
                                {/* Left Column: Avatar & Civic Stats Only (NO settings or toggles) */}
                                <div className="flex flex-col items-center gap-6 shrink-0 w-full lg:w-80">
                                    {/* Avatar with Camera Upload Overlay & Touch Badge */}
                                    <div className="relative group">
                                        <div className={`w-36 h-36 rounded-full font-black flex items-center justify-center text-white text-5xl shadow-md border-2 border-slate-200 dark:border-slate-800 relative overflow-hidden transition-transform duration-200 group-hover:scale-[1.02] ${
                                            user.avatarPhoto
                                                ? 'bg-slate-100 dark:bg-slate-800'
                                                : 'bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600'
                                        }`}>
                                            <UserAvatar
                                                avatarUrl={user.avatarPhoto}
                                                updatedAt={user.updatedAt}
                                                fallbackInitial={user.avatar || 'R'}
                                                alt={user.fullName || 'Resident'}
                                            />

                                            {/* Hover Upload Overlay */}
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute inset-0 rounded-full bg-slate-950/75 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-white"
                                                title="Change Profile Photo"
                                            >
                                                <Camera size={22} className="text-orange-400" />
                                                <span className="text-[11px] font-semibold tracking-wide">Change Photo</span>
                                            </button>
                                        </div>

                                        {/* Always-visible Camera Upload Badge (for clarity & mobile/touch) */}
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-lg border-2 border-white dark:border-slate-900 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer z-10"
                                            title="Upload Profile Photo"
                                            aria-label="Upload Profile Photo"
                                        >
                                            <Camera size={16} />
                                        </button>

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleAvatarChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>

                                    {/* Verified Resident Trust Badge */}
                                    <div className="text-center space-y-2 w-full flex flex-col items-center">
                                        <div
                                            className="relative inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-200 dark:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] cursor-pointer select-none group transition-colors"
                                            onClick={() => setActiveTooltip(activeTooltip === 'verified' ? null : 'verified')}
                                            onMouseEnter={() => setActiveTooltip('verified')}
                                            onMouseLeave={() => setActiveTooltip(null)}
                                        >
                                            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                                {t('dashboard.profile.verified', { defaultValue: 'Verified Resident' })}
                                            </span>
                                            <Info size={12} className="text-emerald-500/70 dark:text-emerald-400/60 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />

                                            <AnimatePresence>
                                                {activeTooltip === 'verified' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 6 }}
                                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl text-left z-30 pointer-events-none"
                                                    >
                                                        <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                                            ✓ Official Resident of Caloocan City. Verified against Barangay Registry records.
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{user.fullName}</h3>
                                        <p className="text-[12px] font-mono text-slate-500 dark:text-slate-400">
                                            {t('dashboard.profile.memberSince', { defaultValue: 'Joined' })} {user.memberSince}
                                        </p>
                                    </div>

                                    {/* Civic Impact Stats Box */}
                                    <div className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm transition-colors">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Civic Activity</span>
                                            <span className="text-[10px] font-mono font-semibold text-slate-400">Registered Resident</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div className="bg-white dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                                                <div className="font-mono text-base font-bold text-slate-900 dark:text-white">{totalReports}</div>
                                                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Reports Filed</div>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                                                <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">{resolvedReports}</div>
                                                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Resolved</div>
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 pt-1 text-center font-medium">
                                            <MapPin size={12} className="text-orange-500 shrink-0" />
                                            <span className="truncate">{user.barangay || 'Caloocan City'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Form Sections ──────────────────────── */}
                                <div className="flex-1 space-y-8 min-w-0">

                                    {/* ── Section 1: PERSONAL INFORMATION (Consolidated Locked Block) ── */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                <User size={14} className="text-orange-500" />
                                                PERSONAL INFORMATION
                                            </h4>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 rounded-md">
                                                <Lock size={11} className="text-slate-400" />
                                                Verified Record
                                            </span>
                                        </div>

                                        {/* Unified Card grouping Official Name, Barangay, and Residential Address */}
                                        <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-5">
                                            {/* Registered Name & Barangay Side-by-Side */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Official Name */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                        {t('dashboard.profile.regName', { defaultValue: 'Official Name' })}
                                                    </label>
                                                    <div
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-900 dark:text-white flex items-center justify-between group cursor-help"
                                                        title="Verified by barangay — contact your barangay office to update"
                                                    >
                                                        <span className="truncate">{user.fullName}</span>
                                                        <Lock size={14} className="text-slate-400 dark:text-slate-500 shrink-0 ml-2" />
                                                    </div>
                                                    {isUsingNameFallback(user) && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                                                            <Info size={12} className="text-orange-500 shrink-0" />
                                                            <span>Check how your name appears.</span>
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Barangay */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                        {t('dashboard.profile.barangay', { defaultValue: 'Registered Barangay' })}
                                                    </label>
                                                    <div
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-900 dark:text-white flex items-center justify-between group cursor-help"
                                                        title="Verified by barangay — contact your barangay office to update"
                                                    >
                                                        <span className="truncate">{user.barangay}</span>
                                                        <Lock size={14} className="text-slate-400 dark:text-slate-500 shrink-0 ml-2" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Residential Address (grouped directly under Personal Information) */}
                                            <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                        <MapPin size={12} className="text-orange-500 shrink-0" />
                                                        {t('dashboard.profile.resAddress', { defaultValue: 'Residential Address' })}
                                                    </label>
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 px-2 py-0.5 rounded-md">
                                                        <Lock size={10} className="text-slate-400" />
                                                        Official Record
                                                    </span>
                                                </div>

                                                <div
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-[14px] font-semibold text-slate-800 dark:text-slate-200 flex items-start justify-between gap-3 min-h-[56px] leading-relaxed cursor-help"
                                                    title="Verified by barangay — contact your barangay office to update"
                                                >
                                                    <span className="flex-1">{formatAddress(user.address) || "No complete address recorded. Please contact LGU for verification."}</span>
                                                    <Lock size={14} className="text-slate-400 dark:text-slate-500 shrink-0 mt-1" />
                                                </div>

                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                                                    <Info size={12} className="shrink-0 text-slate-400" />
                                                    Official residential record registered with Caloocan City. Contact your barangay office to request an update.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Section 2: CONTACT INFORMATION (Citizen Editable) ── */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                <Mail size={14} className="text-orange-500" />
                                                CONTACT INFORMATION
                                            </h4>
                                            <span className="text-[11px] font-semibold text-black dark:text-white bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 px-2.5 py-0.5 rounded-md shadow-2xs">
                                                Citizen Editable
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Email Field */}
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    {t('dashboard.profile.secureEmail', { defaultValue: 'Email Address' })}
                                                </label>

                                                {editingField === 'email' ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="email"
                                                            value={tempValues.email}
                                                            onChange={(e) => setTempValues({ ...tempValues, email: e.target.value })}
                                                            autoFocus
                                                            className="flex-1 bg-white dark:bg-slate-900 border border-orange-500 rounded-xl px-4 py-2.5 text-base sm:text-sm min-h-[44px] font-medium text-slate-900 dark:text-white outline-none ring-2 ring-orange-500/20"
                                                            placeholder="Enter your email"
                                                        />
                                                        <button
                                                            onClick={() => handleSaveField('email')}
                                                            disabled={updatingProfile}
                                                            className="px-3.5 py-2.5 min-h-[44px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 shrink-0 cursor-pointer"
                                                            title="Save Changes"
                                                        >
                                                            {updatingProfile ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
                                                            <span>Save</span>
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            disabled={updatingProfile}
                                                            className="px-3 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                                                            title="Cancel"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between shadow-xs">
                                                        <span className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{user.email || 'No email provided'}</span>
                                                        <button
                                                            onClick={() => handleStartEdit('email')}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-orange-400 dark:hover:ring-orange-500/50 transition-all ml-2 shrink-0 shadow-xs cursor-pointer"
                                                        >
                                                            <Edit3 size={13} />
                                                            <span>Edit</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mobile Number Field */}
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    {t('dashboard.profile.mobileNumber', { defaultValue: 'Mobile Number' })}
                                                </label>

                                                {editingField === 'phone' ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="tel"
                                                            value={tempValues.phone}
                                                            onChange={(e) => setTempValues({ ...tempValues, phone: e.target.value })}
                                                            autoFocus
                                                            className="flex-1 bg-white dark:bg-slate-900 border border-orange-500 rounded-xl px-4 py-2.5 font-mono text-base sm:text-sm min-h-[44px] font-semibold text-slate-900 dark:text-white outline-none ring-2 ring-orange-500/20"
                                                            placeholder="e.g. 09XXXXXXXXX"
                                                        />
                                                        <button
                                                            onClick={() => handleSaveField('phone')}
                                                            disabled={updatingProfile}
                                                            className="px-3.5 py-2.5 min-h-[44px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 shrink-0 cursor-pointer"
                                                            title="Save Changes"
                                                        >
                                                            {updatingProfile ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
                                                            <span>Save</span>
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            disabled={updatingProfile}
                                                            className="px-3 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                                                            title="Cancel"
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between shadow-xs">
                                                        <span className="font-mono text-[14px] font-semibold text-slate-900 dark:text-white tracking-wide truncate">{user.phone || 'No phone recorded'}</span>
                                                        <button
                                                            onClick={() => handleStartEdit('phone')}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-lg text-[12px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-orange-400 dark:hover:ring-orange-500/50 transition-all ml-2 shrink-0 shadow-xs cursor-pointer"
                                                        >
                                                            <Edit3 size={13} />
                                                            <span>Edit</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Civic Aperture Rotate & Crop Modal for Profile Photo */}
            {cropModalData && (
                <AvatarCropModal
                    isOpen={Boolean(cropModalData)}
                    imageSrc={cropModalData.imageSrc}
                    naturalWidth={cropModalData.naturalWidth}
                    naturalHeight={cropModalData.naturalHeight}
                    onClose={handleCloseCropModal}
                    onSave={handleSaveCroppedAvatar}
                    t={t}
                />
            )}

            {/* Logout Confirmation Dialog */}
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {isLogoutConfirmOpen && (
                            <div
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
                                onClick={() => setIsLogoutConfirmOpen(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    role="alertdialog"
                                    aria-modal="true"
                                    aria-labelledby="logout-title"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center select-none"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
                                        <LogOut size={22} />
                                    </div>
                                    <div>
                                        <h3 id="logout-title" className="text-base font-bold text-slate-900 dark:text-white">
                                            Are you sure you want to sign out?
                                        </h3>
                                    </div>
                                    <div className="flex gap-2.5 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsLogoutConfirmOpen(false)}
                                            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[44px]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsLogoutConfirmOpen(false);
                                                if (handleLogout) handleLogout();
                                            }}
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

            {/* Rate App Interactive Feedback Modal */}
            <AnimatePresence>
                {isRateModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
                        onClick={() => { setIsRateModalOpen(false); setRatingSubmitted(false); }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            role="dialog"
                            aria-modal="true"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 relative"
                        >
                            <button
                                type="button"
                                onClick={() => { setIsRateModalOpen(false); setRatingSubmitted(false); }}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                            {!ratingSubmitted ? (
                                <>
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900/60 flex items-center justify-center text-orange-500 mx-auto">
                                        <Star size={24} className="fill-orange-500 text-orange-500" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Rate PULSO Experience</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            How easy was it to file reports and track public repairs in Caloocan?
                                        </p>
                                    </div>
                                    <div className="flex justify-center gap-2 py-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRatingScore(star)}
                                                className="p-1 hover:scale-110 transition-transform cursor-pointer"
                                                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                                            >
                                                <Star
                                                    size={28}
                                                    className={`${star <= ratingScore ? 'fill-orange-500 text-orange-500' : 'text-slate-300 dark:text-slate-700'}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRatingSubmitted(true);
                                            if (showToast) showToast('Thank you for rating PULSO!');
                                        }}
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors cursor-pointer shadow-sm shadow-orange-500/20 min-h-[44px]"
                                    >
                                        Submit Feedback
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-4 space-y-2">
                                    <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Feedback Received!</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Thank you! Your feedback directly helps us improve municipal engineering services in Caloocan.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { setIsRateModalOpen(false); setRatingSubmitted(false); }}
                                        className="mt-2 py-2 px-5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer min-h-[44px]"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Contact & Support Modal */}
            {nativeContactSheet && isContactModalOpen && (
                <NativeBottomSheet title={contactTitle} description={contactDescription} closeLabel={contactCloseLabel} onDismiss={closeContact}>
                    <div className="space-y-3 pb-2">
                        {contactDetails}
                        {contactCloseButton}
                    </div>
                </NativeBottomSheet>
            )}
            <AnimatePresence>
                {!nativeContactSheet && isContactModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
                        onClick={closeContact}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            role="dialog"
                            aria-modal="true"
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 relative"
                        >
                            <button
                                type="button"
                                onClick={closeContact}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                                aria-label={contactCloseLabel}
                            >
                                <X size={18} />
                            </button>
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900/60 flex items-center justify-center text-orange-500 mx-auto">
                                <PhoneCall size={22} />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">{contactTitle}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {contactDescription}
                                </p>
                            </div>
                            {contactDetails}
                            {contactCloseButton}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>



            {/* About PULSO Modal */}
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {isAboutModalOpen && (
                            <div
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
                                onClick={() => setIsAboutModalOpen(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    role="dialog"
                                    aria-modal="true"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 relative"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setIsAboutModalOpen(false)}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
                                        aria-label="Close"
                                    >
                                        <X size={18} />
                                    </button>
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900/60 flex items-center justify-center text-orange-500 mx-auto">
                                        <Landmark size={24} />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">PULSO</h3>
                                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                            Version v2.4.0
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            City Engineering Department Management System
                                        </p>
                                    </div>
                                    <div className="space-y-2 pt-1 text-left text-xs">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Authority</div>
                                            <div className="font-semibold text-slate-800 dark:text-slate-200">Local Government Unit of Caloocan City</div>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Department</div>
                                            <div className="font-semibold text-slate-800 dark:text-slate-200">City Engineering Department (CED)</div>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Release Info</div>
                                            <div className="text-slate-700 dark:text-slate-300">Production Build • October 2026</div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">Civic Aperture Architecture v0.2</div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsAboutModalOpen(false)}
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[44px]"
                                    >
                                        Close
                                    </button>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </motion.div>
    );
};
export default ProfileView;
