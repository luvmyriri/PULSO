// Shared web/Android dashboard coordinator. Page views live in ./resident/.
// Preserve original module initialization and stylesheet order across extracted pages.
import { isReportPhotoRestricted } from '../utils/reportScreening';
import '../components/mobile/NativeAppHeader';
import '../components/mobile/NativeDashboardSearch';
import '../components/mobile/NativeBottomSheet';
import '../components/NotificationDropdown';
import { finishReportIntake, locationEvidence, submitReportIntake, recoverReportIntake } from '../utils/reportIntake';
import { reportDraftPrincipal } from '../utils/residentReportDraft';
import { getStoredUser } from '../utils/auth';
import '../utils/xlsxExport';
import { residentPublication } from '../utils/publicationAdapter';
import '../components/ResidentNotificationSettings';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import '@capacitor/app';
import { isNativeAndroid } from '../utils/appContext';
import { useAndroidBack } from '../utils/nativeAndroid';
import '../components/mobile/NativeAppUpdateButton';
import { useGovernmentData } from '../utils/governmentApi';
import { residentDashboardRoute, residentDashboardUrl, residentNotificationTarget } from '../utils/residentDashboardRoute';
import { motion, AnimatePresence } from 'framer-motion';
import '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import { Bell, User, XCircle, CheckCircle2, ChevronRight, X, WifiOff, ShieldCheck, Plus, Clock, Droplets, FileText, AlertTriangle, Map as MapIcon, ShieldAlert, Loader2, RotateCcw, HelpCircle } from 'lucide-react';
import '../components/PulseAIMarkdown';
import PulseAIChatWindow from '../components/PulseAIChatWindow';
import PulseAIIcon from '../components/common/PulseAIIcon';
import '../components/ReportHistoryCard';
import ReportDetailView from '../components/ReportDetailView';
import { useTheme } from '../contexts/ThemeContext';
import Swal from 'sweetalert2';
import '../components/Branding';
import { useTranslation } from 'react-i18next';
import { getAuthToken, getAuthUser, clearAuthSession, setAuthSession } from '../utils/authSession';
import { formatTicketId } from '../utils/reportWorkflow';
import { API_BASE_URL } from '../utils/apiBase';
import { getReportPhotoUrl } from '../utils/reportMedia';
import useReportPhotoPins from '../utils/useReportPhotoPins';
import '../components/ReportEvidenceImage';
import { apiFetch, dedupeFetch, checkServerHealth, logApiFailure } from '../utils/apiFetch';
import '../utils/mapsConfig';
import { reverseGeocodeLocation } from '../utils/reverseGeocode';
import ClaimReportModal from '../components/modals/ClaimReportModal';
import '../components/IDCameraModal';
import '../components/AvatarCropModal';
import '../components/maps/ReportDensityLayer';
import '../components/CaloocanBoundaryLayer';
import { getReportCategoryMeta } from '../components/NearbyIssuesMapModal';
import '../components/QuickReportWizardModal';
import '../config/boundaryStyle';
import '../components/UserMenu';
import '../components/LatestReportCard';
import '../components/HomeHeader';
import '../components/BrandHeader';
import '../components/SettingsRow';
import '../components/FlagIcons';
import { isInsideCaloocan } from '../data/caloocanBoundaries';
import caloocanBorderData from '../data/caloocan_border.json';
import '../utils/philippineAddress';
import '../utils/locationPrivacy';
import '../utils/greetingHelper';
import { validateProfanity } from '../utils/profanityFilter';
import { formatAddress, formatFriendlyNotice } from './resident/residentUtils';
import { DARK_CIVIC_MAP_STYLE, LIGHT_CIVIC_MAP_STYLE } from './resident/residentMapStyles';
import { QUICK_FUNCTIONS_DATA, NAV_ITEMS } from './resident/residentConstants';
import { LeftSidebar, TopNavigation } from './resident/ResidentNavigation';
import RoadIcon from './resident/RoadIcon';
import ResidentHomeView from './resident/ResidentHomePage';
import LguFeed from './resident/ResidentUpdatesPage';
import MyReports from './resident/ResidentReportsPage';
import ProfileView from './resident/ResidentAccountPage';
import SettingsView from './resident/ResidentSettingsPage';
import ResidentModals from './resident/ResidentModals';

function ResidentDashboard() {
    const { t, i18n } = useTranslation();
    const { theme, changeTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const dashboardRoute = residentDashboardRoute(location.search);
    const activeTab = dashboardRoute.tab;
    const setActiveTab = useCallback(tab => {
        navigate(residentDashboardUrl(tab, location.search));
    }, [navigate, location.search]);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

    const [claimModalInitialTicket, setClaimModalInitialTicket] = useState('');
    const [claimModalInitialToken, setClaimModalInitialToken] = useState('');


    // Contextual Claim Modal States & URL Parameter Deep-linking
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const claimTicketParam = searchParams.get('claim_ticket') || searchParams.get('claim_id');
        const claimTokenParam = searchParams.get('claim_token') || searchParams.get('token');
        if (claimTicketParam || claimTokenParam) {
            if (claimTicketParam) setClaimModalInitialTicket(claimTicketParam);
            if (claimTokenParam) setClaimModalInitialToken(claimTokenParam);
            setIsClaimModalOpen(true);
            setActiveTab('reports');
        }
    }, []);
    const [activeModal, setActiveModal] = useState(null); // 'file-report', 'post-details'
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [reportToCancel, setReportToCancel] = useState(null);
    const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
    useAndroidBack(isMoreMenuOpen, 20, () => setIsMoreMenuOpen(false));

    // Close mobile "More" menu on Escape key
    useEffect(() => {
        if (!isMoreMenuOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsMoreMenuOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMoreMenuOpen]);

    // Centralized modal cleanup: Ensures all report form states are reset whenever any modal is closed
    // (Handles X button, Cancel button, and Backdrop clicks)
    useEffect(() => {
        if (!activeModal) {
            setReportCategory(prev => (Array.isArray(prev) && prev.length === 0 ? prev : []));
            setAiFeedback(prev => (prev === null ? prev : null));
            setSelectedImage(prev => (prev === null ? prev : null));
            setReportNotes(prev => (prev === '' ? prev : ''));
            setGeocodingAddress(prev => (prev === false ? prev : false));
            if (geocodeRequest?.current !== undefined) {
                geocodeRequest.current += 1;
            }
        }
    }, [activeModal]);

    // Auth State - Initialize synchronously from session to prevent race conditions on reload
    const [token, setToken] = useState(() => getAuthToken());
    const [currentUser, setCurrentUser] = useState(() => getAuthUser());

    useEffect(() => {
        if (!token || !currentUser) {
            navigate('/login');
        }
    }, [token, currentUser, navigate]);

    const isHomeTab = activeTab === 'overview' || activeTab === 'home';
    const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);

    const { isLoaded, loadError } = useGoogleMaps();

    const [pulseRadius] = useState(0);

    const checkJurisdiction = (location) => {
        if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return true;
        const isIn = isInsideCaloocan(location.lat, location.lng);

        if (!isIn) {
            showToast(t('This location is outside Caloocan City jurisdiction.'));
        }
        return isIn;
    };

    const mapOptions = React.useMemo(() => ({
        styles: theme === 'dark' ? DARK_CIVIC_MAP_STYLE : LIGHT_CIVIC_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: 'greedy',
    }), [theme]);

    const iconCacheRef = useRef(typeof window !== 'undefined' && window.Map ? new window.Map() : new Map());

    // Memoized Google Maps Icon Object Cache to prevent MarkerF re-render flicker
    const getCachedIcon = (url, w, h, ax, ay) => {
        if (!window.google || !window.google.maps || !url) return undefined;
        const key = `${url}_${w}_${h}_${ax}_${ay}`;
        if (!iconCacheRef.current.has(key)) {
            iconCacheRef.current.set(key, {
                url: url,
                scaledSize: new window.google.maps.Size(w, h),
                anchor: new window.google.maps.Point(ax, ay)
            });
        }
        return iconCacheRef.current.get(key);
    };

    const [map, setMap] = useState(null);
    const [panorama, setPanorama] = useState(null);
    const [svLocation, setSvLocation] = useState(null);

    const handleStreetViewClick = (location) => {
        if (!location) {
            // Closing street view
            setSvLocation(null);
            return;
        }
        if (!window.google || !window.google.maps) {
            showToast('Google Maps not loaded yet.');
            return;
        }
        // Use StreetViewService to check availability first
        const sv = new window.google.maps.StreetViewService();
        sv.getPanorama({ location: { lat: location.lat, lng: location.lng }, radius: 100 }, (data, status) => {
            if (status === 'OK') {
                setSvLocation({ lat: location.lat, lng: location.lng });
            } else {
                showToast('No Street View available for this location.');
            }
        });
    };

    // Auto-clear panorama state isn't strictly needed as much here, but keep for cleanup
    useEffect(() => {
        if (panorama) {
            const visListener = panorama.addListener('visible_changed', () => {
                const nowVisible = panorama.getVisible();
                if (nowVisible) {
                    const pos = panorama.getPosition();
                    if (pos) {
                        setSvLocation({ lat: pos.lat(), lng: pos.lng() });
                    }
                } else {
                    setSvLocation(null);
                }
            });
            return () => window.google?.maps?.event?.removeListener(visListener);
        }
    }, [panorama]);

    const mainScrollRef = useRef(null);
    const tabScrollPositionsRef = useRef({});
    const [accountSubView, setAccountSubView] = useState('settings'); // 'settings' | 'profile-details'

    const scrollToDashboardTop = () => {
        const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
        window.scrollTo({ top: 0, behavior });
        mainScrollRef.current?.scrollTo({ top: 0, behavior });
    };

    const handleGoHome = () => {
        setIsMoreMenuOpen(false);
        if (activeModal) {
            setActiveModal(null);
        }
        if (setSelectedPost) setSelectedPost(null);
        if (setSelectedHazard) setSelectedHazard(null);
        setIsAIChatOpen(false);
        setAccountSubView('settings');
        setSelectedReportForDetails(null);
        setActiveTab('overview');
        scrollToDashboardTop();
    };

    const handleSetTab = (tab) => {
        setIsMoreMenuOpen(false);
        if (tab === 'map') {
            handleSetModal('map');
            return;
        }
        if (tab === 'overview' || tab === 'home') {
            handleGoHome();
            return;
        }
        if (tab === activeTab) {
            if (isNativeAndroid()) {
                tabScrollPositionsRef.current[tab] = 0;
                scrollToDashboardTop();
                return;
            }
            if (tab === 'reports') {
                setSelectedReportForDetails(null);
                setActiveTab('reports');
            }
            // If already on profile/settings, reset to top-level settings overview and scroll to top
            if (tab === 'profile' || tab === 'settings' || tab === 'account') {
                setAccountSubView('settings');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                if (mainScrollRef.current) {
                    mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                    mainScrollRef.current.scrollTop = 0;
                }
            }
            return;
        }

        if (tab !== 'overview' && tab !== 'home') {
            setIsAIChatOpen(false);
        }

        // Save current scroll position for activeTab (except profile/settings)
        const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        if (activeTab !== 'profile' && activeTab !== 'settings') {
            tabScrollPositionsRef.current[activeTab] = currentScrollY;
        }

        if (tab === 'profile' || tab === 'settings') {
            setAccountSubView('settings');
            tabScrollPositionsRef.current[tab] = 0;
        }
        if (activeModal === 'map') {
            setActiveModal(null);
        }
        setActiveTab(tab);

        // Always default to top (0) for profile settings
        const targetScrollY = (tab === 'profile' || tab === 'settings') ? 0 : (tabScrollPositionsRef.current[tab] || 0);
        requestAnimationFrame(() => {
            window.scrollTo({ top: targetScrollY, behavior: 'instant' });
            document.documentElement.scrollTop = targetScrollY;
            document.body.scrollTop = targetScrollY;
            if (mainScrollRef.current) {
                mainScrollRef.current.scrollTo({ top: targetScrollY, behavior: 'instant' });
                mainScrollRef.current.scrollTop = targetScrollY;
            }
        });
    };

    const [selectedImage, setSelectedImage] = useState(null);
    const fileInputRef = React.useRef(null);

    const handleSetModal = (modal) => {
        setIsMoreMenuOpen(false);
        if (modal === 'file-report') {
            setSelectedImage(null);
            setReportNotes('');
        }
        setActiveModal(modal);
    };
    const [selectedPost, setSelectedPost] = useState(null);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' });
    const [isIDCameraOpen, setIsIDCameraOpen] = useState(false);
    useAndroidBack(showSearchDropdown, 20, () => setShowSearchDropdown(false));

    const showToast = useCallback((message, type = 'success') => {
        // Robust check to prevent rendering objects as React children which crashes the UI
        const finalMsg = typeof message === 'string' ? message : (
            Array.isArray(message) && message[0]?.msg
                ? message[0].msg
                : JSON.stringify(message)
        );
        setToast({ message: finalMsg, type });
        setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
    }, []);

    const [lguUpdates, setLguUpdates] = useState([]);
    const [loadingAdvisories, setLoadingAdvisories] = useState(true);
    const [advisoriesError, setAdvisoriesError] = useState(null);
    const [advisoriesReloadKey, setAdvisoriesReloadKey] = useState(0);

    // Real User Data State (hoisted to precede loadData dependencies)
    const [user, setUser] = useState(() => {
        const authU = getAuthUser();
        return {
            name: authU?.first_name || authU?.preferences?.first_name || (authU?.full_name ? authU.full_name.split(' ')[0] : 'Resident'),
            firstName: authU?.first_name || authU?.preferences?.first_name || '',
            lastName: authU?.last_name || authU?.preferences?.last_name || '',
            first_name: authU?.first_name || authU?.preferences?.first_name || '',
            last_name: authU?.last_name || authU?.preferences?.last_name || '',
            fullName: authU?.full_name || 'Loading...',
            barangay: authU?.barangay || 'Loading...',
            email: authU?.email || '',
            phone: authU?.phone_number || '',
            memberSince: authU?.created_at ? new Date(authU.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'Loading...',
            trustScore: authU?.trust_score || 100,
            avatar: authU?.full_name ? authU.full_name.charAt(0).toUpperCase() : 'R',
            avatarPhoto: authU?.avatar_url || null,
            updatedAt: authU?.updated_at || null,
            preferences: authU?.preferences || {}
        };
    });
    const [updatingProfile, setUpdatingProfile] = useState(false);

    const [isServerUnreachable, setIsServerUnreachable] = useState(false);
    const [retryCountdown, setRetryCountdown] = useState(null);
    const [lastUpdatedTime, setLastUpdatedTime] = useState(null);
    const retryAttemptRef = useRef(0);
    const retryTimerRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const isFetchingDataRef = useRef(false);

    const fetchUser = useCallback(async (userId) => {
        if (!userId) return;
        return dedupeFetch(`user_${userId}`, async () => {
            try {
                const res = await apiFetch(`/api/users/${userId}`);
                if (res.ok && res.data) {
                    const data = res.data;
                    const nextUser = {
                        name: data.first_name || data.preferences?.first_name || (data.full_name ? data.full_name.split(' ')[0] : 'Resident'),
                        firstName: data.first_name || data.preferences?.first_name || '',
                        lastName: data.last_name || data.preferences?.last_name || '',
                        first_name: data.first_name || data.preferences?.first_name || '',
                        last_name: data.last_name || data.preferences?.last_name || '',
                        fullName: data.full_name || '',
                        address: formatAddress(data.address || ''),
                        barangay: data.barangay || '',
                        email: data.email || '',
                        phone: data.phone_number || '',
                        memberSince: new Date(data.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
                        trustScore: data.trust_score || 100,
                        avatar: data.full_name ? data.full_name.charAt(0).toUpperCase() : 'R',
                        avatarPhoto: data.avatar_url || null,
                        updatedAt: data.updated_at || null,
                        preferences: data.preferences || {}
                    };

                    try {
                        const currentStored = getAuthUser();
                        if (currentStored) {
                            setAuthSession(token, {
                                ...currentStored,
                                ...data,
                                avatar_url: data.avatar_url,
                                updated_at: data.updated_at
                            });
                        }
                    } catch (e) {
                        // silent fail on restricted environments
                    }

                    if (data.preferences) {
                        try {
                            if (data.preferences.theme) {
                                let prefTheme = data.preferences.theme;
                                if (prefTheme === 'system') {
                                    const effectiveTheme = localStorage.getItem('pulso_theme') || (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                                    prefTheme = effectiveTheme === 'dark' ? 'dark' : 'light';
                                    // Migrate system to explicit binary theme on account
                                    apiFetch(`/api/users/${userId}`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({
                                            preferences: {
                                                ...data.preferences,
                                                theme: prefTheme
                                            }
                                        })
                                    }).catch(() => {});
                                }
                                if (prefTheme === 'dark' || prefTheme === 'light') {
                                    const localTheme = localStorage.getItem('pulso_theme') || localStorage.getItem('theme');
                                    if (!localTheme || localTheme !== prefTheme) {
                                        changeTheme(prefTheme);
                                    }
                                }
                            }
                            if (data.preferences.language) {
                                let prefLang = data.preferences.language;
                                if (prefLang !== 'en' && prefLang !== 'tl') {
                                    prefLang = (prefLang.startsWith('tl') || prefLang.startsWith('fil')) ? 'tl' : 'en';
                                    apiFetch(`/api/users/${userId}`, {
                                        method: 'PATCH',
                                        body: JSON.stringify({
                                            preferences: {
                                                ...data.preferences,
                                                language: prefLang
                                            }
                                        })
                                    }).catch(() => {});
                                }
                                const localLang = localStorage.getItem('pulso_language') || localStorage.getItem('i18nextLng');
                                if (!localLang || localLang !== prefLang) {
                                    if (i18n?.changeLanguage) {
                                        i18n.changeLanguage(prefLang);
                                    }
                                    localStorage.setItem('pulso_language', prefLang);
                                    localStorage.setItem('i18nextLng', prefLang);
                                }
                            }
                            if (data.preferences.notifications_enabled !== undefined) {
                                localStorage.setItem('pulso_notifications_enabled', String(data.preferences.notifications_enabled));
                            }
                            if (data.preferences.notification_categories) {
                                localStorage.setItem('pulso_notification_categories', JSON.stringify(data.preferences.notification_categories));
                            }
                        } catch (prefErr) {
                            // ignore storage errors
                        }
                    }

                    setUser(prev => {
                        if (
                            prev.name === nextUser.name &&
                            prev.first_name === nextUser.first_name &&
                            prev.last_name === nextUser.last_name &&
                            prev.fullName === nextUser.fullName &&
                            prev.address === nextUser.address &&
                            prev.barangay === nextUser.barangay &&
                            prev.email === nextUser.email &&
                            prev.phone === nextUser.phone &&
                            prev.memberSince === nextUser.memberSince &&
                            prev.trustScore === nextUser.trustScore &&
                            prev.avatar === nextUser.avatar &&
                            prev.avatarPhoto === nextUser.avatarPhoto &&
                            prev.updatedAt === nextUser.updatedAt &&
                            JSON.stringify(prev.preferences) === JSON.stringify(nextUser.preferences)
                        ) {
                            return prev;
                        }
                        return nextUser;
                    });
                    return res;
                } else if (res.isServerUnreachable) {
                    logApiFailure(`/api/users/${userId}`, res);
                }
                return res;
            } catch (error) {
                console.error("PULSO: Error fetching user data:", error);
                return { ok: false, error };
            }
        });
    }, [token, i18n, changeTheme]);

    // New State for User Reports
    const [userReports, setUserReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [reportStatusFilter, setReportStatusFilter] = useState('all');
    const [selectedReportForDetails, setSelectedReportForDetails] = useState(null);
    // Fetch the notification's exact report, even when it is outside the first page.
    // A changed router search cancels the previous fetch and cannot show another report.
    const linkedReport = useGovernmentData(dashboardRoute.reportId ? `/api/reports/${dashboardRoute.reportId}` : null);
    const displayedReport = dashboardRoute.reportId ? linkedReport.data : selectedReportForDetails;
    const returnToReports = () => {
        setSelectedReportForDetails(null);
        setActiveTab('reports');
    };
    const openReportDetails = (report) => {
        setActiveModal(null);
        setReportStatusFilter('all');
        if (Number.isSafeInteger(Number(report.id)) && Number(report.id) > 0 && !report.is_sample && !report.is_offline_pending && !report.is_offline_draft) {
            setSelectedReportForDetails(null);
            navigate(residentDashboardUrl('reports', location.search, report.id));
        } else {
            setSelectedReportForDetails(report);
        }
    };

    const handleLogout = () => {
        clearAuthSession();
        window.location.href = '/login';
    };

    const handleSearch = (query) => {
        if (query) {
            showToast(`Searching for: ${query}`);
        }
    };

    const getIconForCategory = (category) => {
        const cat = (category || '').toLowerCase();
        if (cat.includes('public works') || cat.includes('road') || cat.includes('bridge')) return <RoadIcon size={18} className="text-orange-500" />;
        if (cat.includes('utilit') || cat.includes('water') || cat.includes('drain')) return <Droplets size={18} className="text-blue-500" />;
        if (cat.includes('advisory') || cat.includes('safety') || cat.includes('hazard')) return <ShieldAlert size={18} className="text-red-500" />;
        if (cat.includes('other')) return <HelpCircle size={18} className="text-purple-500" />;
        return <ShieldCheck size={18} className="text-slate-500" />;
    };

    const fetchUserReports = useCallback(async (userId) => {
        if (!userId) return;
        return dedupeFetch(`user_reports_${userId}`, async () => {
            try {
                const res = await apiFetch(`/api/reports/user/${userId}`);
                if (res.ok && Array.isArray(res.data)) {
                    setUserReports(prev => {
                        if (Array.isArray(prev) && prev.length === res.data.length) {
                            const unchanged = prev.every((p, i) => p.id === res.data[i]?.id && p.status === res.data[i]?.status && p.updated_at === res.data[i]?.updated_at);
                            if (unchanged) return prev;
                        }
                        return res.data;
                    });
                } else if (res.isServerUnreachable) {
                    logApiFailure(`/api/reports/user/${userId}`, res);
                }
                return res;
            } catch (error) {
                console.error("PULSO: Error fetching reports:", error);
                return { ok: false, error };
            } finally {
                setLoadingReports(false);
            }
        });
    }, []);

    const [publicReports, setPublicReports] = useState([]);
    const [publicReportsError, setPublicReportsError] = useState(false);

    const allAvailableReports = useMemo(() => {
        const map = new Map();
        (userReports || []).forEach(r => {
            if (r && (r.id || r.ticket_id)) map.set(r.ticket_id || r.id, r);
        });
        (publicReports || []).forEach(r => {
            const key = r.ticket_id || r.id;
            if (key && !map.has(key)) map.set(key, r);
        });
        return Array.from(map.values());
    }, [userReports, publicReports]);
    const [loadingPublicReports, setLoadingPublicReports] = useState(true);

    const fetchPublicReports = useCallback(async () => {
        return dedupeFetch('public_reports', async () => {
            setLoadingPublicReports(true);
            setPublicReportsError(false);
            try {
                const res = await apiFetch('/api/reports/public?limit=300');
                if (res.ok && Array.isArray(res.data)) {
                    const list = res.data;
                    setPublicReports(prev => {
                        if (Array.isArray(prev) && prev.length === list.length) {
                            const unchanged = prev.every((p, i) => p.id === list[i]?.id && p.status === list[i]?.status && p.updated_at === list[i]?.updated_at);
                            if (unchanged) return prev;
                        }
                        return list;
                    });
                } else {
                    setPublicReportsError(true);
                    setPublicReports([]);
                    if (res.isServerUnreachable) logApiFailure('/api/reports/public', res);
                }
                return res;
            } catch (error) {
                console.error("PULSO: Error fetching public reports:", error);
                setPublicReportsError(true);
                setPublicReports([]);
                return { ok: false, error };
            } finally {
                setLoadingPublicReports(false);
            }
        });
    }, []);

    const [notifications, setNotifications] = useState([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [notificationsError, setNotificationsError] = useState(null);
    const [notificationsHasMore, setNotificationsHasMore] = useState(false);
    const [loadingOlderNotifications, setLoadingOlderNotifications] = useState(false);
    const [olderNotificationsError, setOlderNotificationsError] = useState(null);

    const unreadCount = Array.isArray(notifications)
        ? notifications.filter(n => !n.is_read && !n.is_hidden).length
        : 0;
    const unreadBadgeText = unreadCount > 9 ? '9+' : String(unreadCount);
    const unreadNotificationsCount = unreadCount;
    const unreadNotificationsBadgeText = unreadBadgeText;

    // ── Separate Unread Counting for City Updates vs Personal Notifications ──
    const PULSO_VIEWED_UPDATES_STORAGE_KEY = 'pulso_viewed_announcements';

    const [viewedUpdateIds, setViewedUpdateIds] = useState(() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const stored = window.localStorage.getItem(PULSO_VIEWED_UPDATES_STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        return new Set(parsed.map(String));
                    }
                }
            }
        } catch (e) {
            console.warn('PULSO: Unable to read viewed announcements from storage', e);
        }
        return new Set();
    });

    // Mark an individual advisory/announcement as viewed
    const markUpdateAsViewed = useCallback((updateId) => {
        if (!updateId) return;
        const idStr = String(updateId);
        setViewedUpdateIds(prev => {
            if (prev.has(idStr)) return prev;
            const next = new Set(prev);
            next.add(idStr);
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(PULSO_VIEWED_UPDATES_STORAGE_KEY, JSON.stringify(Array.from(next)));
                }
            } catch (err) {
                console.warn('PULSO: Unable to save viewed announcements', err);
            }
            return next;
        });
    }, []);

    // Unread City Updates count (Calculated independently from personal notifications)
    const unreadUpdatesCount = useMemo(() => {
        if (!Array.isArray(lguUpdates) || lguUpdates.length === 0) return 0;
        const now = Date.now();
        const unviewed = lguUpdates.filter(u => {
            const uid = u?.id || u?.announcement_id || u?.advisory_id;
            if (!uid) return false;
            if (viewedUpdateIds.has(String(uid))) return false;
            // Only count advisories published within the last 14 days
            const dateStr = u.published_at || u.created_at;
            if (dateStr) {
                const pubTime = new Date(dateStr).getTime();
                if (!isNaN(pubTime) && (now - pubTime) > 14 * 24 * 60 * 60 * 1000) {
                    return false;
                }
            }
            return true;
        });
        return unviewed.length;
    }, [lguUpdates, viewedUpdateIds]);

    const unreadUpdatesBadgeText = unreadUpdatesCount > 9 ? '9+' : String(unreadUpdatesCount);

    // Automatically mark all loaded updates as viewed when visiting the 'updates' tab
    useEffect(() => {
        if (activeTab === 'updates' && Array.isArray(lguUpdates) && lguUpdates.length > 0) {
            setViewedUpdateIds(prev => {
                let changed = false;
                const next = new Set(prev);
                lguUpdates.forEach(u => {
                    const uid = u?.id || u?.announcement_id || u?.advisory_id;
                    if (uid && !next.has(String(uid))) {
                        next.add(String(uid));
                        changed = true;
                    }
                });
                if (changed) {
                    try {
                        if (typeof window !== 'undefined' && window.localStorage) {
                            window.localStorage.setItem(PULSO_VIEWED_UPDATES_STORAGE_KEY, JSON.stringify(Array.from(next)));
                        }
                    } catch (err) {
                        console.warn('PULSO: Unable to persist viewed announcements', err);
                    }
                    return next;
                }
                return prev;
            });
        }
    }, [activeTab, lguUpdates]);

    const fetchNotifications = useCallback(async (userId) => {
        if (!userId) return;
        return dedupeFetch(`notifications_${userId}`, async () => {
            setLoadingNotifications(true);
            setNotificationsError(null);
            try {
                const res = await apiFetch(`/api/notifications/user/${userId}?skip=0&limit=20`);
                if (res.ok && Array.isArray(res.data)) {
                    setNotificationsHasMore(res.data.length === 20);
                    setOlderNotificationsError(null);
                    setNotifications(prev => {
                        if (Array.isArray(prev) && prev.length === res.data.length) {
                            const unchanged = prev.every((p, i) => p.id === res.data[i]?.id && p.is_read === res.data[i]?.is_read);
                            if (unchanged) return prev;
                        }
                        return res.data;
                    });
                } else if (res.isServerUnreachable) {
                    logApiFailure(`/api/notifications/user/${userId}`, res);
                    setNotificationsError('Unable to load notifications.');
                } else {
                    setNotificationsError('Unable to load notifications.');
                }
                return res;
            } catch (error) {
                console.error("PULSO: Error fetching notifications:", error);
                setNotificationsError('Unable to load notifications.');
                return { ok: false, error };
            } finally {
                setLoadingNotifications(false);
            }
        });
    }, []);

    const fetchOlderNotifications = async () => {
        if (!currentUser?.id || !notificationsHasMore || loadingOlderNotifications || loadingNotifications) return;
        setLoadingOlderNotifications(true);
        setOlderNotificationsError(null);
        try {
            const res = await apiFetch(`/api/notifications/user/${currentUser.id}?skip=${notifications.length}&limit=20`);
            if (!res.ok || !Array.isArray(res.data)) throw new Error('Unable to load older notifications.');
            setNotifications(previous => {
                const seen = new Set(previous.map(item => item.id));
                return [...previous, ...res.data.filter(item => !seen.has(item.id))];
            });
            setNotificationsHasMore(res.data.length === 20);
        } catch {
            setOlderNotificationsError('Unable to load older notifications.');
        } finally {
            setLoadingOlderNotifications(false);
        }
    };

    const fetchAdvisories = useCallback(async () => {
        return dedupeFetch('advisories', async () => {
            setLoadingAdvisories(prev => (prev ? prev : true));
            try {
                const res = await apiFetch('/api/announcements?limit=50');
                if (res.ok && Array.isArray(res.data)) {
                    setAdvisoriesError(null);
                    setLguUpdates(prev => {
                        if (Array.isArray(prev) && prev.length === res.data.length) {
                            const unchanged = prev.every((p, i) => p.id === res.data[i]?.id && p.updated_at === res.data[i]?.updated_at);
                            if (unchanged) return prev;
                        }
                        return res.data.map(item => residentPublication(item));
                    });
                } else {
                    if (res.isServerUnreachable) {
                        logApiFailure('/api/advisories', res);
                        setAdvisoriesError(prev => (lguUpdates.length > 0 ? null : 'Advisories are temporarily unavailable.'));
                    } else {
                        setAdvisoriesError('Advisories are temporarily unavailable.');
                    }
                }
                return res;
            } catch (error) {
                console.error("PULSO: Error fetching advisories:", error);
                setAdvisoriesError('Advisories are temporarily unavailable.');
                return { ok: false, error };
            } finally {
                setLoadingAdvisories(false);
            }
        });
    }, [lguUpdates.length]);

    const handleMarkAllRead = async () => {
        if (!currentUser) return;
        // Immediate optimistic update: badge clears instantly and rows show as read
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        try {
            await apiFetch(`/api/notifications/user/${currentUser.id}/read`, {
                method: 'PATCH'
            });
        } catch (error) {
            console.error("Error marking notifications as read:", error);
        }
    };

    const handleNotificationClick = async (notif) => {
        const target = residentNotificationTarget(notif.target_url);
        if (target) {
            setShowNotifications(false);
            setActiveModal(null);
            setSelectedReportForDetails(null);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            linkedReport.reload();
            navigate(target);
            if (!notif.is_read) {
                try { await apiFetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' }); } catch { /* Reading the update remains available. */ }
            }
            return;
        }
        if (!notif.is_read) {
            // Immediate optimistic update: badge decrements by 1 instantly
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            try {
                await apiFetch(`/api/notifications/${notif.id}/read`, {
                    method: 'PATCH'
                });
            } catch (err) {
                console.error("Error marking notification as read:", err);
            }
        }

        if (notif.message && (notif.message.includes('PUL-') || notif.message.includes('RPT-'))) {
            setActiveTab('reports');
            setReportStatusFilter('all');
            showToast(`Viewing details for report status update`);
        } else {
            handleSetModal('all-notifications');
        }
        setShowNotifications(false);
    };

    const syncOfflineReports = useCallback(async () => {
        if (!navigator.onLine) return;
        try {
            const rawQueue = localStorage.getItem('pulso_offline_reports');
            if (!rawQueue) return;
            const queue = JSON.parse(rawQueue);
            if (!Array.isArray(queue) || queue.length === 0) return;

            const authToken = token || getAuthToken();
            const remaining = [];
            let syncedCount = 0;

            for (const item of queue) {
                try {
                    const formData = new FormData();
                    formData.append('category', item.category || 'Roads & Bridges');
                    formData.append('description', item.description || 'Citizen report from PULSO app.');
                    if (item.lat != null && !isNaN(item.lat)) formData.append('lat', String(item.lat));
                    if (item.lng != null && !isNaN(item.lng)) formData.append('lng', String(item.lng));
                    if (item.location_string) formData.append('location_string', item.location_string);
                    if (item.location_barangay) {
                        formData.append('location_barangay', item.location_barangay.replace(/^Barangay\s*/i, ''));
                    }

                    const res = await fetch(`${API_BASE_URL}/api/reports`, {
                        method: 'POST',
                        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
                        body: formData
                    });

                    if (res.ok) {
                        syncedCount++;
                        // Update state item to clear is_offline_pending flag
                        setUserReports(prev =>
                            Array.isArray(prev)
                                ? prev.map(p => p.id === item.id ? { ...p, is_offline_pending: false, is_offline_draft: false } : p)
                                : prev
                        );
                    } else if (res.status >= 500 || res.status === 502 || res.status === 503 || res.status === 504) {
                        remaining.push(item);
                    }
                } catch (_) {
                    remaining.push(item);
                }
            }

            if (remaining.length > 0) {
                localStorage.setItem('pulso_offline_reports', JSON.stringify(remaining));
            } else {
                localStorage.removeItem('pulso_offline_reports');
            }

            if (syncedCount > 0) {
                showToast(`Synchronized ${syncedCount} offline report(s) with City Engineering.`);
                if (currentUser?.id) fetchUserReports(currentUser.id);
            }
        } catch (_) {}
    }, [token, currentUser?.id, fetchUserReports, showToast]);

    const loadData = useCallback(async () => {
        if (isFetchingDataRef.current) return;
        if (!navigator.onLine) {
            setIsServerUnreachable(true);
            return;
        }

        isFetchingDataRef.current = true;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setRetryCountdown(null);

        const userId = currentUser?.id;
        try {
            const tasks = [fetchPublicReports()];
            if (userId) {
                tasks.push(
                    fetchUser(userId),
                    fetchAdvisories(),
                    fetchUserReports(userId),
                    fetchNotifications(userId)
                );
            }

            const results = await Promise.allSettled(tasks);
            const hasNetworkFailures = results.some(r => {
                if (r.status === 'rejected') return true;
                return r.value && r.value.ok === false && r.value.isServerUnreachable;
            });
            const hasSuccessfulData = results.some(r => r.status === 'fulfilled' && r.value?.ok === true);

            if (hasNetworkFailures && !hasSuccessfulData) {
                setIsServerUnreachable(true);
                const attempt = retryAttemptRef.current;
                const backoffDelays = [2, 5, 15]; // Bounded exponential backoff: 2s, 5s, 15s
                if (attempt < backoffDelays.length) {
                    const delaySec = backoffDelays[attempt];
                    retryAttemptRef.current = attempt + 1;
                    setRetryCountdown(delaySec);

                    let remaining = delaySec;
                    countdownIntervalRef.current = setInterval(() => {
                        remaining -= 1;
                        if (remaining <= 0) {
                            clearInterval(countdownIntervalRef.current);
                            setRetryCountdown(null);
                        } else {
                            setRetryCountdown(remaining);
                        }
                    }, 1000);

                    retryTimerRef.current = setTimeout(() => {
                        loadData();
                    }, delaySec * 1000);
                } else {
                    // Reached max retries (3), stop auto-polling until manual retry or online event
                    setRetryCountdown(null);
                }
            } else {
                setIsServerUnreachable(false);
                setRetryCountdown(null);
                retryAttemptRef.current = 0;
                setLastUpdatedTime(new Date());
                syncOfflineReports();
            }
        } catch (err) {
            console.error("PULSO: Error in loadData sequence:", err);
        } finally {
            isFetchingDataRef.current = false;
        }
    }, [currentUser?.id, fetchPublicReports, fetchUser, fetchAdvisories, fetchUserReports, fetchNotifications]);

    const handleManualRetry = useCallback(() => {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setRetryCountdown(null);
        retryAttemptRef.current = 0;
        loadData();
    }, [loadData]);

    useEffect(() => {
        loadData();

        // 30-second background poll only when healthy (prevents loop when server is unreachable)
        const interval = setInterval(() => {
            if (navigator.onLine && !isServerUnreachable && retryAttemptRef.current === 0) {
                loadData();
            }
        }, 30000);

        const handleOnline = async () => {
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            retryAttemptRef.current = 0;
            setRetryCountdown(null);
            const healthy = await checkServerHealth(4000);
            if (healthy) {
                loadData();
                syncOfflineReports();
            }
        };

        window.addEventListener('online', handleOnline);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [currentUser?.id, loadData, isServerUnreachable]);

    const [reportNotes, setReportNotes] = useState('');
    const [reportCategory, setReportCategory] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [submittingReport, setSubmittingReport] = useState(false);
    const [aiFeedback, setAiFeedback] = useState(null);
    const [reportLocation, setReportLocation] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [isTrackingLocation, setIsTrackingLocation] = useState(false);
    const locationWatchRef = useRef(null);
    const locationRequestRef = useRef(0);
    const lastGeocodedPositionRef = useRef(null);
    const [locatingStep, setLocatingStep] = useState(0);
    const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
    const [photoMetadata, setPhotoMetadata] = useState(null);
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [mapLayerType, setMapLayerType] = useState('roadmap'); // 'roadmap' | 'hybrid'
    const [mapCategoryFilter, setMapCategoryFilter] = useState('all');
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const [mapFilter, setMapFilter] = useState('Nearby'); // State for new map UI filter
    const [selectedHazard, setSelectedHazard] = useState(null); // Tracks the clicked map marker
    const [borderData, setBorderData] = useState(() => {
        try {
            const cached = sessionStorage.getItem('pulso_cached_boundary_v1');
            if (cached) return JSON.parse(cached);
        } catch {
            // fallback to bundled
        }
        return caloocanBorderData;
    });

    // Fetch live authoritative Caloocan barangay borders, fallback to bundled GeoJSON
    useEffect(() => {
        try {
            if (sessionStorage.getItem('pulso_cached_boundary_v1')) return;
        } catch {
            // non-fatal
        }

        apiFetch('/api/geo/caloocan-border', { timeout: 6000, skipAuth: true })
            .then(res => {
                if (res.ok && res.data?.features?.length > 0) {
                    setBorderData(res.data);
                    try {
                        sessionStorage.setItem('pulso_cached_boundary_v1', JSON.stringify(res.data));
                    } catch {
                        // ignore storage errors
                    }
                }
            })
            .catch(() => {
                // Keep bundled GeoJSON silently
            });
    }, []);

    const getCategoryColor = (category) => getReportCategoryMeta({ category }).color;

    // SVG Marker Pin Generator for Map Symbols
    // Beautiful Dynamic SVG Pin Generator (matching government DispatcherDashboard)
    const getMarkerSVG = (category, status, isSelected = false) => {
        let color = '#f97316'; // Default Active
        const cat = (category || '').toLowerCase();
        const isPublicFacility = (cat.includes('facility') || cat.includes('facilities') || cat.includes('building') || cat.includes('park') || cat.includes('court') || cat.includes('hall')) && !cat.includes('safety') && !cat.includes('works');

        if (status === 'resolved') color = '#22c55e';
        else if (status === 'pending' || status === 'unverified') color = '#ef4444';
        else if (status === 'rejected') color = '#64748b';
        else if (status === 'cancelled') color = '#0f172a';

        // Overwrite color for Public Facilities
        if (isPublicFacility) {
            color = isSelected ? '#4338ca' : '#6366f1';
        } else if (cat.includes('traffic') || cat.includes('sign')) {
            color = isSelected ? '#0891b2' : '#06b6d4';
        } else if (cat.includes('other')) {
            color = isSelected ? '#7c3aed' : '#8b5cf6';
        }

        let svgIcon = '';

        // Crisp, solid vector shapes corresponding to report classifications
        if (cat.includes('flood') || cat.includes('water') || cat.includes('drain')) {
            // Droplet
            svgIcon = `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>`;
        } else if (cat.includes('electric') || cat.includes('wire') || cat.includes('power') || cat.includes('light') || cat.includes('street')) {
            // Zap
            svgIcon = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>`;
        } else if (cat.includes('road') || cat.includes('pothole') || cat.includes('bridge') || cat.includes('infrastructure')) {
            // Hardhat / Cone
            svgIcon = `<path d="M12 2a6 6 0 0 0-6 6v2H4v2h16v-2h-2V8a6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4v2H8V8a4 4 0 0 1 4-4z" fill="white"/>`;
        } else if (isPublicFacility) {
            // Building/Facility icon
            svgIcon = `<path d="M4 22V4c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v18H4zm4-4h2v-2H8v2zm0-4h2v-2H8v2zm0-4h2V8H8v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V8h-2v2zm4 8h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V8h-2v2z" fill="white"/>`;
        } else if (cat.includes('traffic') || cat.includes('sign')) {
            // Traffic / Sign icon
            svgIcon = `<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z" fill="white"/>`;
        } else if (cat.includes('other')) {
            // Question mark icon
            svgIcon = `<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-2h2zm1.07-7.75l-.9.92C12.45 10.9 12 11.5 12 13h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41a2 2 0 1 0-4 0H7a4 4 0 1 1 8 0c0 .88-.36 1.68-.93 2.25z" fill="white"/>`;
        } else {
            // Alert triangle
            svgIcon = `<path d="M12 2L1 21h22L12 2zm0 3.5l7 13.5H5l7-13.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" fill="white"/>`;
        }

        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 46" width="40" height="46">
                <!-- Large Pin Body -->
                <path d="M20 44c0 0 16-15.5 16-24a16 16 0 0 0-32 0c0 8.5 16 24 16 24z" fill="${color}" stroke="#ffffff" stroke-width="2.5" filter="drop-shadow(0px 3px 2px rgba(0,0,0,0.3))" />
                <!-- Dark Inner Circle background -->
                <circle cx="20" cy="18" r="11" fill="rgba(0,0,0,0.18)"/>
                <!-- Centered White Icon -->
                <g transform="translate(10, 8) scale(0.8)">
                    ${svgIcon}
                </g>
            </svg>
        `.trim().replace(/\n/g, '').replace(/\s+/g, ' ');

        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
    };

    // Simulated data removal (simulatedHazards removed per request)

    // Distance Calculation Logic
    const getDistance = (loc1, loc2) => {
        if (!window.google || !window.google.maps || !window.google.maps.geometry) return null;
        const p1 = new window.google.maps.LatLng(loc1.lat, loc1.lng);
        const p2 = new window.google.maps.LatLng(loc2.lat, loc2.lng);
        return window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    };

    const formatDistance = (meters) => {
        if (meters === null) return "---";
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${((meters / 1000)).toFixed(1)}km`;
    };

    const processedHazards = React.useMemo(() => {
        const userReportKeys = new Set(
            (userReports || []).flatMap(ur => [
                ur.id != null ? String(ur.id) : null,
                ur.ticket_id ? String(ur.ticket_id) : null
            ]).filter(Boolean)
        );

        // Prioritize userReports so the resident's own full context is kept for their own reports,
        // followed by publicReports which provides all active pin locations from other residents.
        const combined = [...(userReports || []), ...(publicReports || [])];
        const seen = new Set();
        const uniqueReports = [];
        for (const r of combined) {
            const idKey = r.id != null ? String(r.id) : (r.ticket_id ? String(r.ticket_id) : (r.tracking_token || `${r.location_lat || r.lat}_${r.location_lng || r.lng}_${r.created_at || ''}`));
            if (!seen.has(idKey)) {
                seen.add(idKey);
                const isOwn = Boolean(
                    (currentUser?.id && (r.resident_id === currentUser.id || r.claimed_by_user_id === currentUser.id)) ||
                    (r.id != null && userReportKeys.has(String(r.id))) ||
                    (r.ticket_id && userReportKeys.has(String(r.ticket_id)))
                );
                uniqueReports.push({ ...r, isOwnReport: isOwn });
            }
        }

        const markers = uniqueReports.map(r => {
            const lat = parseFloat(r.location_lat || r.lat);
            const lng = parseFloat(r.location_lng || r.lng);

            const image = getReportPhotoUrl(r);

            const formattedTicket = formatTicketId(r.ticket_id, r.id);
            return {
                ...r,
                id: r.id || `report-${formattedTicket}`,
                ticket_id: formattedTicket,
                lat,
                lng,
                title: r.title || r.category || `Civic Concern - ${formattedTicket}`,
                description: r.description || '',
                notes: r.notes || '',
                category: r.category || r.ai_category || 'Others',
                raw_category: r.category || '',
                ai_category: r.ai_category || '',
                tags: r.tags || '',
                status: (r.status || 'pending').toLowerCase(),
                location: r.location_string || r.barangay || 'Caloocan City',
                location_string: r.location_string || (r.barangay ? `${r.barangay}, Caloocan City` : 'Caloocan City'),
                barangay: r.barangay || r.location_barangay || '',
                created_at: r.created_at || r.submitted_at || r.created_date || null,
                updated_at: r.updated_at || r.updated_date || r.created_at || r.submitted_at || null,
                image: image,
                photo_url: image,
                image_url: image,
                photos: image ? [image] : [],
                media_urls: image ? [image] : [],
                ai_urgency: r.ai_urgency || r.urgency,
                isOwnReport: Boolean(r.isOwnReport)
            };
        }).filter(r => !isNaN(r.lat) && !isNaN(r.lng));

        return markers.map(hazard => {
            const meters = (reportLocation?.lat && reportLocation?.lng)
                ? getDistance(reportLocation, { lat: hazard.lat, lng: hazard.lng })
                : null;
            return {
                ...hazard,
                dynamicDistance: meters == null ? null : formatDistance(meters),
                distanceValue: meters ?? 999999
            };
        }).sort((a, b) => a.distanceValue - b.distanceValue);
    }, [reportLocation, userReports, publicReports, isLoaded, currentUser?.id]);

    const publicHazards = React.useMemo(() => {
        const publicIds = new Set((publicReports || []).map(report => String(report.id)));
        return processedHazards.filter(report => publicIds.has(String(report.id)));
    }, [processedHazards, publicReports]);

    const heatmapPoints = React.useMemo(() => {
        if (!processedHazards || processedHazards.length === 0) return [];
        return processedHazards.map(h => ({
            lat: h.lat,
            lng: h.lng,
            weight: (h.status === 'pending' || h.ai_urgency === 'critical') ? 3 : 1
        }));
    }, [processedHazards]);

    const mapFilteredHazards = React.useMemo(() => {
        if (!mapCategoryFilter || mapCategoryFilter === 'all') return processedHazards;

        return processedHazards.filter(h => {
            const rawCat = (h.raw_category || h.category || '').toLowerCase();
            const aiCat = (h.ai_category || '').toLowerCase();
            const title = (h.title || '').toLowerCase();
            const desc = (h.description || '').toLowerCase();
            const notes = (h.notes || '').toLowerCase();
            const tags = (h.tags || '').toLowerCase();
            const fullText = `${rawCat} ${aiCat} ${title} ${desc} ${notes} ${tags}`;
            const target = mapCategoryFilter.toLowerCase();

            // Direct equality or containment
            if (rawCat === target || aiCat === target) return true;
            if (rawCat.includes(target) || aiCat.includes(target)) return true;

            switch (mapCategoryFilter) {
                case 'Water Supply & Distribution': {
                    if (rawCat.includes('water') || aiCat.includes('water') ||
                        rawCat.includes('drain') || aiCat.includes('drain') ||
                        rawCat.includes('flood') || aiCat.includes('flood') ||
                        rawCat.includes('maynilad') || aiCat.includes('maynilad')) return true;

                    const keywords = [
                        'water', 'tubig', 'baha', 'flood', 'flooding', 'drain', 'drainage', 'leak', 'tagas',
                        'pipe', 'tubo', 'sewage', 'sewer', 'canal', 'kanal', 'clog', 'barado',
                        'imburnal', 'manhole', 'maynilad', 'puddle', 'puddles', 'overflow', 'submerged'
                    ];
                    return keywords.some(k => fullText.includes(k));
                }

                case 'Power & Street Lighting': {
                    if (rawCat.includes('light') || aiCat.includes('light') ||
                        rawCat.includes('power') || aiCat.includes('power') ||
                        rawCat.includes('electric') || aiCat.includes('electric') ||
                        rawCat.includes('street light') || aiCat.includes('street light') ||
                        rawCat.includes('meralco') || aiCat.includes('meralco')) return true;

                    const keywords = [
                        'light', 'lighting', 'lamp', 'lamppost', 'poste', 'electric', 'electrical',
                        'power', 'kuryente', 'ilaw', 'wire', 'kawad', 'dark', 'dilim', 'bulb',
                        'meralco', 'transformer', 'blackout', 'outage', 'spark', 'sparking', 'post'
                    ];
                    return keywords.some(k => fullText.includes(k));
                }

                case 'Roads & Bridges': {
                    if (rawCat.includes('road') || aiCat.includes('road') ||
                        rawCat.includes('bridge') || aiCat.includes('bridge') ||
                        rawCat.includes('pothole') || aiCat.includes('pothole') ||
                        rawCat.includes('public works') || aiCat.includes('public works') ||
                        rawCat.includes('pavement') || aiCat.includes('pavement') ||
                        rawCat.includes('asphalt') || aiCat.includes('asphalt')) return true;

                    const keywords = [
                        'road', 'roads', 'bridge', 'bridges', 'tulay', 'pothole', 'lubak',
                        'pavement', 'asphalt', 'aspalto', 'semento', 'concrete', 'sidewalk',
                        'kalsada', 'daan', 'crack', 'cracked', 'bitak', 'sinkhole', 'curb',
                        'hump', 'deterioration', 'highway'
                    ];
                    return keywords.some(k => fullText.includes(k));
                }

                case 'Traffic & Road Signs': {
                    if (rawCat.includes('traffic') || aiCat.includes('traffic') ||
                        rawCat.includes('sign') || aiCat.includes('sign') ||
                        rawCat.includes('signal') || aiCat.includes('signal')) return true;

                    const keywords = [
                        'traffic', 'sign', 'signs', 'signage', 'signal', 'signals', 'stoplight',
                        'traffic light', 'lane', 'bollard', 'railing', 'marking', 'crosswalk',
                        'pedestrian', 'harang', 'barrier', 'tawiran', 'intersection', 'island'
                    ];
                    return keywords.some(k => fullText.includes(k));
                }

                case 'Public Safety & Hazards': {
                    if (rawCat.includes('safety') || aiCat.includes('safety') ||
                        rawCat.includes('hazard') || aiCat.includes('hazard') ||
                        rawCat.includes('emergency') || aiCat.includes('emergency') ||
                        rawCat.includes('waste') || aiCat.includes('waste')) return true;

                    const keywords = [
                        'safety', 'hazard', 'hazards', 'panganib', 'regulatory', 'security',
                        'emergency', 'danger', 'risk', 'collapsed', 'collapse', 'obstacle',
                        'tree', 'puno', 'debris', 'fire', 'sunog', 'waste', 'trash', 'garbage',
                        'basura', 'uncollected', 'dumi'
                    ];
                    return keywords.some(k => fullText.includes(k));
                }

                case 'Public Buildings & Facilities': {
                    if (rawCat.includes('facilit') || aiCat.includes('facilit') ||
                        rawCat.includes('building') || aiCat.includes('building') ||
                        rawCat.includes('park') || aiCat.includes('park') ||
                        rawCat.includes('court') || aiCat.includes('court') ||
                        rawCat.includes('gym') || aiCat.includes('gym') ||
                        rawCat.includes('hall') || aiCat.includes('hall')) return true;

                    const keywords = [
                        'facilit', 'facility', 'facilities', 'building', 'buildings', 'park', 'parks',
                        'playground', 'palaruan', 'library', 'school', 'paaralan', 'office',
                        'center', 'court', 'covered court', 'gym', 'gymnasium', 'hall',
                        'barangay hall', 'plaza', 'ring', 'basketball', 'market', 'palengke',
                        'clinic', 'health center', 'stage', 'sports'
                    ];
                    return keywords.some(k => fullText.includes(k));
                }

                case 'Others': {
                    if (rawCat.includes('other') || aiCat.includes('other') ||
                        rawCat.includes('misc') || aiCat.includes('misc') ||
                        rawCat.includes('general') || aiCat.includes('general') ||
                        rawCat.includes('infrastructure') || aiCat.includes('infrastructure') ||
                        rawCat.includes('uncategorized') || aiCat.includes('uncategorized')) return true;

                    // Fallback: If not matched by any other primary category, include in Others
                    const matchesWater = rawCat.includes('water') || aiCat.includes('water') || rawCat.includes('drain') || aiCat.includes('drain') || fullText.includes('water') || fullText.includes('drainage') || fullText.includes('baha') || fullText.includes('tubig');
                    const matchesPower = rawCat.includes('light') || aiCat.includes('light') || rawCat.includes('power') || aiCat.includes('power') || rawCat.includes('electric') || aiCat.includes('electric') || fullText.includes('light') || fullText.includes('kuryente') || fullText.includes('poste');
                    const matchesRoads = rawCat.includes('road') || aiCat.includes('road') || rawCat.includes('bridge') || aiCat.includes('bridge') || fullText.includes('road') || fullText.includes('pothole') || fullText.includes('lubak') || fullText.includes('bridge');
                    const matchesTraffic = rawCat.includes('traffic') || aiCat.includes('traffic') || rawCat.includes('sign') || aiCat.includes('sign') || fullText.includes('traffic') || fullText.includes('sign');
                    const matchesSafety = rawCat.includes('safety') || aiCat.includes('safety') || rawCat.includes('hazard') || aiCat.includes('hazard') || fullText.includes('safety') || fullText.includes('hazard');
                    const matchesFacilities = rawCat.includes('facilit') || aiCat.includes('facilit') || rawCat.includes('building') || aiCat.includes('building') || fullText.includes('building') || fullText.includes('court') || fullText.includes('hall');

                    return !(matchesWater || matchesPower || matchesRoads || matchesTraffic || matchesSafety || matchesFacilities);
                }

                default:
                    return rawCat.includes(target) || aiCat.includes(target) || fullText.includes(target);
            }
        });
    }, [processedHazards, mapCategoryFilter]);

    const photoPinIcons = useReportPhotoPins(processedHazards, getReportCategoryMeta);

    const stopDeviceLocationTracking = useCallback(() => {
        locationRequestRef.current++;
        if (locationWatchRef.current !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(locationWatchRef.current);
            locationWatchRef.current = null;
        }
        setIsTrackingLocation(false);
    }, []);

    const acceptDevicePosition = (position, isForced = false) => {
        const { latitude, longitude, accuracy } = position.coords || {};
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            setIsLocating(false);
            return;
        }
        // Don't degrade an already locked accurate fix with a jittery reading unless explicitly requested
        if (!isForced && reportLocation?.accuracy && Number.isFinite(accuracy) && accuracy > reportLocation.accuracy * 1.8) {
            setIsLocating(false);
            return;
        }
        const loc = {
            lat: latitude,
            lng: longitude,
            accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
            confirmed: true,
            source: 'device-gps',
            deviceFix: { latitude, longitude, accuracy_m: accuracy > 0 ? accuracy : null, measured_at: position.timestamp ? new Date(position.timestamp).toISOString() : null },
            timestamp: position.timestamp || Date.now()
        };
        setReportLocation(loc);
        setLocationPermissionDenied(false);
        setIsLocating(false);
        const previous = lastGeocodedPositionRef.current;
        const moved = !previous || Math.abs(previous.lat - latitude) > 0.0002 || Math.abs(previous.lng - longitude) > 0.0002;
        if (moved || isForced) {
            lastGeocodedPositionRef.current = loc;
            setLocationAddress('');
            setStructuredAddress(null);
            setPlusCode('');
            reverseGeocode(latitude, longitude);
        }
    };

    const requestDeviceLocation = (force = false) => {
        if (!navigator.geolocation) {
            setIsLocating(false);
            setLocationPermissionDenied(true);
            return;
        }
        const requestId = ++locationRequestRef.current;
        setIsLocating(true);
        setLocationPermissionDenied(false);
        navigator.geolocation.getCurrentPosition(
            position => {
                if (requestId === locationRequestRef.current) {
                    acceptDevicePosition(position, force);
                }
            },
            error => {
                if (requestId !== locationRequestRef.current) return;
                if (error?.code === 1) {
                    setIsLocating(false);
                    setLocationPermissionDenied(true);
                    return;
                }
                // Fallback to network/WiFi position if high-accuracy GPS hardware times out
                navigator.geolocation.getCurrentPosition(
                    fallbackPos => {
                        if (requestId === locationRequestRef.current) acceptDevicePosition(fallbackPos, force);
                    },
                    () => {
                        if (requestId === locationRequestRef.current) {
                            setIsLocating(false);
                            showToast('Could not refresh GPS. Choose the issue location on the map or retry.', 'info');
                        }
                    },
                    { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
                );
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
        );
    };

    const startDeviceLocationTracking = () => {
        if (!navigator.geolocation) {
            setLocationPermissionDenied(true);
            return;
        }
        stopDeviceLocationTracking();
        const requestId=++locationRequestRef.current;
        setIsLocating(true);
        setIsTrackingLocation(true);
        locationWatchRef.current = navigator.geolocation.watchPosition(
            position => {
                if(requestId===locationRequestRef.current)acceptDevicePosition(position);
            },
            error => {
                if(requestId!==locationRequestRef.current)return;
                setIsLocating(false);
                if (error?.code === 1) {
                    setLocationPermissionDenied(true);
                    stopDeviceLocationTracking();
                } else {
                    showToast(t(error?.code === 3 ? 'locationPrivacy.gpsTimeout' : error?.code === 2 ? 'locationPrivacy.gpsUnavailable' : 'locationPrivacy.gpsError'), 'info');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        if (activeModal === 'file-report') {
            requestDeviceLocation();
            startDeviceLocationTracking();
        } else {
            stopDeviceLocationTracking();
        }
        return () => {
            if (locationWatchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(locationWatchRef.current);
            locationWatchRef.current = null;
        };
    }, [activeModal, stopDeviceLocationTracking]);

    useEffect(() => {
        const stopWhenHidden = () => { if (document.visibilityState === 'hidden') stopDeviceLocationTracking(); };
        document.addEventListener('visibilitychange', stopWhenHidden);
        return () => document.removeEventListener('visibilitychange', stopWhenHidden);
    }, [stopDeviceLocationTracking]);

    // ── AI Triage Logic ───────────────────────────────────────────────────────

    // Auto-analyze report whenever image or notes change (debounced for notes)
    useEffect(() => {
        if (activeModal !== 'file-report') return;

        const timer = setTimeout(() => {
            if (selectedImage || (reportNotes && reportNotes.length > 20)) {
                handleAIAnalyze();
            }
        }, 1500); // 1.5s debounce for typing

        return () => clearTimeout(timer);
    }, [selectedImage, reportNotes, activeModal]);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // 1. Validate File Type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                showToast('Invalid file type. Please upload an image (JPG, PNG, or WebP).', 'error');
                return;
            }

            // 2. Validate File Size (Max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                showToast('File is too large. Maximum size allowed is 10MB.', 'error');
                return;
            }

            setSelectedImage(URL.createObjectURL(file));
            setAiFeedback(null);
        }
    };

    const handleAIAnalyze = async (forcedImage = null) => {
        if (isAnalyzing) return;
        setIsAnalyzing(true);
        try {
            const formData = new FormData();
            if (reportNotes) formData.append('description', reportNotes);

            const imgToUse = forcedImage || selectedImage;
            if (imgToUse) {
                let blob = null;
                if (imgToUse instanceof Blob) {
                    blob = imgToUse;
                } else if (typeof imgToUse === 'string' && (imgToUse.startsWith('blob:') || imgToUse.startsWith('data:'))) {
                    const response = await fetch(imgToUse);
                    blob = await response.blob();
                }
                if (blob) {
                    formData.append('image', blob, 'analysis.jpg');
                }
            }

            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_BASE_URL}/api/reports/analyze`, {
                method: 'POST',
                headers,
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setAiFeedback(data);

                if (isReportPhotoRestricted(data)) {
                    showToast(formatFriendlyNotice(data.rejection_reason), 'error');
                    setReportCategory([]);
                } else {
                    if (data.auto_description && !reportNotes) {
                        setReportNotes(data.auto_description);
                    }

                    // Map AI category to exact category keys to auto-select
                    const aiCat = (data.category || '').toLowerCase();
                    let mapped = [];

                    if (aiCat.includes('light') || aiCat.includes('electric') || aiCat.includes('power') || aiCat.includes('lamp') || aiCat.includes('street')) {
                        mapped.push('Power & Street Lighting');
                    } else if (aiCat.includes('traffic') || aiCat.includes('sign') || aiCat.includes('signal') || aiCat.includes('marking')) {
                        mapped.push('Traffic & Road Signs');
                    } else if (aiCat.includes('road') || aiCat.includes('bridge') || aiCat.includes('pothole') || aiCat.includes('asphalt') || aiCat.includes('pavement')) {
                        mapped.push('Roads & Bridges');
                    } else if (aiCat.includes('water') || aiCat.includes('drain') || aiCat.includes('flood') || aiCat.includes('canal') || aiCat.includes('sewer') || aiCat.includes('pipe') || aiCat.includes('manhole')) {
                        mapped.push('Water Supply & Distribution');
                    } else if (aiCat.includes('safety') || aiCat.includes('regulat') || aiCat.includes('hazard') || aiCat.includes('fire') || aiCat.includes('building') || aiCat.includes('debris') || aiCat.includes('tree')) {
                        mapped.push('Public Safety & Hazards');
                    } else if (aiCat.includes('facilit') || aiCat.includes('park') || aiCat.includes('hall') || aiCat.includes('court') || aiCat.includes('school') || aiCat.includes('gym')) {
                        mapped.push('Public Buildings & Facilities');
                    } else if (aiCat.includes('other') || aiCat.includes('unknown') || aiCat.includes('unclear') || aiCat.includes('misc')) {
                        mapped.push('Others');
                    }

                    if (mapped.length > 0) {
                        setReportCategory(mapped);
                    }
                }
            }
        } catch (err) {
            console.error("AI Analysis failed:", err);
        } finally {
            setIsAnalyzing(false);
        }
    };



    const [structuredAddress, setStructuredAddress] = useState(null);
    const [locationAddress, setLocationAddress] = useState('');
    const [plusCode, setPlusCode] = useState('');
    const [geocodingAddress, setGeocodingAddress] = useState(false);
    const geocodeRequest = useRef(0);

    const reverseGeocode = async (lat, lng) => {
        const requestId = ++geocodeRequest.current;
        setGeocodingAddress(true);
        const result = await reverseGeocodeLocation(lat, lng);
        if (requestId !== geocodeRequest.current) return;
        setStructuredAddress({ ...result.structuredAddress, lookupStatus: result.status });
        setLocationAddress(result.address);
        setPlusCode(result.structuredAddress.plusCode);
        setGeocodingAddress(false);
        // Do not persist geocoded addresses or precise Plus Codes in sessionStorage.
        try {
            sessionStorage.removeItem('pulso_user_address');
            sessionStorage.removeItem('pulso_user_plus_code');
            sessionStorage.removeItem('pulso_user_structured_address');
        } catch (_) {}
    };

    const handleFileReport = () => {
        if (!reportLocation || isNaN(reportLocation.lat) || isNaN(reportLocation.lng)) {
            showToast('Please pinpoint your location on the map.', 'warning');
            return;
        }
        if (reportCategory.length === 0) {
            showToast('Please select at least one issue category.', 'error');
            return;
        }
        if (reportCategory.includes('Others') && (!reportNotes || reportNotes.trim().length < 10)) {
            showToast('Please describe the issue in Additional Notes (minimum 10 characters) when "Others" is selected.', 'warning');
            return;
        }
        const reportNotesProfanity = validateProfanity(reportNotes);
        if (reportNotesProfanity.hasProfanity) {
            showToast(reportNotesProfanity.message || 'Please remove inappropriate words from your notes.', 'error');
            return;
        }
        if (!selectedImage) {
            showToast('Please capture photo evidence of the infrastructure issue before submitting.', 'error');
            return;
        }
        if (isReportPhotoRestricted(aiFeedback)) {
            showToast(formatFriendlyNotice(aiFeedback.rejection_reason) || 'Please upload a photo of the problem to submit your report.', 'error');
            return;
        }
        setIsSubmitConfirmOpen(true);
    };

    const handleQuickReportSubmit = async ({ recoverOnly=false, draftPrincipal, photo, photoFile, photoCapturedAt, photoProvenance, categories, notes, othersDescription, locationDetails, barangay, location, address }) => {
        const authToken=getAuthToken() || token;
        const expectedPrincipal=reportDraftPrincipal(authToken,currentUser);
        if(draftPrincipal&&expectedPrincipal!==draftPrincipal)throw new Error(t('residentDraft.accountChanged'));
        let result;
        if(recoverOnly)result=await recoverReportIntake({token:authToken,apiBase:API_BASE_URL,draftKey:'quick'});
        else {
        const labels = Array.isArray(categories) ? [...new Set(categories)].slice(0, 3) : [];
        if (!labels.length) throw new Error('Choose at least one category.');
        for (const value of [notes, othersDescription]) {
            const validation = validateProfanity(value || '', 'notes');
            if (validation.hasProfanity) throw new Error(validation.message || 'Please review the report wording.');
        }
        const issueLocation = location || reportLocation || {};
        const extra = [locationDetails?.subdivision, locationDetails?.houseNumber, locationDetails?.landmark].filter(Boolean).join(' · ');
        const description = [notes, othersDescription, extra].filter(Boolean).join(' · ') || 'Resident infrastructure observation for staff review.';
        const image = photoFile || (photo ? await (await fetch(photo)).blob() : null);
        result = await submitReportIntake({
            fields: {
                category: labels[0], categories: labels, description,
                lat: issueLocation.lat, lng: issueLocation.lng,
                location_string: address || locationAddress || '',
                location_barangay: barangay || structuredAddress?.barangay || '',
                location_metadata: locationEvidence(issueLocation, photoProvenance || { capturedAt: photoCapturedAt, source: photoFile?.pulsoCapture ? 'camera' : 'unknown', photoDeviceFix: photoFile?.pulsoCapture?.deviceFix }),
                submission_source: 'web_resident',
            }, image, token:authToken, apiBase: API_BASE_URL, draftKey: 'quick',
        });
        }
        if(reportDraftPrincipal(getAuthToken(),getStoredUser())!==expectedPrincipal)throw new Error('The active account changed. Recover this report when signed into its original account.');
        finishReportIntake('quick',authToken);
        setUserReports(prev => [{ ...result, lat: result.location_lat, lng: result.location_lng }, ...(prev || []).filter(r => r.id !== result.id)]);
        if (currentUser?.id) fetchUserReports(currentUser.id);
        showToast(t('reportIntelligence.received', 'Report received.'));
        return { success: true, trackingNumbers: [result.ticket_id], report: result };
    };

    const actuallySubmitReport = async () => {
        if (!reportLocation || isNaN(reportLocation.lat) || isNaN(reportLocation.lng)) return;
        setIsSubmitConfirmOpen(false);
        setSubmittingReport(true);
        try {
            const image = selectedImage ? await (await fetch(selectedImage)).blob() : null;
            await submitReportIntake({ fields: {
                categories: Array.isArray(reportCategory) ? reportCategory : String(reportCategory).split(',').map(c => c.trim()).filter(Boolean),
                description: reportNotes || 'Resident infrastructure observation for staff review.',
                lat: reportLocation.lat, lng: reportLocation.lng,
                location_string: locationAddress || '', location_barangay: structuredAddress?.barangay || '',
                location_metadata: locationEvidence(reportLocation, { capturedAt: photoMetadata?.capturedAt }),
                submission_source: 'web_resident',
            }, image, token, apiBase: API_BASE_URL, draftKey: 'legacy' });
            finishReportIntake('legacy', token);
            showToast(t('reportIntelligence.received'));
            setActiveModal(null);
            setActiveTab('reports');
            setReportNotes('');
            setSelectedImage(null);
            setPhotoMetadata(null);
            fetchUserReports(currentUser.id);
        } catch (error) {
            console.error("PULSO: Error submitting report:", error);
            showToast('Error connecting to server.', 'error');
        } finally {
            setSubmittingReport(false);
        }
    };

    const handleCancelReport = (reportId) => {
        setReportToCancel(reportId);
    };

    const confirmCancelReport = async (reportId) => {
        setReportToCancel(null);
        try {
            const authToken = token || getAuthToken();
            if (!authToken) {
                showToast("You must be logged in to retract a report.", 'error');
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/cancel`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                showToast('Report retracted successfully');
                if (currentUser) {
                    fetchUserReports(currentUser.id);
                }
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(err.detail || "Failed to cancel report", 'error');
            }
        } catch (error) {
            console.error("Error cancelling report:", error);
            showToast("Network error: Could not reach the server to cancel the report. Please try again.", 'error');
        }
    };



    const handleUpdateProfile = async (field, value) => {
        setUpdatingProfile(true);
        try {
            const payload = {};
            if (field === 'email') payload.email = value;
            if (field === 'phone') payload.phone_number = value;
            if (field === 'preferences') payload.preferences = value;

            const response = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                if (field !== 'preferences') {
                    showToast(`${field === 'email' ? 'Email' : 'Mobile Number'} updated successfully`);
                }
                fetchUser(currentUser.id); // Refresh user data
            } else {
                if (field !== 'preferences') {
                    showToast("Failed to update profile", 'error');
                }
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast("An error occurred", 'error');
        } finally {
            setUpdatingProfile(false);
        }
    };

    // ── Resident AI Assistant State & Persistent History ──────────────────────
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [isAIMaximized, setIsAIMaximized] = useState(false);
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiConversations, setAiConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(() => {
        const uid = currentUser?.id || user?.id;
        const stored = uid ? localStorage.getItem(`pulso_pulseai_active_conv_${uid}`) : null;
        return stored ? parseInt(stored, 10) : null;
    });
    const [isAIHistoryOpen, setIsAIHistoryOpen] = useState(false);
    const [loadingAIConversations, setLoadingAIConversations] = useState(false);
    const [deletingConversationId, setDeletingConversationId] = useState(null);

    const getInitialAIMessage = useCallback(() => ({
        role: 'assistant',
        text: `Hello, ${currentUser?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'}. I am **PULSEAI**, the official 24/7 assistant for Caloocan City's infrastructure and public services.\n\nHow can I help you today? You can ask about **how to file a report**, check your **report status**, inquire about **city emergency hotlines**, or view **active engineering advisories**.`
    }), [currentUser?.full_name, user?.name]);

    const [aiMessages, setAiMessages] = useState([
        {
            role: 'assistant',
            text: `Hello ${currentUser?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'}. I am **PULSEAI**, the official 24/7 assistant for Caloocan City's infrastructure and public services.\n\nHow can I help you today? You can ask about **how to file a report**, check your **report status**, inquire about **city emergency hotlines**, or view **active engineering advisories**.`
        }
    ]);
    const aiChatEndRef = React.useRef(null);
    const hasFetchedConversationsOnOpen = React.useRef(false);
    const aiSuggestionsScrollRef = React.useRef(null);
    const [canScrollAiLeft, setCanScrollAiLeft] = useState(false);
    const [canScrollAiRight, setCanScrollAiRight] = useState(true);

    const updateAiSuggestionsScroll = useCallback(() => {
        const el = aiSuggestionsScrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollAiLeft(scrollLeft > 2);
        setCanScrollAiRight(scrollLeft < scrollWidth - clientWidth - 2);
    }, []);

    const scrollAiSuggestions = (direction) => {
        const el = aiSuggestionsScrollRef.current;
        if (!el) return;
        const scrollAmount = 140;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
        setTimeout(updateAiSuggestionsScroll, 300);
    };

    useEffect(() => {
        if (isAIChatOpen && aiMessages.length === 1) {
            updateAiSuggestionsScroll();
            const timer = setTimeout(updateAiSuggestionsScroll, 120);
            window.addEventListener('resize', updateAiSuggestionsScroll);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateAiSuggestionsScroll);
            };
        }
    }, [isAIChatOpen, aiMessages.length, updateAiSuggestionsScroll]);

    const formatRelativeTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / (1000 * 60));
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    const fetchAIConversations = useCallback(async (silent = false) => {
        const uid = currentUser?.id || user?.id;
        if (!token || !uid) {
            setLoadingAIConversations(false);
            return;
        }
        if (!silent) setLoadingAIConversations(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/pulseai/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAiConversations(data.conversations || []);
            }
        } catch (err) {
            console.error("Failed to load PULSEAI conversations:", err);
        } finally {
            if (!silent) setLoadingAIConversations(false);
        }
    }, [token, currentUser?.id, user?.id]);

    const loadConversationMessages = useCallback(async (convId) => {
        if (!convId || !token) return;
        setIsAILoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/pulseai/conversations/${convId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    setAiMessages(data.messages.map(m => ({
                        role: m.role,
                        text: m.content,
                        created_at: m.created_at,
                        tool_name: m.tool_name
                    })));
                } else {
                    setAiMessages([getInitialAIMessage()]);
                }
                setActiveConversationId(convId);
                const uid = currentUser?.id || user?.id;
                if (uid) {
                    localStorage.setItem(`pulso_pulseai_active_conv_${uid}`, convId.toString());
                }
                setIsAIHistoryOpen(false);
            }
        } catch (err) {
            console.error("Failed to load conversation messages:", err);
            showToast("Could not load past conversation", 'error');
        } finally {
            setIsAILoading(false);
            setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [token, currentUser?.id, user?.id, getInitialAIMessage, showToast]);

    const handleStartNewChat = () => {
        setActiveConversationId(null);
        const uid = currentUser?.id || user?.id;
        if (uid) {
            localStorage.removeItem(`pulso_pulseai_active_conv_${uid}`);
        }
        setAiMessages([getInitialAIMessage()]);
        setIsAIHistoryOpen(false);
    };

    const handleDeleteConversation = async (convId, e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!convId || !token) return;

        const result = await Swal.fire({
            title: 'Delete Conversation?',
            text: 'This chat thread will be permanently deleted from your account per RA 10173 Right to Erasure.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ea580c',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            setDeletingConversationId(convId);
            const res = await fetch(`${API_BASE_URL}/api/pulseai/conversations/${convId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast("Conversation deleted");
                setAiConversations(prev => prev.filter(c => c.id !== convId));
                if (activeConversationId === convId) {
                    handleStartNewChat();
                }
            } else {
                showToast("Failed to delete conversation", 'error');
            }
        } catch {
            showToast("Network error deleting conversation", 'error');
        } finally {
            setDeletingConversationId(null);
        }
    };

    const handleClearAllConversations = async () => {
        if (!token) return;

        const result = await Swal.fire({
            title: 'Clear All Chat History?',
            text: 'Are you sure you want to delete all saved PULSEAI conversations? This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ea580c',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, clear all',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/pulseai/conversations`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast("All chat history cleared");
                setAiConversations([]);
                handleStartNewChat();
            } else {
                showToast("Failed to clear chat history", 'error');
            }
        } catch {
            showToast("Network error clearing history", 'error');
        }
    };

    // Auto-fetch conversations and restore active conversation when chat opens
    useEffect(() => {
        if (isAIChatOpen && token && (currentUser?.id || user?.id)) {
            if (!hasFetchedConversationsOnOpen.current) {
                hasFetchedConversationsOnOpen.current = true;
                fetchAIConversations();
                const uid = currentUser?.id || user?.id;
                const storedConvId = localStorage.getItem(`pulso_pulseai_active_conv_${uid}`);
                if (storedConvId) {
                    loadConversationMessages(parseInt(storedConvId, 10));
                }
            }
        } else if (!isAIChatOpen) {
            hasFetchedConversationsOnOpen.current = false;
        }
    }, [isAIChatOpen, token, currentUser?.id, user?.id, fetchAIConversations, loadConversationMessages]);

    const handleResidentAIChat = async (e, overrideQuery = null) => {
        if (e && e.preventDefault) e.preventDefault();
        const queryToSend = (overrideQuery || aiQuery).trim();
        if (!queryToSend || isAILoading) return;

        const userMsg = { role: 'user', text: queryToSend };
        setAiMessages(prev => [...prev, userMsg]);
        setAiQuery('');
        setIsAILoading(true);

        const uid = currentUser?.id || user?.id;
        const userName = currentUser?.full_name || user?.name || 'Resident';
        const userBrgy = currentUser?.barangay || user?.barangay || 'North Caloocan';

        // 1. Try persistent conversation if authenticated
        if (token && uid) {
            try {
                let convId = activeConversationId;
                if (!convId) {
                    const createRes = await fetch(`${API_BASE_URL}/api/pulseai/conversations`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ title: queryToSend.slice(0, 42) })
                    });
                    if (createRes.ok) {
                        const convData = await createRes.json();
                        convId = convData.id;
                        setActiveConversationId(convId);
                        localStorage.setItem(`pulso_pulseai_active_conv_${uid}`, convId.toString());
                    }
                }

                if (convId) {
                    const resp = await fetch(`${API_BASE_URL}/api/pulseai/conversations/${convId}/messages`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            query: queryToSend,
                            context: `Resident Portal. User: ${userName}, Barangay: ${userBrgy}. Active tab: ${activeTab}. The user is a citizen, NOT a staff member. Help them navigate PULSO, understand how to report issues, check their report status, learn about city services, evacuation routes, and local government procedures in Caloocan City North.`
                        })
                    });

                    if (resp.ok) {
                        const data = await resp.json();
                        setAiMessages(prev => [...prev, {
                            role: 'assistant',
                            text: data.response,
                            tool_name: data.assistant_message?.tool_name
                        }]);
                        fetchAIConversations(true);
                        setIsAILoading(false);
                        setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                        return;
                    }
                }
            } catch (err) {
                console.warn("Persistent conversation failed, trying fallback:", err);
            }
        }

        // 2. Unauthenticated or fallback to legacy assistant endpoint
        try {
            const resp = await fetch(`${API_BASE_URL}/api/ai/assistant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    query: queryToSend,
                    context: `Resident Portal. User: ${userName}, Barangay: ${userBrgy}. Active tab: ${activeTab}. The user is a citizen, NOT a staff member. Help them navigate PULSO, understand how to report issues, check their report status, learn about city services, evacuation routes, and local government procedures in Caloocan City North.`
                })
            });
            const data = await resp.json();
            setAiMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
        } catch {
            setAiMessages(prev => [...prev, {
                role: 'assistant',
                text: 'I am temporarily unable to connect to the PULSO network. For emergency services, please dial **911** (NDRRMC) or contact the **Caloocan Action Center** at **(02) 8288-8811**.'
            }]);
        } finally {
            setIsAILoading(false);
            setTimeout(() => aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    };

    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
    };

    const navItems = NAV_ITEMS(t);


    const quickFunctions = QUICK_FUNCTIONS_DATA(t).map(f => ({
        ...f,
        action: f.modal ? () => handleSetModal(f.modal) : () => handleSetTab(f.tab)
    }));

    const nativeHomeScreen = isNativeAndroid() && isHomeTab && !activeModal && !displayedReport && !dashboardRoute.reportId;
    return (
        <div data-native-system-bar-surface data-native-dashboard-home={nativeHomeScreen || undefined} className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col">
            {nativeHomeScreen && <div data-native-home-status-surface aria-hidden="true" />}

            {/* Global Toast Notification */}
            <AnimatePresence>
                {toast.message && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-8 left-1/2 -translate-x-1/2 z-[70] bg-slate-900 border border-slate-700/50 backdrop-blur-xl dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 text-sm whitespace-nowrap"
                    >
                        {toast.type === 'error' ? (
                            <X size={18} className="text-red-500 stroke-[3px]" />
                        ) : (
                            <CheckCircle2 size={18} className="text-green-500 stroke-[3px]" />
                        )}
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Offline Banner */}
            <AnimatePresence>
                {isOffline && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold shadow-md z-50 relative"
                    >
                        <WifiOff size={16} /> {t('dashboard.offline')}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Calm Server Unreachable Banner */}
            <AnimatePresence>
                {!isOffline && isServerUnreachable && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-medium z-50 relative backdrop-blur-md"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <span className="truncate">
                                {retryCountdown !== null
                                    ? `We can't reach PULSO right now. Retrying in ${retryCountdown}s...`
                                    : "We can't reach PULSO right now."}
                            </span>
                            {lastUpdatedTime && (
                                <span className="hidden md:inline text-amber-700/80 dark:text-amber-400/70 text-[11px]">
                                    (Saved data from {new Date(lastUpdatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleManualRetry}
                            className="shrink-0 ml-3 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <RotateCcw size={13} className="shrink-0" />
                            Retry Now
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Render Overlay Modals */}
            <ResidentModals
                setSelectedReportForDetails={openReportDetails}
                activeModal={activeModal}
                setActiveModal={setActiveModal}
                t={t}
                selectedPost={selectedPost}
                setSelectedPost={setSelectedPost}
                isLoaded={isLoaded}
                loadError={loadError}
                map={map}
                setMap={setMap}
                panorama={panorama}
                setPanorama={setPanorama}
                reportLocation={reportLocation}
                setReportLocation={setReportLocation}
                locationAddress={locationAddress}
                setLocationAddress={setLocationAddress}
                plusCode={plusCode}
                setPlusCode={setPlusCode}
                geocodingAddress={geocodingAddress}
                structuredAddress={structuredAddress}
                setStructuredAddress={setStructuredAddress}
                reportCategory={reportCategory}
                setReportCategory={setReportCategory}
                reportNotes={reportNotes}
                setReportNotes={setReportNotes}
                selectedImage={selectedImage}
                setSelectedImage={setSelectedImage}
                submittingReport={submittingReport}
                handleFileReport={handleFileReport}
                isSelectingLocation={isSelectingLocation}
                setIsSelectingLocation={setIsSelectingLocation}
                isIDCameraOpen={isIDCameraOpen}
                setIsIDCameraOpen={setIsIDCameraOpen}
                checkJurisdiction={checkJurisdiction}
                reverseGeocode={reverseGeocode}
                mapOptions={mapOptions}
                pulseRadius={pulseRadius}
                processedHazards={processedHazards}
                reportsLoading={loadingPublicReports}
                reportsError={publicReportsError}
                onRetryReports={fetchPublicReports}
                selectedHazard={selectedHazard}
                setSelectedHazard={setSelectedHazard}
                svLocation={svLocation}
                handleStreetViewClick={handleStreetViewClick}
                getIconForCategory={getIconForCategory}
                getMarkerSVG={getMarkerSVG}
                getCategoryColor={getCategoryColor}
                mapFilter={mapFilter}
                setMapFilter={setMapFilter}
                isAnalyzing={isAnalyzing}
                aiFeedback={aiFeedback}
                setAiFeedback={setAiFeedback}
                locationPermissionDenied={locationPermissionDenied}
                photoMetadata={photoMetadata}
                setPhotoMetadata={setPhotoMetadata}
                reportToCancel={reportToCancel}
                setReportToCancel={setReportToCancel}
                confirmCancelReport={confirmCancelReport}
                isSubmitConfirmOpen={isSubmitConfirmOpen}
                setIsSubmitConfirmOpen={setIsSubmitConfirmOpen}
                actuallySubmitReport={actuallySubmitReport}
                setZoomedImage={setZoomedImage}
                photoPinIcons={photoPinIcons}
                getCachedIcon={getCachedIcon}
                theme={theme}
                borderData={borderData}
                isLocating={isLocating}
                locatingStep={locatingStep}
                requestDeviceLocation={requestDeviceLocation}
                isTrackingLocation={isTrackingLocation}
                startDeviceLocationTracking={startDeviceLocationTracking}
                stopDeviceLocationTracking={stopDeviceLocationTracking}
                showHeatmap={showHeatmap}
                setShowHeatmap={setShowHeatmap}
                mapLayerType={mapLayerType}
                setMapLayerType={setMapLayerType}
                mapCategoryFilter={mapCategoryFilter}
                setMapCategoryFilter={setMapCategoryFilter}
                heatmapPoints={heatmapPoints}
                mapFilteredHazards={mapFilteredHazards}
                showToast={showToast}
                handleQuickReportSubmit={handleQuickReportSubmit}
                currentUser={currentUser}
                setActiveTab={setActiveTab}
                setIsAIChatOpen={setIsAIChatOpen}
            />

            {activeModal === 'all-notifications' && (
                <div
                    className="fixed inset-0 z-[1000] bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
                    onClick={() => setActiveModal(null)}
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('notificationCenter.title', 'Notifications')}
                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-[#ea580c] dark:text-[#ff6b00] flex items-center justify-center shrink-0">
                                    <Bell size={17} strokeWidth={2.2} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                        {t('notificationCenter.title', 'Notifications')}
                                    </h2>
                                    {unreadCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#ff6b00]/10 text-[#b83a00] dark:text-[#ff6b00] tabular-nums">
                                            {unreadCount} {t('common.unread', 'unread')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleMarkAllRead}
                                        className="text-xs font-semibold text-[#b83a00] dark:text-[#ff6b00] hover:underline px-2 py-1 rounded-md transition focus-visible:outline-2 focus-visible:outline-[#ff6b00]"
                                    >
                                        {t('notificationCenter.markAllRead', 'Mark all read')}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    aria-label="Close"
                                    onClick={() => setActiveModal(null)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:outline-2 focus-visible:outline-[#ff6b00]"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-2.5 flex-1 min-h-0">
                            {loadingNotifications ? (
                                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center">
                                    <Loader2 size={24} className="animate-spin text-orange-500 mb-2" />
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading notifications…</p>
                                </div>
                            ) : notificationsError ? (
                                <div className="py-10 text-center" role="alert">
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{t('notificationCenter.loadError', 'Unable to load notifications.')}</p>
                                    <button
                                        type="button"
                                        onClick={() => currentUser?.id && fetchNotifications(currentUser.id)}
                                        className="mt-3 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                    >
                                        {t('notificationCenter.tryAgain', 'Try again')}
                                    </button>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="py-12 text-center flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                                        <Bell size={22} strokeWidth={1.8} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                        {t('notificationCenter.empty', 'No notifications yet.')}
                                    </p>
                                </div>
                            ) : (
                                notifications.map(notif => {
                                    const textLower = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();
                                    const isResolved = textLower.includes('resolved') || textLower.includes('completed') || textLower.includes('repaired');
                                    const isRejected = textLower.includes('rejected') || textLower.includes('cancelled') || textLower.includes('could not be');
                                    const isWarning = textLower.includes('warning') || textLower.includes('alert') || textLower.includes('hazard');

                                    const tileColor = isRejected
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                        : isResolved
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : isWarning
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                        : 'bg-orange-500/10 text-[#ea580c] dark:text-[#ff6b00] border border-orange-500/20';

                                    const icon = isRejected
                                        ? <XCircle size={18} strokeWidth={2} />
                                        : isResolved
                                        ? <CheckCircle2 size={18} strokeWidth={2} />
                                        : isWarning
                                        ? <AlertTriangle size={18} strokeWidth={2} />
                                        : <FileText size={18} strokeWidth={2} />;

                                    return (
                                        <div
                                            key={notif.id}
                                            onClick={() => {
                                                handleNotificationClick(notif);
                                                setActiveModal(null);
                                            }}
                                            className={`group relative p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                                                notif.is_read
                                                    ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                                                    : 'bg-orange-50/40 dark:bg-slate-800/80 border-orange-200/70 dark:border-orange-500/30 hover:border-orange-300 shadow-2xs'
                                            } ${notif.is_hidden ? 'opacity-40' : ''}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Status Icon Tile */}
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tileColor}`}>
                                                    {icon}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 pr-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`text-[13.5px] sm:text-sm leading-snug truncate ${
                                                            notif.is_read
                                                                ? 'font-medium text-slate-700 dark:text-slate-300'
                                                                : 'font-semibold text-slate-950 dark:text-white'
                                                        }`}>
                                                            {notif.title}
                                                        </h3>
                                                        {!notif.is_read && (
                                                            <span className="w-2 h-2 rounded-full bg-[#ff6b00] shrink-0" aria-label="Unread" />
                                                        )}
                                                        {notif.is_hidden && (
                                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                                                Dismissed
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-3">
                                                        {notif.message}
                                                    </p>

                                                    <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <Clock size={12} className="text-slate-400 dark:text-slate-500" />
                                                            {formatRelativeTime(notif.created_at) || new Date(notif.created_at).toLocaleDateString()}
                                                        </span>

                                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                            {!notif.is_read && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleNotificationClick(notif);
                                                                    }}
                                                                    className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                                                                >
                                                                    Mark read
                                                                </button>
                                                            )}
                                                            {!notif.is_hidden && (
                                                                <button
                                                                    type="button"
                                                                    aria-label="Dismiss notification"
                                                                    onClick={async (e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_hidden: true } : n));
                                                                        try {
                                                                            const authToken = token || getAuthToken();
                                                                            await fetch(`${API_BASE_URL}/api/notifications/${notif.id}`, {
                                                                                method: 'DELETE',
                                                                                headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
                                                                            });
                                                                        } catch (err) {
                                                                            console.error("Delete error:", err);
                                                                        }
                                                                    }}
                                                                    className="text-[11px] font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                                                >
                                                                    Dismiss
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {!loadingNotifications && !notificationsError && notificationsHasMore && (
                                <div className="pt-2 text-center">
                                    {olderNotificationsError && <p role="alert" className="mb-2 text-xs text-red-600 dark:text-red-400">{t('notificationCenter.olderError', 'Unable to load older notifications.')}</p>}
                                    <button
                                        type="button"
                                        onClick={fetchOlderNotifications}
                                        disabled={loadingOlderNotifications}
                                        className="px-4 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-60"
                                    >
                                        {loadingOlderNotifications ? t('notificationCenter.loadingOlder', 'Loading older notifications…') : t('notificationCenter.loadOlder', 'Load older notifications')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Top Navigation */}
            {(!isNativeAndroid() || nativeHomeScreen) && <TopNavigation
                activeTab={activeTab}
                activeModal={activeModal}
                handleSetTab={handleSetTab}
                handleSetModal={handleSetModal}
                onGoHome={handleGoHome}
                isAIChatOpen={isAIChatOpen}
                setIsAIChatOpen={setIsAIChatOpen}
                theme={theme}
                changeTheme={changeTheme}
                showNotifications={showNotifications}
                setShowNotifications={setShowNotifications}
                notifications={notifications}
                setNotifications={setNotifications}
                handleMarkAllRead={handleMarkAllRead}
                handleNotificationClick={handleNotificationClick}
                loadingNotifications={loadingNotifications}
                notificationsError={notificationsError}
                onRetryNotifications={() => currentUser?.id && fetchNotifications(currentUser.id)}
                handleLogout={handleLogout}
                user={user}
                navItems={navItems}
                showToast={showToast}
                i18n={i18n}
                t={t}
                userReports={allAvailableReports}
                lguUpdates={lguUpdates}
                searchLoading={loadingReports || loadingAdvisories}
                searchUpdatesUnavailable={Boolean(advisoriesError)}
                processedHazards={processedHazards}
                setSelectedPost={setSelectedPost}
                setSelectedHazard={setSelectedHazard}
                setSelectedReportForDetails={openReportDetails}
                setReportStatusFilter={setReportStatusFilter}
                token={token}
                isSearchOpen={isHeaderSearchOpen}
                setIsSearchOpen={setIsHeaderSearchOpen}
            />}

            {/* Main Layout Grid (Responsive 2-Column Content + Sticky Side Nav) */}
            <main ref={mainScrollRef} className="flex-1 w-full flex flex-col relative">

                <div className="w-full px-0 flex flex-col lg:flex-row flex-1 items-start">

                    {/* Persistent Desktop Left Side Navigation Rail (≥1024px) - Follows when scrolling (Hidden when on Map page) */}
                    {activeModal !== 'map' && (
                        <aside className="shrink-0 hidden lg:block sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden border-r border-slate-200/80 dark:border-slate-800 self-start z-30 w-64 xl:w-72">
                            <LeftSidebar
                                user={user}
                                activeTab={activeTab}
                                activeModal={activeModal}
                                handleSetTab={handleSetTab}
                                handleSetModal={handleSetModal}
                                handleLogout={handleLogout}
                                t={t}
                                unreadCount={unreadCount}
                                unreadBadgeText={unreadBadgeText}
                                unreadUpdatesCount={unreadUpdatesCount}
                                unreadUpdatesBadgeText={unreadUpdatesBadgeText}
                            />
                        </aside>
                    )}

                    {/* Content switcher based on tabs */}
                    <div className="flex-1 min-w-0 w-full">
                        {(activeTab === 'overview' || activeTab === 'home') && (
                            <ResidentHomeView
                                user={user}
                                userReports={userReports}
                                loadingReports={loadingReports}
                                loadingPublicReports={loadingPublicReports}
                                publicReportsError={publicReportsError}
                                onRetryPublicReports={fetchPublicReports}
                                lguUpdates={lguUpdates}
                                loadingAdvisories={loadingAdvisories}
                                nearbyReports={publicHazards}
                                handleSetTab={handleSetTab}
                                setActiveModal={handleSetModal}
                                setSelectedPost={(post) => {
                                    if (post) {
                                        const uid = post.id || post.announcement_id || post.advisory_id;
                                        if (uid) markUpdateAsViewed(uid);
                                    }
                                    setSelectedPost(post);
                                }}
                                setReportCategory={setReportCategory}
                                unreadUpdatesCount={unreadUpdatesCount}
                                showToast={showToast}
                                t={t}
                            />
                        )}

                        {activeTab === 'reports' && (
                            <div className={`w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1550px] mx-auto ${
                                displayedReport
                                    ? 'pt-0 pb-6 px-0'
                                    : 'pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:pt-6 pb-32 lg:pb-8 px-[clamp(1rem,5vw,1.25rem)] lg:px-6'
                            }`}>
                                <h1 className="sr-only">{t('dashboard.sidebar.reports', { defaultValue: 'My reports' })}</h1>
                                {dashboardRoute.reportId && !displayedReport ? (
                                    <section className="p-6 space-y-4 text-slate-900 dark:text-slate-100" aria-live="polite">
                                        {linkedReport.loading ? <p role="status">{t('reportLink.loading', { defaultValue: 'Opening your report…' })}</p> : <>
                                            <p role="alert">{t('reportLink.error', { defaultValue: 'This report could not be opened. It may be unavailable, or your account may not have access.' })}</p>
                                            <button type="button" onClick={linkedReport.reload} className="min-h-11 px-4 border rounded-xl focus-visible:outline-3 focus-visible:outline-blue-600">{t('reportLink.retry', { defaultValue: 'Try again' })}</button>
                                        </>}
                                        <button type="button" onClick={returnToReports} className="min-h-11 px-4 underline focus-visible:outline-3 focus-visible:outline-blue-600">{t('reportLink.back', { defaultValue: 'Back to My reports' })}</button>
                                    </section>
                                ) : displayedReport ? (
                                    <ReportDetailView
                                        key={displayedReport.id}
                                        report={displayedReport}
                                        onBack={returnToReports}
                                        onRefreshReport={linkedReport.reload}
                                        onReportUpdated={(result) => {
                                            setUserReports(prev => prev.map(row => row.id === displayedReport.id ? { ...row, status: result.status } : row));
                                            setSelectedReportForDetails(prev => prev?.id === displayedReport.id ? { ...prev, status: result.status } : prev);
                                            linkedReport.reload();
                                        }}
                                        onOpenMap={(rep) => {
                                            handleSetModal('map');
                                            setSelectedPost(rep);
                                        }}
                                        onWithdrawReport={(rep) => handleCancelReport(rep)}
                                        setZoomedImage={setZoomedImage}
                                    />
                                ) : (
                                    <MyReports
                                        user={user}
                                        userReports={userReports}
                                        loadingReports={loadingReports}
                                        handleSetModal={handleSetModal}
                                        onOpenClaimModal={() => setIsClaimModalOpen(true)}
                                        containerVariants={containerVariants}
                                        setZoomedImage={setZoomedImage}
                                        reportStatusFilter={reportStatusFilter}
                                        setReportStatusFilter={setReportStatusFilter}
                                        handleCancelReport={handleCancelReport}
                                        onSelectReportForDetails={openReportDetails}
                                        onOpenMap={(rep) => {
                                            handleSetModal('map');
                                            setSelectedPost(rep);
                                        }}
                                        showToast={showToast}
                                        t={t}
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === 'updates' && (
                            <div className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1550px] mx-auto pb-32 lg:pb-8 pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:pt-6 px-[clamp(1rem,5vw,1.25rem)] lg:px-6">
                                <h1 className="sr-only">{t('dashboard.sidebar.updates', { defaultValue: 'Updates' })}</h1>
                                <LguFeed
                                    lguUpdates={lguUpdates}
                                    loadingAdvisories={loadingAdvisories}
                                    advisoriesError={advisoriesError}
                                    onRetryAdvisories={() => setAdvisoriesReloadKey(key => key + 1)}
                                    getIconForCategory={getIconForCategory}
                                    setSelectedPost={setSelectedPost}
                                    setActiveModal={setActiveModal}
                                    handleSetTab={handleSetTab}
                                    containerVariants={containerVariants}
                                    user={user}
                                    showToast={showToast}
                                    t={t}
                                />
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="w-full max-w-5xl xl:max-w-6xl mx-auto pb-28 sm:pb-32 lg:pb-8 pt-3 sm:pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:pt-6 px-3 sm:px-[clamp(1rem,5vw,1.25rem)] lg:px-6">
                                <h1 className="sr-only">{t('dashboard.sidebar.account', { defaultValue: 'Account' })}</h1>
                                <ProfileView
                                    user={user}
                                    setUser={setUser}
                                    handleUpdateProfile={handleUpdateProfile}
                                    updatingProfile={updatingProfile}
                                    containerVariants={containerVariants}
                                    userReports={userReports}
                                    showToast={showToast}
                                    handleLogout={handleLogout}
                                    handleSetModal={handleSetModal}
                                    t={t}
                                    i18n={i18n}
                                    subView={accountSubView}
                                    setSubView={setAccountSubView}
                                    token={token}
                                    currentUser={currentUser}
                                    fetchUser={fetchUser}
                                />
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="w-full max-w-4xl mx-auto pb-32 lg:pb-8 pt-3 sm:pt-6 px-3.5 sm:px-6">
                                <SettingsView
                                    user={user}
                                    handleLogout={handleLogout}
                                    containerVariants={containerVariants}
                                    token={token}
                                    showToast={showToast}
                                    t={t}
                                    onClearAIChatHistory={handleClearAllConversations}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ── Mobile Bottom Navigation Bar & More Pop-up Menu ── */}
            {(activeModal !== 'file-report' && !displayedReport && !dashboardRoute.reportId) && (
                <>
                    {/* ── Mobile "More" Pop-up Menu Modal / Bottom Sheet ── */}
                    <AnimatePresence>
                        {isMoreMenuOpen && (
                            <>
                                {/* Backdrop - Clean, unblurred dim overlay */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={() => setIsMoreMenuOpen(false)}
                                    className="lg:hidden fixed inset-0 z-50 bg-slate-900/25 dark:bg-black/45"
                                    aria-hidden="true"
                                />

                                {/* Pop-up Menu Card - Docked to right side and flush against bottom nav */}
                                <motion.div
                                    initial={{ opacity: 0, y: 14, x: 8 }}
                                    animate={{ opacity: 1, y: 0, x: 0 }}
                                    exit={{ opacity: 0, y: 14, x: 8 }}
                                    transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                                    style={isNativeAndroid() ? { bottom: 'calc(var(--pulso-native-nav-height) + var(--pulso-safe-bottom, 0px))' } : undefined}
                                    className="lg:hidden fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-0 z-[55] w-80 max-w-[calc(100vw-0.75rem)] bg-white dark:bg-slate-900 border-t border-l border-r-0 border-b-0 border-slate-200/90 dark:border-slate-800 shadow-[-8px_-6px_25px_rgba(0,0,0,0.15)] dark:shadow-[-8px_-6px_25px_rgba(0,0,0,0.4)] rounded-tl-2xl rounded-tr-none rounded-b-none p-3.5 overflow-hidden"
                                    role="dialog"
                                    aria-label="More navigation options"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800/80">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                            More Options
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsMoreMenuOpen(false)}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                            aria-label="Close menu"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="space-y-1.5" role="menu">
                                        {/* AI Assistant Option */}
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setIsMoreMenuOpen(false);
                                                setIsAIChatOpen(true);
                                            }}
                                            className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all text-left cursor-pointer group ${
                                                isAIChatOpen
                                                    ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-[#EA580C]'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-900 dark:text-slate-100 border border-transparent'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                                isAIChatOpen
                                                    ? 'bg-[#EA580C] text-white shadow-xs'
                                                    : 'bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] group-hover:scale-105'
                                            }`}>
                                                <PulseAIIcon size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold truncate flex items-center gap-1.5">
                                                    <span>AI Assistant</span>
                                                    {isAIChatOpen && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-[#EA580C] font-semibold">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                        </button>

                                        {/* Map Option */}
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setIsMoreMenuOpen(false);
                                                handleSetModal('map');
                                            }}
                                            className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all text-left cursor-pointer group ${
                                                activeModal === 'map'
                                                    ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-[#EA580C]'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-900 dark:text-slate-100 border border-transparent'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                                activeModal === 'map'
                                                    ? 'bg-[#EA580C] text-white shadow-xs'
                                                    : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-105'
                                            }`}>
                                                <MapIcon size={20} strokeWidth={2.2} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold truncate flex items-center gap-1.5">
                                                    <span>Barangay Map</span>
                                                    {activeModal === 'map' && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-[#EA580C] font-semibold">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                        </button>

                                        {/* Account Option */}
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setIsMoreMenuOpen(false);
                                                if (activeModal === 'map') setActiveModal(null);
                                                handleSetTab('profile');
                                            }}
                                            className={`w-full flex items-center gap-3.5 p-3 rounded-xl transition-all text-left cursor-pointer group ${
                                                activeTab === 'profile' && activeModal !== 'map'
                                                    ? 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-[#EA580C]'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-900 dark:text-slate-100 border border-transparent'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                                activeTab === 'profile' && activeModal !== 'map'
                                                    ? 'bg-[#EA580C] text-white shadow-xs'
                                                    : 'bg-orange-50 dark:bg-orange-950/50 text-[#EA580C] group-hover:scale-105'
                                            }`}>
                                                <User size={20} strokeWidth={2.2} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold truncate flex items-center gap-1.5">
                                                    <span>Account & Profile</span>
                                                    {activeTab === 'profile' && activeModal !== 'map' && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-[#EA580C] font-semibold">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>

                    <nav
                        data-resident-bottom-nav
                        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] min-h-[4.25rem] sm:min-h-[4.5rem] h-[calc(4.25rem+env(safe-area-inset-bottom,0px))] px-3 sm:px-6 flex items-center justify-around select-none w-full"
                        style={{ paddingBottom: isNativeAndroid() ? 'var(--pulso-safe-bottom, 0px)' : 'env(safe-area-inset-bottom, 0px)', height: isNativeAndroid() ? 'calc(var(--pulso-native-nav-height) + var(--pulso-safe-bottom, 0px))' : undefined }}
                    >
                        {navItems.map((item) => {
                            if (item.id === 'report') {
                                return (
                                    <button
                                        key="report"
                                        type="button"
                                        onClick={() => handleSetModal('file-report')}
                                        className="flex flex-col items-center justify-center -mt-1 sm:-mt-1.5 px-2 sm:px-3 group focus:outline-none cursor-pointer shrink-0"
                                        aria-label="Report an issue"
                                    >
                                        <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#ff6b00] hover:bg-[#e65c00] active:scale-95 text-white shadow-md shadow-orange-500/25 flex items-center justify-center border-[3px] border-white dark:border-slate-900 transition-all group-hover:scale-105">
                                            <Plus size={24} strokeWidth={2.8} />
                                        </div>
                                    </button>
                                );
                            }

                            const isMoreItem = item.id === 'more';
                            const isActive = isMoreItem
                                ? (isMoreMenuOpen || activeModal === 'map' || activeTab === 'profile')
                                : ((item.id === 'overview' && (activeTab === 'overview' || activeTab === 'home')) || activeTab === item.id) && activeModal !== 'map' && activeTab !== 'profile';
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (isMoreItem) {
                                            if (isNativeAndroid() && ['profile', 'settings', 'account'].includes(activeTab) &&
                                                (window.scrollY > 0 || mainScrollRef.current?.scrollTop > 0)) {
                                                handleSetTab(activeTab);
                                            } else setIsMoreMenuOpen(prev => !prev);
                                        } else {
                                            setIsMoreMenuOpen(false);
                                            handleSetTab(item.id);
                                        }
                                    }}
                                    aria-current={isActive ? 'page' : undefined}
                                    aria-expanded={isMoreItem ? isMoreMenuOpen : undefined}
                                    aria-haspopup={isMoreItem ? 'dialog' : undefined}
                                    className={`flex flex-col items-center justify-center flex-1 py-1 px-1 sm:px-2 min-h-[48px] rounded-xl transition-all duration-200 relative group active:scale-95 cursor-pointer ${
                                        isActive
                                            ? 'text-[#D95700] dark:text-[#FF6B00] font-bold'
                                            : 'text-[#5B6B88] dark:text-[#9AA8C7] hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <div className="relative flex items-center justify-center">
                                        {React.cloneElement(item.icon, {
                                            size: 21,
                                            'aria-hidden': 'true',
                                            className: `transition-transform duration-200 ${isActive ? 'stroke-[2.5px] scale-110 text-[#D95700] dark:text-[#FF6B00]' : 'text-[#5B6B88] dark:text-[#9AA8C7]'}`
                                        })}

                                    </div>
                                    <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[64px] ${isActive ? 'font-bold text-[#D95700] dark:text-[#FF6B00]' : 'font-medium text-[#5B6B88] dark:text-[#9AA8C7]'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </>
            )}

            {/* ── Unified PULSEAI Assistant Window (Resident Role) ── */}
            <PulseAIChatWindow
                isOpen={isAIChatOpen}
                onClose={() => setIsAIChatOpen(false)}
                role="resident"
                currentUser={currentUser || user}
            />

            {/* ── Floating AI FAB Button (Website / Desktop only, removed on mobile and hidden on map) ── */}
            {(activeModal !== 'map' && activeModal !== 'file-report') && (
                <div className="fixed bottom-3 sm:bottom-4 right-6 z-[60] hidden md:block">
                    <motion.button
                        onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative w-14 h-14 rounded-full bg-[#f05a00] hover:bg-[#d94e00] shadow-xl shadow-orange-500/40 flex items-center justify-center text-white cursor-pointer"
                        title="PULSEAI"
                        aria-label="Toggle PULSEAI"
                    >
                        <AnimatePresence>
                            {!isAIChatOpen && (
                                <motion.span
                                    key="pulse"
                                    className="absolute inset-0 rounded-full bg-orange-400 opacity-60"
                                    animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
                                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                                />
                            )}
                        </AnimatePresence>
                        {isAIChatOpen ? <X size={22} className="text-white" /> : <PulseAIIcon size={36} />}
                    </motion.button>
                </div>
            )}


            {/* ── Image Zoom Overlay ── */}
            <AnimatePresence>
                {zoomedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setZoomedImage(null)}
                        className="fixed inset-0 z-[1000] bg-white/60 dark:bg-black/60 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-12 cursor-zoom-out"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative max-w-5xl w-full h-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={zoomedImage}
                                alt="Inspection"
                                className="max-w-full max-h-[85vh] sm:max-h-full object-contain rounded-2xl shadow-2xl border border-slate-200/50 dark:border-white/15"
                            />
                            <button
                                onClick={() => setZoomedImage(null)}
                                className="absolute top-[max(1rem,env(safe-area-inset-top,0px))] right-4 bg-slate-900/80 hover:bg-slate-900 dark:bg-black/70 dark:hover:bg-black/90 text-white p-3 rounded-full backdrop-blur-md transition-colors border border-white/20 shadow-xl cursor-pointer"
                                aria-label="Close photo preview"
                            >
                                <X size={22} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Contextual Claim Guest Report Modal ── */}
            <ClaimReportModal
                isOpen={isClaimModalOpen}
                onClose={() => setIsClaimModalOpen(false)}
                onSuccess={() => {
                    if (currentUser?.id) {
                        fetchUserReports(currentUser.id);
                    }
                }}
                initialTicketId={claimModalInitialTicket}
                initialTrackingToken={claimModalInitialToken}
                token={token}
            />
        </div>
    );
}

export default ResidentDashboard;
export { formatAddress, formatFriendlyNotice, isLocalDevHost, exportReportsToXLSX, exportReportsToCSV } from './resident/residentUtils';
export { buildFullAvatarUrl, UserAvatar } from './resident/ResidentAvatar';
export { CALOOCAN_SCOPE_AREAS, CALOOCAN_ALL_AREAS } from './resident/ResidentUpdatesPage';
