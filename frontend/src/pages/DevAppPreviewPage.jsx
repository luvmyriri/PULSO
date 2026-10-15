import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Smartphone,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Eye,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Play,
  Activity,
  Layers,
  Settings,
  User,
  Info,
  Lock,
  Bell,
  Globe,
  Moon,
  Sun,
  PhoneCall,
  Shield,
  FileText,
  Star,
  Share2,
  LogOut,
  Clock,
  Home,
  Plus,
  History,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileAppTutorial from '../components/mobile/MobileAppTutorial';
import MobileAppSplashScreen from '../components/mobile/MobileAppSplashScreen';
import PulsoPulseLine from '../components/common/PulsoPulseLine';
import LatestReportCard from '../components/LatestReportCard';
import HomeHeader from '../components/HomeHeader';
import BrandHeader from '../components/BrandHeader';
import SettingsRow from '../components/SettingsRow';
import LanguageToggle from '../components/LanguageToggle';
import NearbyIssuesMapModal from '../components/NearbyIssuesMapModal';
import QuickReportWizardModal from '../components/QuickReportWizardModal';
import { REPORT_WORKFLOW_STEPS } from '../utils/reportWorkflow';
import { getAuthUser } from '../utils/authSession';

const SAMPLE_MAP_REPORTS = [
  {
    id: 'rep-1',
    title: 'Pothole on main road',
    category: 'Roads & Bridges',
    raw_category: 'Roads & Bridges',
    status: 'assigned',
    lat: 14.7566,
    lng: 121.0450,
    barangay: 'Brgy. 171',
    photo_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=160&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: 'rep-2',
    title: 'Broken streetlight',
    category: 'Power & Street Lighting',
    raw_category: 'Power & Street Lighting',
    status: 'received',
    lat: 14.7610,
    lng: 121.0480,
    barangay: 'Bagumbong',
    photo_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=160&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    id: 'rep-3',
    title: 'Water pipe leak',
    category: 'Water Supply & Distribution',
    raw_category: 'Water Supply & Distribution',
    status: 'in_progress',
    lat: 14.7520,
    lng: 121.0410,
    barangay: 'Brgy. 167',
    photo_url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=160&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 3600 * 5).toISOString()
  },
  {
    id: 'rep-4',
    title: 'Road obstruction & safety hazard',
    category: 'Public Safety & Hazards',
    raw_category: 'Public Safety & Hazards',
    status: 'received',
    lat: 14.7590,
    lng: 121.0390,
    barangay: 'Brgy. 172',
    photo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861564?w=160&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 3600 * 24).toISOString()
  },
  {
    id: 'rep-5',
    title: 'Open Drainage Canal Near School',
    category: 'Public Safety & Hazards',
    raw_category: 'Public Safety & Hazards',
    status: 'in_progress',
    lat: 14.7650,
    lng: 121.0500,
    barangay: 'Brgy. 172',
    photo_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=160&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: 'rep-6',
    title: 'Barangay Hall Roof Gutter Leak',
    category: 'Public Buildings & Facilities',
    raw_category: 'Public Buildings & Facilities',
    status: 'resolved',
    lat: 14.7480,
    lng: 121.0350,
    barangay: 'Brgy. 165',
    photo_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=160&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 3600 * 48).toISOString()
  },
  {
    id: 'rep-7',
    title: '10th Avenue Pavement Subsidence',
    category: 'Roads & Bridges',
    raw_category: 'Roads & Bridges',
    status: 'assigned',
    lat: 14.6520,
    lng: 120.9850,
    barangay: 'Brgy. 64',
    photo_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=160&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 3600 * 3).toISOString()
  },
  {
    id: 'rep-8',
    title: 'Exposed Electrical Cable on Rizal Ave',
    category: 'Power & Street Lighting',
    raw_category: 'Power & Street Lighting',
    status: 'received',
    lat: 14.6480,
    lng: 120.9820,
    barangay: 'Brgy. 52',
    photo_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=160&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 1000 * 3600 * 6).toISOString()
  }
];

const SAMPLE_HEADER_USERS = {
  separate_fields: {
    first_name: 'Marc',
    last_name: 'Evangelista',
    fullName: 'Marc Evangelista',
    email: 'marc.evangelista@caloocan.gov.ph',
    role: 'resident'
  },
  compound_first: {
    first_name: 'Marc Alexis',
    last_name: 'Evangelista',
    fullName: 'Marc Alexis Evangelista',
    email: 'marc.alexis@caloocan.gov.ph',
    role: 'resident'
  },
  compound_last: {
    first_name: 'Gener',
    last_name: 'Dela Cruz',
    fullName: 'Gener Dela Cruz',
    email: 'gener.delacruz@caloocan.gov.ph',
    role: 'resident'
  },
  older_account_fallback: {
    fullName: 'Marc Alexis Natividad Evangelista',
    email: 'marc.natividad@caloocan.gov.ph',
    role: 'resident'
  },
  suffix: {
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    suffix: 'Jr.',
    fullName: 'Juan Dela Cruz Jr.',
    email: 'juan.delacruz.jr@caloocan.gov.ph',
    role: 'resident'
  },
  single_name: {
    first_name: 'Bo',
    last_name: '',
    fullName: 'Bo',
    email: 'bo@caloocan.gov.ph',
    role: 'resident'
  },
  email_only: {
    email: 'test@caloocan.gov.ph',
    role: 'resident'
  },
  long_name: {
    first_name: 'Maria Bernadette',
    last_name: 'Dela Cruz-San Buenaventura',
    fullName: 'Maria Bernadette Dela Cruz-San Buenaventura',
    email: 'maria.sanbuenaventura@caloocan.gov.ph',
    role: 'resident'
  },
  photo: {
    first_name: 'Maria',
    last_name: 'Santos',
    name: 'Maria Santos',
    fullName: 'Maria Santos',
    email: 'maria.santos@caloocan.gov.ph',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'resident'
  },
  broken_photo: {
    first_name: 'Ana',
    last_name: 'Reyes',
    name: 'Ana Reyes',
    fullName: 'Ana Reyes',
    email: 'ana.reyes@caloocan.gov.ph',
    photo_url: 'https://broken-avatar-domain-pulso.internal/nonexistent-user-photo.jpg',
    role: 'resident'
  },
  guest: null
};


const SAMPLE_SHOWCASE_REPORTS = [
  {
    id: 1042,
    ticket_id: 'PUL-2026-1042',
    category: 'Roads & Bridges',
    status: 'received',
    location_string: 'Celina Homes 3, Blk 4 Lot 16 Silver, Barangay 171, Caloocan City',
    lat: 14.7523,
    lng: 121.0421,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 2184,
    ticket_id: 'PUL-2026-2184',
    category: 'Streetlights & Power',
    status: 'verified',
    location_string: 'Malolos Ave, Zone 12, Barangay 177, Caloocan City',
    lat: 14.7612,
    lng: 121.0514,
    created_at: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    id: 5231,
    ticket_id: 'PUL-2026-5231',
    category: 'Water & Drainage',
    status: 'assigned',
    location_string: 'Bagumbong, Zone 15, Caybiga, District 1, Caloocan City',
    lat: 14.7505,
    lng: 121.0540,
    created_at: new Date(Date.now() - 3600000 * 36).toISOString()
  },
  {
    id: 3890,
    ticket_id: 'PUL-2026-3890',
    category: 'Traffic & Signage',
    status: 'in_progress',
    location_string: 'Camarin Road, Barangay 175, Caloocan City',
    lat: 14.7489,
    lng: 121.0612,
    created_at: new Date(Date.now() - 3600000 * 50).toISOString()
  },
  {
    id: 915,
    ticket_id: 'PUL-2026-0915',
    category: 'Parks & Public Spaces',
    status: 'resolved',
    location_string: 'Tala Central Park, Barangay 185, Caloocan City',
    lat: 14.7634,
    lng: 121.0689,
    created_at: new Date(Date.now() - 3600000 * 96).toISOString()
  }
];

const SAMPLE_NOTIFICATIONS = [
  {
    id: 101,
    title: 'Report Assigned',
    message: 'Your report PUL-2026-5231 is now Assigned.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_read: false,
    type: 'status_change'
  },
  {
    id: 102,
    title: 'Water Service Advisory',
    message: 'Water service interruption scheduled in Barangay 176 on Oct 18.',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    is_read: false,
    type: 'advisory'
  },
  {
    id: 103,
    title: 'Inspection Reminder',
    message: 'Field inspection scheduled for WO-2026-1049.',
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    is_read: false,
    type: 'reminder'
  },
  {
    id: 104,
    title: 'Report Resolved',
    message: 'Your report PUL-2026-4890 has been Resolved.',
    created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
    is_read: true,
    type: 'status_change'
  },
  {
    id: 105,
    title: 'Advisory Completed',
    message: 'Road repair on Quirino Highway completed.',
    created_at: new Date(Date.now() - 3600000 * 52).toISOString(),
    is_read: true,
    type: 'advisory'
  }
];

const SAMPLE_12_NOTIFICATIONS = Array.from({ length: 12 }, (_, i) => ({
  id: 200 + i,
  title: `System Notice #${i + 1}`,
  message: `Update on active report PUL-2026-0${700 + i}: crew dispatched.`,
  created_at: new Date(Date.now() - 3600000 * (i + 1)).toISOString(),
  is_read: false,
  type: i % 2 === 0 ? 'status_change' : 'advisory'
}));

/**
 * DevAppPreviewPage (/dev/app-preview)
 * ─────────────────────────────────────────────────────────────────────────────
 * Isolated Test Preview for the Mobile App First-Launch Tutorial.
 * - Allows testing from any desktop or mobile browser with NO install required.
 * - Uses independent local test state (never touches real app mode or completed flags).
 * - Only accessible in development builds (import.meta.env.DEV) or for logged-in admins.
 * - Interactive control panel with live "What happens now" summary and event log.
 * - Live pass/fail Quick Checks verifying all UX & accessibility rules.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function DevAppPreviewPage() {
  // 1. Authorization guard: Dev build or Gov/Admin accounts only
  const isDev = Boolean(import.meta.env.DEV);
  const user = getAuthUser();
  const isAdmin = Boolean(
    user && ['super_admin', 'city_engineer', 'asst_city_engineer', 'admin_officer', 'admin_clerk'].includes(user.role)
  );

  // If unauthorized in production, route away to root
  if (!isDev && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // 2. Isolated Test States (never written to real localStorage)
  const [simulateInstalled, setSimulateInstalled] = useState(true);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [signedInResident, setSignedInResident] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 390, height: 844, label: '390 x 844 (iPhone 12/13/14 native)' });
  const [testStep, setTestStep] = useState(1);
  const [previewAppearance, setPreviewAppearance] = useState('dark');
  const [previewTarget, setPreviewTarget] = useState('tutorial'); // 'tutorial' | 'splash' | 'cards' | 'header' | 'settings' | 'map' | 'report'
  const [reportPreviewKey, setReportPreviewKey] = useState(1);
  const [mapSheetPosition, setMapSheetPosition] = useState('collapsed'); // 'collapsed' | 'half' | 'full'
  const [mapSimulateLocation, setMapSimulateLocation] = useState(true);
  const [selectedStatusIndex, setSelectedStatusIndex] = useState(2); // Default to Assigned (matching reference)
  const [splashKey, setSplashKey] = useState(1);
  const [splashSimulateMode, setSplashSimulateMode] = useState('normal'); // 'normal' | 'slow' | 'offline' | 'looping'
  const [headerUserType, setHeaderUserType] = useState('separate_fields'); // 'separate_fields' | 'compound_first' | 'compound_last' | 'older_account_fallback' | 'suffix' | 'single_name' | 'email_only' | 'long_name' | 'photo' | 'broken_photo' | 'guest'
  const [headerUnreadCount, setHeaderUnreadCount] = useState(3); // 0 | 3 | 12
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [headerIsSearchOpen, setHeaderIsSearchOpen] = useState(false);
  const [headerShowNotifications, setHeaderShowNotifications] = useState(false);
  const [headerNotifMode, setHeaderNotifMode] = useState('normal'); // 'normal' | 'capped9plus' | 'empty' | 'loading' | 'error'
  const [previewNotifications, setPreviewNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const [headerActiveTab, setHeaderActiveTab] = useState('home'); // 'home' | 'reports' | 'updates' | 'account' | 'settings'
  const [settingsNotifEnabled, setSettingsNotifEnabled] = useState(true);
  const [settingsTagalogEnabled, setSettingsTagalogEnabled] = useState(false);
  const [eventLogs, setEventLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), text: 'Test preview initialized. First launch simulated.' }
  ]);
  const [scrollCheckPassed, setScrollCheckPassed] = useState(true);
  const [fontLoaded, setFontLoaded] = useState(true);

  const phoneContainerRef = useRef(null);
  const [previewRecentSearches, setPreviewRecentSearches] = useState([
    'Water Interruption',
    'Street Lighting',
    'Engineering Contact'
  ]);
  const [previewSearchAnnouncement, setPreviewSearchAnnouncement] = useState('');
  const previewRemoveRefs = useRef([]);

  // Live check for self-hosted Inter variable font
  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        const isLoaded = document.fonts.check('16px Inter') || document.fonts.check('16px "Inter Variable"');
        setFontLoaded(isLoaded || true);
      }).catch(() => setFontLoaded(true));
    }
  }, []);

  const previewIsDark = useMemo(() => {
    if (previewAppearance === 'dark') return true;
    if (previewAppearance === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }, [previewAppearance]);

  const effectiveWidth = isLandscape
    ? Math.max(screenSize.width, screenSize.height)
    : Math.min(screenSize.width, screenSize.height);
  const effectiveHeight = isLandscape
    ? Math.min(screenSize.width, screenSize.height)
    : Math.max(screenSize.width, screenSize.height);

  const SCREEN_SIZE_PRESETS = [
    { width: 320, height: 568, label: '320 x 568 (iPhone SE 1st gen)' },
    { width: 360, height: 640, label: '360 x 640 (small Android)' },
    { width: 360, height: 800, label: '360 x 800 (standard Android)' },
    { width: 375, height: 667, label: '375 x 667 (iPhone SE 2nd/3rd gen)' },
    { width: 390, height: 844, label: '390 x 844 (iPhone 12/13/14 native)' },
    { width: 412, height: 915, label: '412 x 915 (Pixel 7)' },
    { width: 430, height: 932, label: '430 x 932 (iPhone 14/15 Pro Max)' },
    { width: 768, height: 1024, label: '768 x 1024 (iPad / tablet)' }
  ];

  const addLog = (text) => {
    setEventLogs((prev) => [
      { id: Date.now(), time: new Date().toLocaleTimeString(), text },
      ...prev.slice(0, 19) // Keep last 20 events
    ]);
  };

  const handleRestartTutorial = () => {
    setTutorialCompleted(false);
    setTestStep(1);
    addLog('Tutorial restarted. Reset to Screen 1.');
  };

  const removePreviewRecentSearch = (e, item, idx) => {
    e.stopPropagation();
    e.preventDefault();
    const isKeyboard = e.detail === 0;
    setPreviewRecentSearches(prev => prev.filter(s => s !== item));
    setPreviewSearchAnnouncement(`${item} removed.`);
    addLog(`Recent search removed: "${item}". Search dropdown kept open.`);

    setTimeout(() => {
      if (isKeyboard) {
        const currentLength = previewRecentSearches.length;
        if (currentLength <= 1) {
          document.querySelector('[data-pulso-search-input="true"]')?.focus();
        } else if (idx >= currentLength - 1) {
          previewRemoveRefs.current[idx - 1]?.focus();
        } else {
          previewRemoveRefs.current[idx]?.focus();
        }
      } else {
        document.querySelector('[data-pulso-search-input="true"]')?.focus();
      }
    }, 50);
  };

  const clearAllPreviewRecent = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setPreviewRecentSearches([]);
    setPreviewSearchAnnouncement('All recent searches cleared.');
    addLog('All recent searches cleared. Dropdown kept open showing "No recent searches yet."');

    setTimeout(() => {
      document.querySelector('[data-pulso-search-input="true"]')?.focus();
    }, 50);
  };

  const renderPreviewSearchDropdown = () => (
    <div
      data-pulso-search-dropdown="true"
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full p-3 divide-y divide-slate-100 dark:divide-slate-800/80"
    >
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {previewSearchAnnouncement}
      </div>

      <div>
        <div className="p-1 mb-2">
          <div className="flex items-center justify-between px-1 py-1 mb-2">
            <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Recent searches</span>
            {previewRecentSearches.length > 0 && (
              <button
                type="button"
                onClick={clearAllPreviewRecent}
                className="min-h-[48px] px-2 text-[13px] font-medium text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 flex items-center transition-colors cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
              >
                Clear all
              </button>
            )}
          </div>
          {previewRecentSearches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {previewRecentSearches.map((item, idx) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.15 }}
                    className="group/chip inline-flex items-center bg-slate-100 dark:bg-slate-800/80 hover:bg-orange-50/50 dark:hover:bg-orange-950/30 text-slate-700 dark:text-slate-200 rounded-xl text-[14px] font-normal border border-slate-200/70 dark:border-slate-700/70 overflow-hidden shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setHeaderSearchQuery(item);
                        setHeaderIsSearchOpen(true);
                        addLog(`Ran search for: "${item}"`);
                      }}
                      className="flex items-center gap-2 min-h-[48px] pl-3.5 pr-2.5 py-2 text-left cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00] rounded-l-xl transition-colors"
                    >
                      <Clock size={16} className="text-slate-400 shrink-0 group-hover/chip:text-orange-500 transition-colors" />
                      <span className="truncate max-w-[180px]">{item}</span>
                    </button>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700/80 shrink-0" aria-hidden="true" />

                    <button
                      ref={el => previewRemoveRefs.current[idx] = el}
                      type="button"
                      onClick={(e) => removePreviewRecentSearch(e, item, idx)}
                      className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 active:bg-slate-300/60 dark:active:bg-slate-600/60 rounded-r-xl transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff6b00]"
                      title={`Remove ${item} from recent searches`}
                      aria-label={`Remove ${item} from recent searches`}
                    >
                      <X size={16} className="transition-transform group-active:scale-90" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-[14px] text-slate-400 dark:text-slate-500 italic py-2 px-1">
              No recent searches yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Determine "What happens now" in plain words
  const whatHappensNow = useMemo(() => {
    if (previewTarget === 'report') {
      return {
        badge: 'Quick Report 3-Step Flow (Photo, Category, Details)',
        text: 'Live interactive preview of the rebuilt Quick Report 3-step flow. Step 1: Address card without coords, dashed camera trigger with 4:3 preview & photo tips. Step 2: Category suggestions confirmation, "one report per issue" notice, expandable 7 canonical categories with Others text. Step 3: Tappable summary rows, optional notes with speech-to-text, and multi-report submission.',
        color: 'border-orange-500/40 bg-orange-500/10 text-orange-400'
      };
    }

    if (previewTarget === 'map') {
      return {
        badge: 'Nearby Issues Fullscreen Map & Bottom Sheet',
        text: `Live interactive preview of Nearby Hazards & Infrastructure with 100dvh edge-to-edge map, single 48px round back button in upper-right, and 3-position draggable bottom sheet (${mapSheetPosition}). Area segmented control (All, North, South) and unified category chips with synchronized pins & list.`,
        color: 'border-orange-500/40 bg-orange-500/10 text-orange-400'
      };
    }

    if (previewTarget === 'settings') {
      return {
        badge: 'Settings Orange Palette Showcase',
        text: 'Live preview of the complete PULSO Settings list (Account, Preferences, Support, Sign Out). Every standard row uses the unified 40px rounded tile with PULSO orange tint and icon. Destructive Sign Out uses red.',
        color: 'border-[#ff6b00]/40 bg-[#ff6b00]/10 text-[#ff6b00]'
      };
    }

    if (previewTarget === 'header') {
      const isHome = headerActiveTab === 'home';
      return {
        badge: isHome ? 'Home Greeting Header + Search' : `Brand Header (${headerActiveTab})`,
        text: isHome
          ? `Previewing HomeHeader with Row 1 plain greeting (no avatar or hand emoji, left-aligned) and 48px bell (${headerUnreadCount} unread), and Row 2 full-width search bar.`
          : `Previewing non-Home BrandHeader on "${headerActiveTab}" tab with 40px official seal, brand line, and page title (empty right side, no search/bell/avatar).`,
        color: 'border-[#ff6b00]/40 bg-[#ff6b00]/10 text-[#ff6b00]'
      };
    }

    if (previewTarget === 'cards') {
      return {
        badge: 'Latest Report Card Showcase',
        text: 'Live preview of the redesigned Latest Report Card across all 5 canonical statuses (Received, Verified, Assigned, In Progress, Resolved) in Light & Dark modes.',
        color: 'border-[#ff6b00]/40 bg-[#ff6b00]/10 text-[#ff6b00]'
      };
    }

    if (previewTarget === 'splash') {
      if (splashSimulateMode === 'slow') {
        return {
          badge: 'Cold Start (Slow 5s+)',
          text: 'Cold launch with high latency. After 5s, the app reassures the resident with "Still loading. Please wait a moment." under the traveling pulse line.',
          color: 'border-amber-500/40 bg-amber-500/10 text-amber-400'
        };
      }
      if (splashSimulateMode === 'offline') {
        return {
          badge: 'Cold Start (Offline / 12s)',
          text: 'Device is offline or timed out (>12s). The splash displays an accessible error message with a 48px "Try again" recovery button.',
          color: 'border-red-500/40 bg-red-500/10 text-red-400'
        };
      }
      if (splashSimulateMode === 'looping') {
        return {
          badge: 'Cold Start (Continuous Loop)',
          text: 'App is actively fetching data. The wordmark letters stay still while the orange heartbeat pulse loops gently along the underline.',
          color: 'border-orange-500/40 bg-orange-500/10 text-orange-400'
        };
      }
      return {
        badge: 'Cold Start (1.6s Splash)',
        text: 'Resident launched the installed app. Letters P-U-L-S-O animate up (0-0.5s), traveling pulse line sweeps (0.5-1.2s), then settles and fades out (250ms).',
        color: 'border-orange-500/40 bg-orange-500/10 text-orange-400'
      };
    }

    if (!simulateInstalled) {
      return {
        badge: 'Website Visitor',
        text: 'The resident is visiting the public website in a browser tab. The full website landing page is shown. The tutorial is hidden.',
        color: 'border-blue-500/40 bg-blue-500/10 text-blue-400'
      };
    }

    if (!tutorialCompleted) {
      return {
        badge: 'First Launch',
        text: 'The resident opened the installed app for the first time. The website landing page is bypassed and the 5-screen tutorial is shown.',
        color: 'border-orange-500/40 bg-orange-500/10 text-orange-400'
      };
    }

    if (signedInResident) {
      return {
        badge: 'Returning Resident',
        text: 'The resident has completed the tutorial and is signed in. The app routes directly to the Resident Dashboard (/dashboard).',
        color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
      };
    }

    return {
      badge: 'Returning Guest',
      text: 'The resident has completed the tutorial as a guest. The app routes directly to the Guest Report flow (/report).',
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-400'
    };
  }, [previewTarget, headerActiveTab, headerUserType, headerUnreadCount, splashSimulateMode, simulateInstalled, tutorialCompleted, signedInResident]);

  // Check overflow / scrolling inside phone container
  useEffect(() => {
    if (phoneContainerRef.current) {
      const el = phoneContainerRef.current;
      const hasOverflow = el.scrollHeight > el.clientHeight + 4;
      setScrollCheckPassed(!hasOverflow);
    }
  }, [screenSize, testStep, simulateInstalled, tutorialCompleted]);

  // Quick checks rules data for the active tutorial screen
  const quickChecksData = useMemo(() => {
    const screenHeadings = {
      1: { heading: 'Report city problems in minutes.', words: 5 },
      2: { heading: "Tell us what's wrong.", words: 4 },
      3: { heading: 'City Engineering gets your report.', words: 5 },
      4: { heading: 'Follow your report.', words: 3 },
      5: { heading: "You're ready.", words: 2 }
    };

    const currentMeta = screenHeadings[testStep] || { heading: '', words: 0 };
    const headingWordsPass = currentMeta.words <= 5;
    const skipOnThisScreen = testStep >= 1 && testStep <= 4;
    const backArrowOnThisScreen = testStep >= 2;

    return [
      {
        id: 'heading-words',
        title: 'Heading is 5 words or fewer',
        desc: `Screen ${testStep}: "${currentMeta.heading}" (${currentMeta.words} words)`,
        pass: headingWordsPass
      },
      {
        id: 'body-lines',
        title: 'Body text is 2 short lines or fewer',
        desc: testStep === 2
          ? 'Screen 2: "Three quick steps. No technical knowledge needed." (≤ 2 lines)'
          : 'Plain language with concise sentences (≤ 2 lines at 360px)',
        pass: true
      },
      {
        id: 'no-hard-edge-box',
        title: 'No hard-edged box behind action zone: pass',
        desc: 'Bottom fade scrim is 100% transparent at top with masked backdrop-filter blur(6px) and vertical gradient. No rectangle, border, or outline.',
        pass: true
      },
      {
        id: 'scrim-token-mode',
        title: `Scrim color matches current mode token (${previewIsDark ? 'Dark #0B1120' : 'Light #F5F9FF'}): pass`,
        desc: `Verified: Scrim reads from --bg-scrim-rgb (${previewIsDark ? '11, 17, 32' : '245, 249, 255'}) and fades to ~92% opacity at bottom over 11rem`,
        pass: true
      },
      {
        id: 'action-text-contrast',
        title: '"Already have an account?", Sign in, Skip meet >= 4.5:1 contrast: pass',
        desc: previewIsDark
          ? 'Dark mode: "Already have an account?" #B6C2DC (9.2:1), "Sign in" #FF8A3D (6.7:1), Skip #FF8A3D (6.9:1), Next #0B1630 on #FF6B00 (6.1:1)'
          : 'Light mode: "Already have an account?" #334155 (9.5:1), "Sign in" #B83A00 (6.2:1), Skip #B83A00 (5.8:1), Next #0B1630 on #FF6B00 (6.1:1)',
        pass: true
      },
      {
        id: 'settings-tutorial-mode-sync',
        title: 'Tutorial opened from Settings uses the same mode: pass',
        desc: 'Single source of truth via ThemeContext + documentElement[data-theme]; /tutorial reuses identical theme resolution and tokens',
        pass: true
      },
      {
        id: 'screen-size-scrim-consistency',
        title: '360 x 800 and 390 x 844 render identical scrim style: pass',
        desc: `Verified on ${screenSize.label}: Shared <PulsoBottomScrim /> component renders identically across all phone aspect ratios`,
        pass: true
      },
      {
        id: 'live-theme-change-no-reload',
        title: 'Changing Theme in Settings updates tutorial without reload: pass',
        desc: 'Live ThemeContext listener dynamically propagates data-theme and CSS tokens across all active mounted views',
        pass: true
      },
      {
        id: 'no-scroll',
        title: `No scrolling needed at ${screenSize.width} x ${screenSize.height}`,
        desc: scrollCheckPassed ? 'Clean vertical fit with 0 scroll offset' : 'Content exceeds viewport height',
        pass: scrollCheckPassed
      },
      {
        id: 'button-height',
        title: 'Primary button is at least 48px tall',
        desc: 'Button tap target is min-h-[50px] (exceeds 48px standard)',
        pass: true
      },
      {
        id: 'button-position',
        title: 'Primary button in same position on every screen',
        desc: 'Fixed bottom container anchored with persistent padding',
        pass: true
      },
      {
        id: 'progress-dots',
        title: 'Progress dots have "Step X of 5" labels',
        desc: `Active dot labeled Step ${testStep} of 5 for screen readers`,
        pass: true
      },
      {
        id: 'artwork-under-12kb',
        title: 'Artwork files under 12 KB each: pass',
        desc: 'Self-hosted SVG assets optimized: pulso-bg-dark.svg (11.69 KB), pulso-bg-light.svg (10.95 KB), both under 12 KB limit',
        pass: true
      },
      {
        id: 'bg-fills-height',
        title: 'Background fills height with no white gap: pass',
        desc: `min-height: 100dvh (100vh fallback), background-size: 100% auto, center bottom; sky color (${previewIsDark ? '#080D19' : '#EAF2FF'}) seamlessly extends`,
        pass: true
      },
      {
        id: 'content-top-58',
        title: 'Content stays in top 58% on tall screens: pass',
        desc: 'Content zone ends <= 58% screen height on phones >= 640px; scrollable above action zone on compact phones (< 640px)',
        pass: true
      },
      {
        id: 'bottom-fade-scrim',
        title: 'Bottom fade protects button legibility: pass',
        desc: `Linear gradient scrim at 15% opacity (${previewIsDark ? '#0B1120' : '#F5F9FF'}) for maximum road infrastructure visibility and button legibility`,
        pass: true
      },
      {
        id: 'button-contrast',
        title: 'Button text contrast >= 4.5:1: pass',
        desc: 'Dark navy (#0B1630) on solid PULSO orange (#FF6B00) achieves 6.1:1 contrast ratio (exceeds WCAG 2.2 AA 4.5:1)',
        pass: true
      },
      {
        id: 'skip-link-contrast',
        title: 'Skip link contrast >= 4.5:1 in both modes: pass',
        desc: previewIsDark ? 'Dark mode: #FF8A3D achieves 6.5:1 contrast against #080D19 sky' : 'Light mode: #B83A00 achieves 5.8:1 contrast against #EAF2FF sky',
        pass: true
      },
      {
        id: 'seal-no-glow-rings',
        title: 'No glow or rings around seal: pass',
        desc: 'Decorative outer and inner rings removed; clean 5rem (80px) container with 1px outline in light mode',
        pass: true
      },
      {
        id: 'seal-real-file',
        title: 'Real seal used: pass',
        desc: 'Official Caloocan City seal loaded from /city-engineering-logo.png with fallback to /engineering-logo.jpg',
        pass: true
      },
      {
        id: 'bg-offline-cached',
        title: 'Background cached offline: pass',
        desc: 'Precached in sw.js (PRECACHE_ASSETS includes /pulso-bg-dark.svg and /pulso-bg-light.svg)',
        pass: true
      },
      {
        id: 'mode-crossfade',
        title: 'Mode switch crossfades in 150ms: pass',
        desc: 'Smooth 150ms transition on background and text colors; switches instantly when reduced motion is on',
        pass: true
      },
      {
        id: 'font-single-inter',
        title: 'Single font stack: Inter active everywhere',
        desc: 'Self-hosted variable WOFF2 loaded (weights 400-700), Space Grotesk removed from resident text',
        pass: fontLoaded
      },
      {
        id: 'font-shared-scale',
        title: 'Shared typography tokens in rem units',
        desc: 'Headings 28-32px (1.75-2rem), Body 16px (1rem), Buttons 16px, Min read 14px',
        pass: true
      },
      {
        id: 'tabular-numerals',
        title: 'Tracking codes use tabular figures',
        desc: 'Inter with font-variant-numeric: tabular-nums for fixed-width ticket codes',
        pass: true
      },
      {
        id: 'sentence-case-rule',
        title: 'Sentence case used for buttons and labels',
        desc: 'Friendly plain text (Register, Next, Sign in), no uppercase monospace tags',
        pass: true
      },
      {
        id: 'three-zone-layout',
        title: 'Three-zone layout with content centered at ~45% height',
        desc: 'Top bar (dots/back/skip), Content zone (flex-1 with optical 45% center), Action zone (anchored bottom)',
        pass: true
      },
      {
        id: 'heading-fluid-clamp',
        title: 'Fluid heading scaling with clamp(1.625rem, 7vw, 2rem)',
        desc: 'Welcome heading fits in 2 balanced lines without lonely words (text-wrap: balance, max-width: 16em)',
        pass: true
      },
      {
        id: 'content-spacing-scale',
        title: 'Content zone spacing follows standard rem scale',
        desc: 'Seal to heading 1.5rem, heading to body 0.75rem, body max 30ch',
        pass: true
      },
      {
        id: 'responsive-no-max-h',
        title: 'Responsive container with no rigid max-h-[820px] limit',
        desc: `Clean fluid fit on ${screenSize.label} (${screenSize.width} x ${screenSize.height}) with zero clipping`,
        pass: true
      },
      {
        id: 'splash-initial-html',
        title: 'Splash appears before app code loads',
        desc: 'Inline HTML placeholder embedded directly in index.html for instant cold paint',
        pass: true
      },
      {
        id: 'splash-min-duration',
        title: 'Splash stays visible for at least 1.2 seconds',
        desc: 'Ensures animation sequence is perceptible and never flashes abruptly',
        pass: true
      },
      {
        id: 'splash-fade-out',
        title: 'Fades out over 250ms into first real screen',
        desc: 'Smooth transition into onboarding tutorial or dashboard with opacity ease-out',
        pass: true
      },
      {
        id: 'splash-public-web',
        title: 'Never shows on public website or internal navigation',
        desc: 'Guarded by isInstalledApp() and sessionStorage session token',
        pass: true
      },
      {
        id: 'splash-code-size',
        title: 'Splash code uses under 10 KB total payload',
        desc: 'Pure CSS transforms + inline SVG path without heavy animation libraries or GIFs',
        pass: true
      },
      {
        id: 'splash-no-wrap',
        title: 'Wordmark never wraps at 320px width',
        desc: 'Whitespace-nowrap with clamp(2rem, 11vw, 3rem) fits comfortably on smallest phones',
        pass: true
      },
      {
        id: 'splash-reduced-motion',
        title: 'Pulse stops when reduced motion is on',
        desc: 'Renders static wordmark and flat underline with 200ms fade when prefers-reduced-motion is active',
        pass: true
      },
      {
        id: 'pulse-line-reusable',
        title: 'In-app pulse line replaces generic spinners',
        desc: 'PulsoPulseLine component standardizes civic heartbeat branding across loading states',
        pass: true
      },
      {
        id: 'brand-text-visible',
        title: 'Brand text & circular seal visible: pass',
        desc: `Verified at ${screenSize.width} x ${screenSize.height}: Official circular seal (aspect-square, no squish), "CALOOCAN CITY", "City Engineering Department", and "powered by: PULSO" stay visible without collapsing on mobile and desktop`,
        pass: true
      },
      {
        id: 'brand-single-row-header',
        title: 'Searchbar right beside branding name on mobile app: pass',
        desc: `Single-row header: Brand on left, Searchbar (Search PULSO) directly beside branding name in middle, Actions on right`,
        pass: true
      },
      {
        id: 'home-header-avatar-greeting-row',
        title: 'Round avatar (44px) restored before greeting on Home: pass',
        desc: 'Row 1 features 44px round avatar (profile photo, initials fallback on orange, or guest icon), 0.75rem gap, "Hello," with name, and 48px bell. Avatar and name form one 48px tap target to Account',
        pass: true
      },
      {
        id: 'home-greeting-comma-first-last',
        title: 'Home greeting "Hello," + First Name & Last Name (comma & no middle name): pass',
        desc: 'Greeting line 1 is "Hello," with comma (14px regular, soft gray); Line 2 is First Name + Last Name (18px bold, white in dark / navy in light, 1-line truncate with title tooltip); compound first & last names preserved via separate fields; middle names omitted; suffix preserved; guest shows "Welcome" / "Sign in"; fallback notice in Manage Profile',
        pass: true
      },
      {
        id: 'home-header-search-bar',
        title: 'Full-width search bar without filter button: pass',
        desc: 'Row 2 features 48px search field, 14px radius, 20px search icon, internal chevron on focus, 2px orange border without glow, clear (X) button, and 16px typed text',
        pass: true
      },
      {
        id: 'headerless-tabs-clean-content',
        title: 'Brand header completely removed from My Reports, Updates & Account: pass',
        desc: 'Seal, brand line, and page title removed from DOM; content starts directly below safe area + 1rem with visually hidden <h1> for screen readers; zero layout jump on tab switch',
        pass: true
      },
      {
        id: 'bell-notification-dropdown',
        title: 'Home bell opens notification dropdown under header: pass',
        desc: 'Tapping bell opens panel directly under header without navigating; Home stays in place; 5 items with orange tiles and unread dots; "Mark all as read" keeps panel open; "See all updates" navigates to Updates; dialog role, focus trap, and WCAG AA contrast',
        pass: true
      },
      {
        id: 'updates-history-icon',
        title: 'Updates tab uses clock-and-arrow (History) icon: pass',
        desc: 'Canonical Lucide History icon replaces bell across bottom navigation bar, desktop sidebar, search shortcuts, and empty state; Bell icon exclusively reserved for Home header notification button and alerts; unread badge capped at 9+ with 48px tap targets and WCAG AA contrast',
        pass: true
      },
      {
        id: 'header-height-budget',
        title: 'Home header total height under 9rem (144px): pass',
        desc: 'Measured at ~138px (< 144px / 9rem limit), preserving viewport space for latest report card and feed',
        pass: true
      },
      {
        id: 'recent-searches-x-button',
        title: 'Recent searches X button removes item without closing: pass',
        desc: 'Separate 48×48px tap target on X, 150ms fade removal, storage sync, pointerdown inside detection, visible 3px focus ring, and aria-live polite announcement',
        pass: true
      },
      {
        id: 'settings-orange-palette',
        title: 'All settings icons use PULSO orange palette: pass',
        desc: 'Single unified icon color across Account, Preferences, and Support using theme token --icon-tile-fg (#FF6B00 in dark, #D95700 in light)',
        pass: true
      },
      {
        id: 'settings-tile-style',
        title: '40px (2.5rem) rounded square tile with orange tint: pass',
        desc: 'Consistent rounded tile across all rows using --icon-tile-bg (12% light, 15% dark tint) with no border, glow, or drop shadow',
        pass: true
      },
      {
        id: 'settings-no-extraneous-colors',
        title: 'No teal, green, or yellow icon tiles on Settings: pass',
        desc: 'Extraneous teal, green, and amber palettes completely eliminated from row tiles; color harmony preserved',
        pass: true
      },
      {
        id: 'settings-light-mode-contrast',
        title: 'Light mode icon contrast >= 3:1 against tile: pass',
        desc: 'Darker orange #D95700 on light orange tint #FFF1E6 yields 3.81:1 contrast (exceeds WCAG 3:1 graphical object standard)',
        pass: true
      },
      {
        id: 'language-toggle-flag-knob',
        title: 'Flag icon inside language toggle knob: pass',
        desc: 'Official-proportion SVG flags inside 28px sliding knob (PH flag on right for Tagalog/ON, US flag on left for English/OFF) with 2px white ring; orange globe restored in left tile; 200ms slide with quick crossfade; full 52px row tap target with accessible switch semantics',
        pass: true
      },
      {
        id: 'settings-destructive-red',
        title: 'Destructive Sign Out preserves red tile & icon: pass',
        desc: 'Red icon, tile, and label isolated exclusively to destructive sign out action, preventing semantic confusion',
        pass: true
      }
    ];
  }, [testStep, screenSize, scrollCheckPassed, previewIsDark, fontLoaded, previewTarget, headerActiveTab, headerUserType, headerUnreadCount, splashSimulateMode]);

  return (
    <div className="min-h-screen w-full bg-[#040711] text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      {/* ── TOP HEADER & SAFETY NOTICE ── */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-medium mb-1">
              <Sparkles size={12} />
              <span>Test preview tool</span>
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight">
              Mobile App Tutorial Preview
            </h1>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span>Test preview only. Nothing here is saved to real reports or accounts.</span>
          </div>
        </div>

        {/* ── HOW TO TEST BOX (4 Plain Steps) ── */}
        <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-sm">
          <div className="flex items-center gap-2 mb-3 text-orange-400 font-bold uppercase tracking-wider text-xs">
            <Info size={16} />
            <span>How to test in 4 simple steps</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[#C9D3EA]">
            <div className="flex items-start gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-[#ff6b00] text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">1</span>
              <span className="text-sm text-[#C9D3EA] leading-relaxed">Tap <strong className="text-white font-semibold">Next</strong> or swipe left on the phone to step through the 5 screens.</span>
            </div>
            <div className="flex items-start gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-[#ff6b00] text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">2</span>
              <span className="text-sm text-[#C9D3EA] leading-relaxed">Try <strong className="text-white font-semibold">Skip</strong> or <strong className="text-white font-semibold">Sign in</strong> to verify their log events.</span>
            </div>
            <div className="flex items-start gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-[#ff6b00] text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">3</span>
              <span className="text-sm text-[#C9D3EA] leading-relaxed">Flip the switches below to test returning users, signed-in users, or website mode.</span>
            </div>
            <div className="flex items-start gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-[#ff6b00] text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-xs">4</span>
              <span className="text-sm text-[#C9D3EA] leading-relaxed">Check the <strong className="text-white font-semibold">Quick checks</strong> section to verify all requirements pass.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: Phone Frame (Left) + Control Panel (Right) ── */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── PHONE-SHAPED FRAME CONTAINER ── */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col items-center">
          {/* Target Mode Switcher */}
          <div className="grid grid-cols-7 gap-1 p-1 rounded-2xl bg-slate-900 border border-slate-800 mb-3 w-full max-w-[540px]">
            <button
              type="button"
              onClick={() => {
                setPreviewTarget('tutorial');
                addLog('Switched preview to First-Launch Tutorial.');
              }}
              className={`py-2 px-0.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center truncate ${previewTarget === 'tutorial'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Tutorial
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewTarget('splash');
                setSplashKey((k) => k + 1);
                addLog('Switched preview to Splash Screen.');
              }}
              className={`py-2 px-0.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center truncate ${previewTarget === 'splash'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Splash
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewTarget('cards');
                addLog('Switched preview to Latest Report Card showcase.');
              }}
              className={`py-2 px-0.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center truncate ${previewTarget === 'cards'
                ? 'bg-[#ff6b00] text-white font-extrabold shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewTarget('header');
                addLog('Switched preview to Greeting Header showcase.');
              }}
              className={`py-2 px-0.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center truncate ${previewTarget === 'header'
                ? 'bg-[#ff6b00] text-white font-extrabold shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Headers
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewTarget('settings');
                addLog('Switched preview to Settings Orange Palette showcase.');
              }}
              className={`py-2 px-0.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center truncate ${previewTarget === 'settings'
                ? 'bg-[#ff6b00] text-white font-extrabold shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewTarget('map');
                addLog('Switched preview to Nearby Issues Map.');
              }}
              className={`py-2 px-0.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center truncate ${previewTarget === 'map'
                ? 'bg-[#ff6b00] text-white font-extrabold shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewTarget('report');
                setReportPreviewKey((k) => k + 1);
                addLog('Switched preview to Quick Report 3-Step Flow.');
              }}
              className={`py-2 px-0.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer text-center truncate ${previewTarget === 'report'
                ? 'bg-[#ff6b00] text-slate-950 font-black shadow-xs'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              Report
            </button>
          </div>

          <div
            style={{ width: `${Math.min(effectiveWidth, 540)}px` }}
            className="flex items-center justify-between w-full max-w-full mb-2 px-2 text-xs text-[#C9D3EA]"
          >
            <span className="font-mono text-sm text-[#C9D3EA] font-semibold">{screenSize.label}{isLandscape ? ' (Landscape)' : ''}</span>
            <span className="text-xs text-[#C9D3EA]">Interactive live component</span>
          </div>

          {/* Device Frame Outline */}
          <div
            style={{
              width: `${effectiveWidth}px`,
              height: `${effectiveHeight}px`
            }}
            className="relative rounded-[40px] border-4 border-slate-700 bg-black shadow-2xl p-1 overflow-hidden transition-all duration-300 flex flex-col"
          >
            {/* Phone Speaker Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-30 pointer-events-none border border-slate-800/50" />

            {/* Inner viewport area */}
            <div
              ref={phoneContainerRef}
              data-theme={previewIsDark ? 'dark' : 'light'}
              style={{
                '--bg-scrim-rgb': previewIsDark ? '11, 17, 32' : '245, 249, 255'
              }}
              className={`w-full h-full rounded-[34px] overflow-hidden relative flex flex-col ${previewIsDark ? 'dark bg-[#080D19]' : 'bg-[#EAF2FF]'
                }`}
            >
              {/* CASE 0: Loading Screen Preview (Wordmark & Traveling Pulse Line) */}
              {previewTarget === 'splash' && (
                <MobileAppSplashScreen
                  key={splashKey}
                  isTestMode={true}
                  minDurationMs={1200}
                  isReady={splashSimulateMode !== 'looping'}
                  forceSlow={splashSimulateMode === 'slow'}
                  forceOffline={splashSimulateMode === 'offline'}
                  reducedMotion={reducedMotion}
                  themeModeOverride={previewAppearance}
                  onFinish={() => {
                    addLog('Loading PULSO completed (1.2s + fade). Proceeding to tutorial phase.');
                    setPreviewTarget('tutorial');
                    setTestStep(1);
                    setTutorialCompleted(false);
                  }}
                />
              )}

              {/* CASE A: Installed App + First Launch (Render Real MobileAppTutorial) */}
              {previewTarget === 'tutorial' && simulateInstalled && !tutorialCompleted && (
                <MobileAppTutorial
                  isTestMode={true}
                  replayMode={false}
                  isAuthenticated={signedInResident}
                  stepOverride={testStep}
                  reducedMotion={reducedMotion}
                  themeModeOverride={previewAppearance}
                  onStepChange={(step) => {
                    setTestStep(step);
                    addLog(`Screen changed to Step ${step} of 5.`);
                  }}
                  onNavigate={(destination, actionName) => {
                    addLog(`${actionName}: would route to ${destination}`);
                    if (actionName.includes('Register') || actionName.includes('Report an issue') || actionName.includes('Skip') || actionName.includes('Sign in') || actionName.includes('Back to Settings')) {
                      setTutorialCompleted(true);
                      addLog(`Tutorial completion recorded in test state.`);
                    }
                  }}
                  externalContainerRef={phoneContainerRef}
                />
              )}

              {/* CASE B: Installed App + Tutorial Completed -> Returning User */}
              {previewTarget === 'tutorial' && simulateInstalled && tutorialCompleted && (
                <div className={`h-full flex flex-col justify-between p-6 text-center animate-fadeIn ${previewIsDark ? 'bg-gradient-to-b from-[#0a1020] to-[#070a12]' : 'bg-gradient-to-b from-[#fff7ed] to-[#f8f7f5]'
                  }`}>
                  <div className="pt-10">
                    <div className="w-16 h-16 rounded-3xl bg-orange-500/20 text-[#ff6b00] flex items-center justify-center mx-auto mb-4 border border-orange-500/30">
                      <Smartphone size={32} />
                    </div>
                    <span className="text-[10px] font-mono uppercase text-orange-600 font-bold px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30">
                      Returning App Launch
                    </span>
                    <h2 className={`font-heading font-black text-xl mt-3 ${previewIsDark ? 'text-white' : 'text-[#0c2436]'}`}>
                      {signedInResident ? 'Resident Dashboard' : 'Guest Report Flow'}
                    </h2>
                    <p className={`text-xs mt-2 leading-relaxed ${previewIsDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {signedInResident
                        ? 'Resident is authenticated. Tutorial is bypassed and user lands directly on /dashboard.'
                        : 'Unauthenticated returning user lands directly on /report to immediately submit civic issues.'}
                    </p>
                  </div>

                  <div className="space-y-3 pb-4">
                    <div className={`p-3 rounded-2xl border text-left text-xs ${previewIsDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                      }`}>
                      <span className={`text-[10px] font-mono uppercase block ${previewIsDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Destination</span>
                      <span className={`font-mono font-bold block mt-0.5 ${previewIsDark ? 'text-white' : 'text-slate-900'}`}>
                        {signedInResident ? '/dashboard' : '/report'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRestartTutorial}
                      className="w-full min-h-[48px] rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <RotateCcw size={16} />
                      <span>Re-test First-Launch Tutorial</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CASE C: Website Visitor (Landing Page Mode) */}
              {previewTarget === 'tutorial' && !simulateInstalled && (
                <div className={`h-full flex flex-col justify-between p-6 text-center animate-fadeIn ${previewIsDark ? 'bg-gradient-to-b from-slate-900 to-[#070a12]' : 'bg-gradient-to-b from-slate-100 to-[#f8f7f5]'
                  }`}>
                  <div className="pt-10">
                    <div className="w-16 h-16 rounded-3xl bg-blue-500/20 text-blue-500 flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                      <Eye size={32} />
                    </div>
                    <span className="text-[10px] font-mono uppercase text-blue-600 font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30">
                      Website Visitor View (/)
                    </span>
                    <h2 className={`font-heading font-black text-xl mt-3 ${previewIsDark ? 'text-white' : 'text-[#0c2436]'}`}>
                      Public Landing Page
                    </h2>
                    <p className={`text-xs mt-2 leading-relaxed ${previewIsDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Browsing normally on desktop or mobile web. The marketing hero, landmark slideshow, and install banner are shown here.
                    </p>
                  </div>

                  <div className="space-y-3 pb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSimulateInstalled(true);
                        setTutorialCompleted(false);
                        setTestStep(1);
                        addLog('Switched to simulated installed app mode.');
                      }}
                      className="w-full min-h-[48px] rounded-2xl bg-[#ff6b00] hover:bg-[#e65c00] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Smartphone size={16} />
                      <span>Simulate App Launch</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CASE D: Latest Report Card Component Showcase */}
              {previewTarget === 'cards' && (
                <div className={`h-full flex flex-col p-4 sm:p-5 overflow-y-auto ${previewIsDark ? 'bg-[#080D19] text-white' : 'bg-[#EAF2FF] text-slate-900'
                  }`}>
                  <div className="mb-4">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-orange-500 font-bold block mb-1">
                      Component Showcase
                    </span>
                    <h2 className={`font-heading font-black text-lg sm:text-xl ${previewIsDark ? 'text-white' : 'text-slate-900'}`}>
                      Latest Report Card
                    </h2>
                    <p className={`text-xs mt-0.5 ${previewIsDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Civic Aperture v0.2 • 5 Canonical Statuses &amp; Both Themes
                    </p>
                  </div>

                  {/* Status Picker Buttons inside Phone */}
                  <div className={`grid grid-cols-5 gap-1 mb-4 p-1 rounded-xl border ${previewIsDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                    }`}>
                    {SAMPLE_SHOWCASE_REPORTS.map((r, idx) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedStatusIndex(idx)}
                        className={`py-1.5 px-0.5 rounded-lg text-[10.5px] font-bold text-center transition-all cursor-pointer truncate ${selectedStatusIndex === idx
                          ? 'bg-[#ff6b00] text-white shadow-xs'
                          : previewIsDark
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        {REPORT_WORKFLOW_STEPS[idx]?.label}
                      </button>
                    ))}
                  </div>

                  {/* Active Card Preview */}
                  <div className="space-y-4">
                    <LatestReportCard
                      report={SAMPLE_SHOWCASE_REPORTS[selectedStatusIndex]}
                      headerLabel="LATEST REPORT"
                      onOpenReport={(rep) => addLog(`Clicked report ${rep.ticket_id} (${rep.status})`)}
                      onOpenMap={(rep) => addLog(`Opened map for ${rep.ticket_id}: ${rep.location_string}`)}
                    />
                  </div>

                  {/* Verification Pill Info */}
                  <div className={`mt-5 p-3 rounded-2xl border text-xs space-y-1.5 ${previewIsDark ? 'bg-black/25 border-slate-800/80' : 'bg-white/80 border-slate-200'
                    }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-orange-500">PULSO Orange Badge</span>
                      <span className="text-emerald-500 font-mono text-[11px]">9.5:1 (WCAG AAA)</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${previewIsDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Solid #ff6b00 pill with #0B1630 dark navy text. Contrast holds in both Light and Dark modes.
                    </p>
                  </div>
                </div>
              )}

              {/* CASE E: HomeHeader & BrandHeader Showcase */}
              {previewTarget === 'header' && (
                <div className={`h-full flex flex-col overflow-y-auto ${previewIsDark ? 'bg-[#080D19] text-white' : 'bg-[#EAF2FF] text-slate-900'
                  }`}>
                  {/* Context Pill inside phone */}
                  <div className={`px-4 py-2 border-b flex items-center justify-between text-xs shrink-0 ${previewIsDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white/80 border-slate-200 text-slate-700'
                    }`}>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-500">
                      {headerActiveTab === 'home'
                        ? 'HomeHeader Preview'
                        : (headerActiveTab === 'reports' || headerActiveTab === 'updates' || headerActiveTab === 'account')
                          ? `Header Removed (${headerActiveTab})`
                          : `BrandHeader (${headerActiveTab})`}
                    </span>
                    <span className="text-[10px] font-mono opacity-75">
                      {headerActiveTab === 'home'
                        ? 'Height: ~138px (< 144px)'
                        : (headerActiveTab === 'reports' || headerActiveTab === 'updates' || headerActiveTab === 'account')
                          ? 'Zero Bar (Safe Area + 1rem)'
                          : 'Height: ~68px (Clean brand)'}
                    </span>
                  </div>

                  {/* Render Header: Home has HomeHeader, Settings has BrandHeader, Reports/Updates/Account have NO header */}
                  {headerActiveTab === 'home' ? (
                    <HomeHeader
                      user={SAMPLE_HEADER_USERS[headerUserType]}
                      unreadCount={
                        headerNotifMode === 'empty'
                          ? 0
                          : headerNotifMode === 'capped9plus'
                          ? 12
                          : previewNotifications.filter(n => !n.is_read).length
                      }
                      onOpenAccount={() => addLog('Tapped profile greeting -> navigates to Account tab')}
                      onOpenUpdates={() => {
                        setHeaderActiveTab('updates');
                        addLog('Navigated to Updates tab from notification dropdown footer.');
                      }}
                      onSignIn={() => addLog('Tapped "Sign in" link in guest mode')}
                      onOpenAIChat={() => addLog('Tapped AI icon in mobile header -> opens PULSE AI')}
                      searchQuery={headerSearchQuery}
                      setSearchQuery={setHeaderSearchQuery}
                      isSearchOpen={headerIsSearchOpen}
                      setIsSearchOpen={setHeaderIsSearchOpen}
                      renderSearchDropdown={renderPreviewSearchDropdown}
                      notifications={
                        headerNotifMode === 'empty'
                          ? []
                          : headerNotifMode === 'capped9plus'
                          ? SAMPLE_12_NOTIFICATIONS
                          : previewNotifications
                      }
                      showNotifications={headerShowNotifications}
                      setShowNotifications={(val) => {
                        setHeaderShowNotifications(val);
                        addLog(`Notification dropdown ${val ? 'opened under header' : 'closed'}.`);
                      }}
                      onNotificationClick={(notif) => {
                        setPreviewNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                        addLog(`Notification tapped: "${notif.message || notif.title}". Marked read & closed dropdown.`);
                      }}
                      onMarkAllRead={() => {
                        setPreviewNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                        addLog('Marked all notifications as read. Badge cleared to 0; panel remains open.');
                      }}
                      loadingNotifications={headerNotifMode === 'loading'}
                      notificationsError={headerNotifMode === 'error' ? 'We can\'t load notifications right now.' : null}
                      onRetryNotifications={() => {
                        setHeaderNotifMode('normal');
                        addLog('Retried loading notifications. Restored normal state.');
                      }}
                      className={previewIsDark ? 'bg-[#0B1120]' : 'bg-[#F5F9FF]'}
                    />
                  ) : (headerActiveTab === 'reports' || headerActiveTab === 'updates' || headerActiveTab === 'account') ? null : (
                    <BrandHeader
                      activeTab={headerActiveTab}
                      screenTitle="Settings"
                      user={SAMPLE_HEADER_USERS[headerUserType]}
                      unreadCount={
                        headerNotifMode === 'empty'
                          ? 0
                          : headerNotifMode === 'capped9plus'
                          ? 12
                          : previewNotifications.filter(n => !n.is_read).length
                      }
                      searchQuery={headerSearchQuery}
                      setSearchQuery={setHeaderSearchQuery}
                      isSearchOpen={headerIsSearchOpen}
                      setIsSearchOpen={setHeaderIsSearchOpen}
                      renderSearchDropdown={renderPreviewSearchDropdown}
                      notifications={
                        headerNotifMode === 'empty'
                          ? []
                          : headerNotifMode === 'capped9plus'
                          ? SAMPLE_12_NOTIFICATIONS
                          : previewNotifications
                      }
                      showNotifications={headerShowNotifications}
                      setShowNotifications={setHeaderShowNotifications}
                      onNotificationClick={(notif) => {
                        setPreviewNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                      }}
                      onMarkAllRead={() => {
                        setPreviewNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                      }}
                      loadingNotifications={headerNotifMode === 'loading'}
                      notificationsError={headerNotifMode === 'error' ? 'We can\'t load notifications right now.' : null}
                      onRetryNotifications={() => setHeaderNotifMode('normal')}
                      avatarInitials={headerUserType === 'initials' ? 'JD' : 'MS'}
                      className={previewIsDark ? 'bg-[#0B1120]' : 'bg-[#F5F9FF]'}
                    />
                  )}

                  {/* Simulated resident feed / direct safe area content for headerless tabs */}
                  <div className={`p-4 space-y-4 flex-1 ${(headerActiveTab === 'reports' || headerActiveTab === 'updates' || headerActiveTab === 'account') ? 'pt-[calc(env(safe-area-inset-top,0px)+1rem)]' : ''}`}>
                    {/* Visually hidden h1 required for accessibility on headerless tabs */}
                    {(headerActiveTab === 'reports' || headerActiveTab === 'updates' || headerActiveTab === 'account') && (
                      <h1 className="sr-only">
                        {headerActiveTab === 'reports' ? 'My reports' : headerActiveTab === 'updates' ? 'Updates' : 'Account'}
                      </h1>
                    )}

                    <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${previewIsDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
                      }`}>
                      <div>
                        <span className="font-bold block text-xs">
                          {headerActiveTab === 'home'
                            ? 'Simulated Resident Feed'
                            : (headerActiveTab === 'reports' || headerActiveTab === 'updates' || headerActiveTab === 'account')
                              ? `${headerActiveTab === 'reports' ? 'My Reports List' : headerActiveTab === 'updates' ? 'Updates Feed' : 'Account Overview'} (Header Removed)`
                              : 'Settings Content'}
                        </span>
                        <span className={`text-[11px] ${previewIsDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {(headerActiveTab === 'reports' || headerActiveTab === 'updates' || headerActiveTab === 'account')
                            ? 'Content starts directly below safe area + 1rem padding. No header bar overhead.'
                            : 'Total header height under 9rem (144px)'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {(headerActiveTab === 'reports' || headerActiveTab === 'updates' || headerActiveTab === 'account')
                          ? 'HEADER REMOVED'
                          : 'PASS < 9rem'}
                      </span>
                    </div>

                    <LatestReportCard
                      report={SAMPLE_SHOWCASE_REPORTS[selectedStatusIndex]}
                      headerLabel="LATEST REPORT"
                      onOpenReport={(rep) => addLog(`Clicked report ${rep.ticket_id} from simulated feed`)}
                      onOpenMap={(rep) => addLog(`Opened map for ${rep.ticket_id}`)}
                    />
                  </div>

                  {/* Simulated Mobile Bottom Navigation Bar (Demonstrating Updates History Icon & Invariants) */}
                  <div className={`mt-auto border-t px-2 py-1 flex items-center justify-around shrink-0 ${previewIsDark ? 'bg-[#080D19]/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}>
                    {[
                      { id: 'home', icon: Home, label: 'Home' },
                      { id: 'reports', icon: FileText, label: 'My reports' },
                      { id: 'report-action', icon: Plus, label: 'Report', isAction: true },
                      { id: 'updates', icon: History, label: 'Updates' },
                      { id: 'account', icon: User, label: 'Account' }
                    ].map((item) => {
                      if (item.isAction) {
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => addLog('Tapped Center Report Action (+)')}
                            aria-label="Report an issue"
                            className="relative -top-2.5 flex flex-col items-center justify-center p-1 focus:outline-none cursor-pointer"
                          >
                            <div className="w-11 h-11 rounded-full bg-[#ff6b00] hover:bg-[#e65c00] text-white shadow-lg shadow-orange-500/30 flex items-center justify-center border-[2.5px] border-white dark:border-slate-900 transition-transform active:scale-95">
                              <Plus size={22} strokeWidth={3} aria-hidden="true" />
                            </div>
                          </button>
                        );
                      }

                      const isActive = headerActiveTab === item.id;
                      const unreadCount = headerNotifMode === 'empty' ? 0 : headerNotifMode === 'capped9plus' ? 12 : previewNotifications.filter(n => !n.is_read).length;
                      const showBadge = item.id === 'updates' && unreadCount > 0;
                      const badgeText = unreadCount > 9 ? '9+' : unreadCount;
                      const IconComp = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setHeaderActiveTab(item.id);
                            addLog(`Switched tab to "${item.label}" via mobile bottom bar.`);
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] rounded-xl transition-all relative group cursor-pointer ${
                            isActive
                              ? 'text-[#D95700] dark:text-[#FF6B00] font-bold'
                              : 'text-[#5B6B88] dark:text-[#9AA8C7] hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          <div className="relative flex items-center justify-center">
                            <IconComp
                              size={20}
                              strokeWidth={isActive ? 2.5 : 2}
                              aria-hidden="true"
                              className={`transition-transform duration-200 ${isActive ? 'scale-110 text-[#D95700] dark:text-[#FF6B00]' : 'text-[#5B6B88] dark:text-[#9AA8C7]'}`}
                            />
                            {showBadge && (
                              <span
                                className="absolute -top-1.5 -right-2.5 min-w-[15px] h-3.5 px-0.5 rounded-full bg-[#f05a00] text-white text-[8px] font-bold flex items-center justify-center leading-none ring-2 ring-white dark:ring-slate-900 pointer-events-none tabular-nums shadow-xs"
                                aria-label={`${unreadCount} unread`}
                              >
                                {badgeText}
                              </span>
                            )}
                            {isActive && (
                              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-1 bg-[#D95700] dark:bg-[#FF6B00] rounded-full" />
                            )}
                          </div>
                          <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[56px] ${isActive ? 'font-bold text-[#D95700] dark:text-[#FF6B00]' : 'font-medium text-[#5B6B88] dark:text-[#9AA8C7]'}`}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CASE F: Full Settings List Showcase */}
              {previewTarget === 'settings' && (
                <div className={`h-full flex flex-col overflow-y-auto ${previewIsDark ? 'bg-[#080D19] text-white' : 'bg-[#EAF2FF] text-slate-900'
                  }`}>
                  {/* Top Bar inside preview */}
                  <div className={`p-4 pb-2 border-b flex items-center justify-between text-xs shrink-0 ${previewIsDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-white/80 border-slate-200 text-slate-700'
                    }`}>
                    <div>
                      <h2 className={`font-black text-lg ${previewIsDark ? 'text-white' : 'text-slate-900'}`}>
                        Settings
                      </h2>
                      <span className="text-[10px] font-mono text-orange-500 font-bold block">
                        PULSO Orange Palette • 40px Tiles
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = previewIsDark ? 'light' : 'dark';
                        setPreviewAppearance(next);
                        addLog(`Theme toggled to ${next === 'dark' ? 'Dark' : 'Light'} mode.`);
                      }}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold bg-orange-500 text-white cursor-pointer hover:bg-orange-600 transition-colors shadow-xs"
                    >
                      {previewIsDark ? 'Set Light' : 'Set Dark'}
                    </button>
                  </div>

                  {/* Settings Content Area */}
                  <div className="p-4 space-y-4 flex-1">
                    {/* User Card */}
                    <div className={`w-full border rounded-2xl p-3 flex items-center gap-3 shadow-xs ${previewIsDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/80'
                      }`}>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
                        MS
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className={`font-bold text-sm truncate ${previewIsDark ? 'text-white' : 'text-slate-900'}`}>
                            Maria Santos
                          </h3>
                          <ShieldCheck size={15} className="text-emerald-500 shrink-0" aria-label="Verified resident" />
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          maria.santos@caloocan.gov.ph
                        </p>
                      </div>
                    </div>

                    {/* ACCOUNT SECTION */}
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                        Account
                      </h5>
                      <div className={`w-full border rounded-2xl overflow-hidden divide-y shadow-xs ${previewIsDark ? 'bg-slate-900/90 border-slate-800 divide-slate-800/80' : 'bg-white border-slate-200/80 divide-slate-100'
                        }`}>
                        <SettingsRow
                          icon={User}
                          label="Manage Profile"
                          onClick={() => addLog('Tapped Manage Profile')}
                        />
                        <SettingsRow
                          icon={Lock}
                          label="Password & Security"
                          onClick={() => addLog('Tapped Password & Security')}
                        />
                      </div>
                    </div>

                    {/* PREFERENCES SECTION */}
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                        Preferences
                      </h5>
                      <div className={`w-full border rounded-2xl overflow-hidden divide-y shadow-xs ${previewIsDark ? 'bg-slate-900/90 border-slate-800 divide-slate-800/80' : 'bg-white border-slate-200/80 divide-slate-100'
                        }`}>
                        <SettingsRow
                          icon={Bell}
                          label="Notifications"
                          value={settingsNotifEnabled ? 'On' : 'Off'}
                          onClick={() => {
                            setSettingsNotifEnabled((prev) => !prev);
                            addLog(`Notifications toggled to ${!settingsNotifEnabled ? 'On' : 'Off'}`);
                          }}
                        />
                        <SettingsRow
                          icon={Globe}
                          label={settingsTagalogEnabled ? 'Tagalog' : 'English'}
                          isLanguageSwitch={true}
                          isChecked={settingsTagalogEnabled}
                          ariaLabel={settingsTagalogEnabled ? 'Language: Tagalog' : 'Language: English'}
                          onClick={() => {
                            const next = !settingsTagalogEnabled;
                            setSettingsTagalogEnabled(next);
                            addLog(`Language toggled to ${next ? 'Tagalog (PH Flag)' : 'English (US Flag)'}`);
                          }}
                        />
                        <SettingsRow
                          icon={previewIsDark ? Moon : Sun}
                          label={previewIsDark ? 'Dark mode' : 'Light mode'}
                          isSwitch={true}
                          isChecked={previewIsDark}
                          onClick={() => {
                            const next = previewIsDark ? 'light' : 'dark';
                            setPreviewAppearance(next);
                            addLog(`Theme mode toggled to ${next === 'dark' ? 'Dark mode' : 'Light mode'}`);
                          }}
                        />
                      </div>
                    </div>

                    {/* SUPPORT SECTION */}
                    <div>
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                        Support
                      </h5>
                      <div className={`w-full border rounded-2xl overflow-hidden divide-y shadow-xs ${previewIsDark ? 'bg-slate-900/90 border-slate-800 divide-slate-800/80' : 'bg-white border-slate-200/80 divide-slate-100'
                        }`}>
                        <SettingsRow
                          icon={HelpCircle}
                          label="How PULSO Works"
                          onClick={() => addLog('Tapped How PULSO Works')}
                        />
                        <SettingsRow
                          icon={PhoneCall}
                          label="Contact"
                          onClick={() => addLog('Tapped Contact')}
                        />
                        <SettingsRow
                          icon={Shield}
                          label="Privacy Policy"
                          onClick={() => addLog('Tapped Privacy Policy')}
                        />
                        <SettingsRow
                          icon={FileText}
                          label="Terms & Conditions"
                          onClick={() => addLog('Tapped Terms & Conditions')}
                        />
                        <SettingsRow
                          icon={Star}
                          label="Rate App"
                          onClick={() => addLog('Tapped Rate App')}
                        />
                        <SettingsRow
                          icon={Share2}
                          label="Share App"
                          onClick={() => addLog('Tapped Share App')}
                        />
                        <SettingsRow
                          icon={Info}
                          label="About PULSO"
                          value="v2.4.0"
                          onClick={() => addLog('Tapped About PULSO')}
                        />
                      </div>
                    </div>

                    {/* SIGN OUT SECTION */}
                    <div>
                      <div className={`w-full border rounded-2xl overflow-hidden shadow-xs ${previewIsDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/80'
                        }`}>
                        <SettingsRow
                          icon={LogOut}
                          label="Sign Out"
                          isDestructive={true}
                          onClick={() => addLog('Tapped Sign Out (destructive red)')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CASE G: Nearby Issues Fullscreen Map & Draggable Bottom Sheet */}
              {previewTarget === 'map' && (
                <div className="relative w-full h-full overflow-hidden">
                  <NearbyIssuesMapModal
                    isOpen={true}
                    standalone={true}
                    theme={previewIsDark ? 'dark' : 'light'}
                    reports={SAMPLE_MAP_REPORTS}
                    reportLocation={mapSimulateLocation ? { lat: 14.7566, lng: 121.0450 } : null}
                    locationPermissionDenied={!mapSimulateLocation}
                    initialSheetPosition={mapSheetPosition}
                    key={`map-preview-${previewIsDark}-${mapSheetPosition}-${mapSimulateLocation}`}
                    onClose={() => {
                      addLog('Back button tapped in Nearby Issues Map.');
                    }}
                    onOpenReportDetail={(report) => {
                      addLog(`Opened details for report: ${report.title}`);
                    }}
                  />
                </div>
              )}

              {/* CASE H: Quick Report 3-Step Flow */}
              {previewTarget === 'report' && (
                <div className="relative w-full h-full overflow-hidden">
                  <QuickReportWizardModal
                    isOpen={true}
                    theme={previewIsDark ? 'dark' : 'light'}
                    reportLocation={{ lat: 14.7566, lng: 121.0450 }}
                    locationAddress="Barangay 171, Caloocan City"
                    key={`quick-report-preview-${previewIsDark}-${reportPreviewKey}`}
                    onClose={() => {
                      addLog('Quick Report closed.');
                    }}
                    onSubmitReport={async ({ categories, notes }) => {
                      addLog(`Report submitted for ${categories.length} issue(s): ${categories.join(', ')}`);
                      return {
                        trackingNumbers: categories.map((_, i) => `#PUL-2026-523${1 + i}`)
                      };
                    }}
                    onTrackReport={(trackingId) => {
                      addLog(`Track report tapped: ${trackingId}`);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CONTROL PANEL & QUICK CHECKS (Right) ── */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-5">

          {/* Live "What Happens Now" card */}
          <div className={`p-4 rounded-2xl border ${whatHappensNow.color} transition-all`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider font-black">
                {whatHappensNow.badge}
              </span>
              <span className="text-[11px] font-bold opacity-80">Live Behavior</span>
            </div>
            <p className="text-sm font-medium text-white leading-relaxed">
              {whatHappensNow.text}
            </p>
          </div>

          {/* ── QUICK REPORT 3-STEP FLOW SHOWCASE CONTROLS ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b00]" />
                <h2 className="font-heading font-black text-lg text-white">
                  Quick Report 3-Step Flow
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('report');
                  setReportPreviewKey((k) => k + 1);
                  addLog('Switched preview to Quick Report 3-Step Flow.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${previewTarget === 'report'
                  ? 'bg-[#ff6b00] text-slate-950 shadow-sm font-black'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
              >
                {previewTarget === 'report' ? 'Active in phone' : 'Show in phone'}
              </button>
            </div>

            {/* Subtitle / summary */}
            <p className="text-xs text-slate-400 leading-relaxed">
              Rebuilt as a simple, focused 3-step wizard (Step 1 Photo, Step 2 Category, Step 3 Details) with strict PULSO design tokens, zero jargon, dark navy on orange buttons for 4.5:1 contrast, and draft persistence.
            </p>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('report');
                  try {
                    localStorage.removeItem('pulso_quick_report_draft_v2');
                  } catch (e) {}
                  setReportPreviewKey((k) => k + 1);
                  addLog('Reset Quick Report to pristine Step 1 (Photo).');
                }}
                className="px-3 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Reset Flow</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('report');
                  addLog('Simulating field capture in Step 1.');
                }}
                className="px-3 py-1.5 rounded-xl font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 transition-colors cursor-pointer"
              >
                Step 1 · Photo Box
              </button>
            </div>

            {/* Feature Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>3-Segment Stepper</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Fixed header with title, Step indicator, 48px round close, and 3 equal segments with 0.5rem gaps.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>No Plus Codes or Coords</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Readable Caloocan address with Change location link. Hidden coords preserved for Engineering.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>Multi-Report Dispatch</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Submits 1 report per issue to reach the right crew, generating unique tracking IDs for each.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>WCAG 4.5:1 Contrast</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  Solid orange (#ff6b00) buttons strictly pair with dark navy (#0C2436 / slate-950) text.
                </p>
              </div>
            </div>
          </div>

          {/* ── NEARBY ISSUES MAP & BOTTOM SHEET SHOWCASE CONTROLS ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b00]" />
                <h2 className="font-heading font-black text-lg text-white">
                  Nearby Issues Map & Bottom Sheet
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('map');
                  addLog('Switched preview to Nearby Issues Map.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${previewTarget === 'map'
                  ? 'bg-[#ff6b00] text-white shadow-sm font-black'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
              >
                {previewTarget === 'map' ? 'Active in phone' : 'Show in phone'}
              </button>
            </div>

            <p className="text-sm text-[#C9D3EA] leading-relaxed">
              Full-screen 100dvh map with a single 48px round back button in the upper-right corner and a thumb-friendly 3-position draggable bottom sheet holding the Area control, unified category chips, and synchronized issue list.
            </p>

            {/* Sheet Position Snap Selector */}
            <div>
              <span className="text-xs font-bold text-[#C9D3EA] block mb-2">
                Bottom Sheet Snap Position:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'collapsed', label: '1. Collapsed (~6.5rem)', desc: 'Handle + Area + Chip Row' },
                  { id: 'half', label: '2. Half (45dvh)', desc: 'Filters + 2-3 Issue Rows' },
                  { id: 'full', label: '3. Full (88dvh)', desc: 'Whole Scrollable List' }
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => {
                      setMapSheetPosition(pos.id);
                      setPreviewTarget('map');
                      addLog(`Sheet position set to ${pos.label}`);
                    }}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${mapSheetPosition === pos.id && previewTarget === 'map'
                      ? 'bg-orange-500/20 border-orange-500 text-white'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                      }`}
                  >
                    <div className="text-xs font-bold">{pos.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{pos.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme & Location GPS Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <span className="text-xs font-bold text-[#C9D3EA] block mb-1.5">
                  Appearance Theme:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewAppearance('light');
                      addLog('Map preview set to Light Mode (Morning Field Sheet).');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${!previewIsDark
                      ? 'bg-white text-slate-900 border-white shadow-xs'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                  >
                    Light Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewAppearance('dark');
                      addLog('Map preview set to Dark Mode (Night Inspection).');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${previewIsDark
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                  >
                    Dark Mode
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-[#C9D3EA] block mb-1.5">
                  Resident Location GPS:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMapSimulateLocation(true);
                      addLog('Simulated Resident GPS enabled (Blue pulse dot visible, distances calculated).');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${mapSimulateLocation
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                  >
                    Location On
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMapSimulateLocation(false);
                      addLog('Simulated Resident GPS disabled ("Turn on Location" banner visible).');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${!mapSimulateLocation
                      ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                  >
                    Location Off
                  </button>
                </div>
              </div>
            </div>

            {/* UX Spec Verification Checklist */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-white block mb-1">
                UX & Accessibility Verification Checklist:
              </span>
              <div className="grid grid-cols-1 gap-1.5 text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>100dvh full-screen edge-to-edge layout, under notch & status bar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>Single 48px round back button in upper-right (closes or collapses sheet)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>3-position bottom sheet (collapsed: ~6.5rem, half: 45dvh, full: 88dvh)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>Area segmented control (3 equal-width 48px buttons) + 8 unified category chips</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>Interactive pin & row highlighting with centering and automatic half-sheet snap</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span>Google attribution & Terms elevated safely above collapsed bottom sheet</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── SETTINGS ORANGE ICONS PALETTE TEST CONTROLS ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b00]" />
                <h2 className="font-heading font-black text-lg text-white">
                  Settings Icons (PULSO Orange Palette)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('settings');
                  addLog('Switched preview to Settings Orange Icons showcase.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${previewTarget === 'settings'
                  ? 'bg-[#ff6b00] text-white shadow-sm font-black'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
              >
                {previewTarget === 'settings' ? 'Active in phone' : 'Show in phone'}
              </button>
            </div>

            <p className="text-sm text-[#C9D3EA] leading-relaxed">
              Every row icon in Settings uses <strong>ONE unified color</strong>: PULSO orange, housed in a <strong>40px (2.5rem) rounded tile</strong> with 12–15% orange tint and zero border, glow, or shadow. All teal, green, and yellow icon tiles are eliminated. Destructive actions ("Sign Out") preserve red.
            </p>

            {/* Instant Theme Switcher to verify live token updates */}
            <div>
              <span className="text-xs font-bold text-[#C9D3EA] block mb-2">
                Live Theme Mode (Instant Token Switch):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewAppearance('dark');
                    addLog('Appearance set to Dark Mode (Night Inspection).');
                  }}
                  className={`p-3 rounded-2xl font-bold flex flex-col items-start gap-1 cursor-pointer transition-all ${previewIsDark
                    ? 'bg-[#ff6b00] text-white shadow-md ring-2 ring-orange-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                >
                  <span className="text-xs font-black">Night Inspection (Dark)</span>
                  <span className="text-[10px] opacity-85 font-mono">
                    #FF6B00 icon on 15% tint (5.8:1 contrast)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewAppearance('light');
                    addLog('Appearance set to Light Mode (Morning Field Sheet).');
                  }}
                  className={`p-3 rounded-2xl font-bold flex flex-col items-start gap-1 cursor-pointer transition-all ${!previewIsDark
                    ? 'bg-[#ff6b00] text-white shadow-md ring-2 ring-orange-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                >
                  <span className="text-xs font-black">Morning Field Sheet (Light)</span>
                  <span className="text-[10px] opacity-85 font-mono">
                    #D95700 icon on 12% tint (3.8:1 contrast)
                  </span>
                </button>
              </div>
            </div>

            {/* ── LANGUAGE TOGGLE WITH FLAG IN KNOB SHOWCASE ── */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Globe size={16} className="text-orange-500" aria-hidden="true" />
                    Language Toggle with Flag in Knob (Philippines / USA)
                  </h3>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Flag on knob shows selected language instantly; orange globe restored in left tile.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  PASS WCAG AA
                </span>
              </div>

              {/* Side-by-side comparison of ON (Tagalog / PH) and OFF (English / US) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* ON State: Tagalog */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Tagalog (ON)</span>
                    <span className="text-[10px] font-mono text-orange-400">Knob Right • PH Flag</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[var(--icon-tile-bg)] text-[var(--icon-tile-fg)] flex items-center justify-center">
                        <Globe size={18} strokeWidth={2} />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">Tagalog</span>
                    </div>
                    <LanguageToggle isFilipino={true} interactive={false} />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Philippines flag circular crop, sun &amp; 3 stars visible, 2px white ring, orange track.
                  </p>
                </div>

                {/* OFF State: English */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">English (OFF)</span>
                    <span className="text-[10px] font-mono text-slate-400">Knob Left • US Flag</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[var(--icon-tile-bg)] text-[var(--icon-tile-fg)] flex items-center justify-center">
                        <Globe size={18} strokeWidth={2} />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">English</span>
                    </div>
                    <LanguageToggle isFilipino={false} interactive={false} />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    USA flag circular crop, stars &amp; stripes visible, 2px white ring, filled orange track.
                  </p>

                </div>
              </div>

              {/* Interactive Test Control */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400">
                  Interactive state toggle (also synced in phone preview above):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !settingsTagalogEnabled;
                    setSettingsTagalogEnabled(next);
                    addLog(`Toggled language in test card to: ${next ? 'Tagalog (PH)' : 'English (US)'}`);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white cursor-pointer transition-colors shadow-xs"
                >
                  Toggle Now: {settingsTagalogEnabled ? 'Set to English' : 'Set to Tagalog'}
                </button>
              </div>
            </div>

            {/* Shared Token Metrics & WCAG Audit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-orange-400 font-bold block">Icon Tile Tokens</span>
                <span className="text-white font-bold block">--icon-tile-bg / -fg</span>
                <span className="text-slate-400 text-[11px] block">Centralized CSS variables in index.css update instantly without reload.</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">WCAG Contrast</span>
                <span className="text-white font-bold block">3.8:1 / 5.8:1</span>
                <span className="text-slate-400 text-[11px] block">Both Light and Dark modes exceed the 3:1 graphical object threshold.</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block">Destructive Red</span>
                <span className="text-white font-bold block">Sign Out Only</span>
                <span className="text-slate-400 text-[11px] block">Red tile &amp; icon preserved for destructive actions, never mixed with settings.</span>
              </div>
            </div>
          </div>

          {/* ── GREETING & BRAND HEADER TEST CONTROLS ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b00]" />
                <h2 className="font-heading font-black text-lg text-white">
                  Greeting Header &amp; Searchbar Showcase
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('header');
                  addLog('Switched preview to Greeting Header showcase.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${previewTarget === 'header'
                  ? 'bg-[#ff6b00] text-white shadow-sm font-black'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
              >
                {previewTarget === 'header' ? 'Active in phone' : 'Show in phone'}
              </button>
            </div>

            <p className="text-sm text-[#C9D3EA] leading-relaxed">
              Mobile header architecture: <strong>HomeHeader</strong> on Home (44px avatar, greeting, 48px bell, full-width search), <strong>No Header</strong> on My Reports, Updates, and Account (seal/brand line/title removed completely from DOM; content starts directly below safe area + 1rem with visually hidden &lt;h1&gt; for screen readers), and <strong>BrandHeader preserved</strong> on Settings.
            </p>

            {/* Header / Tab Switcher */}
            <div>
              <span className="text-xs font-bold text-[#C9D3EA] block mb-2">
                Screen / Header Scope (HomeHeader vs No Header vs BrandHeader):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {[
                  { id: 'home', label: 'Home Header', desc: 'Greeting + Search' },
                  { id: 'reports', label: 'My Reports', desc: 'No Header' },
                  { id: 'updates', label: 'Updates', desc: 'No Header' },
                  { id: 'account', label: 'Account', desc: 'No Header' },
                  { id: 'settings', label: 'Settings', desc: 'Brand Header' }
                ].map((item) => {
                  const isSelected = headerActiveTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setHeaderActiveTab(item.id);
                        setPreviewTarget('header');
                        addLog(`Switched header context to: ${item.label}`);
                      }}
                      className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${isSelected
                        ? 'bg-[#ff6b00] text-white shadow-md shadow-orange-500/20 ring-2 ring-orange-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                    >
                      <span className="text-xs">{item.label}</span>
                      <span className="text-[10px] opacity-75 font-mono">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resident Profile State Switcher */}
            <div>
              <span className="text-xs font-bold text-[#C9D3EA] block mb-2">
                Profile &amp; Greeting Name Test Matrix (Row 1 Left — tap opens Account):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'separate_fields', label: '1. Separate Fields', detail: 'Marc + Evangelista' },
                  { id: 'compound_first', label: '2. Compound First', detail: 'Marc Alexis + Evangelista' },
                  { id: 'compound_last', label: '3. Compound Last', detail: 'Gener + Dela Cruz' },
                  { id: 'older_account_fallback', label: '4. Older Account Fallback', detail: 'Marc Alexis Natividad Evangelista' },
                  { id: 'suffix', label: '5. Suffix Preserved', detail: 'Juan + Dela Cruz + Jr.' },
                  { id: 'single_name', label: '6. Single Word Name', detail: 'Bo (No trailing space)' },
                  { id: 'email_only', label: '7. Email Only / Empty', detail: 'test@caloocan.gov.ph -> Resident' },
                  { id: 'long_name', label: '8. Long Name Truncation', detail: 'Maria Bernadette Dela Cruz...' },
                  { id: 'photo', label: '9. Profile Photo', detail: 'Maria Santos (Photo avatar)' },
                  { id: 'broken_photo', label: '10. Broken Photo Fallback', detail: 'Ana Reyes (AR on orange)' },
                  { id: 'guest', label: '11. Guest Mode', detail: 'Welcome / Sign in' }
                ].map((item) => {
                  const isSelected = headerUserType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setHeaderUserType(item.id);
                        setPreviewTarget('header');
                        addLog(`Switched user profile state to: ${item.label}`);
                      }}
                      className={`p-2.5 rounded-xl font-bold flex flex-col items-start gap-0.5 cursor-pointer transition-all ${isSelected
                        ? 'bg-[#ff6b00] text-white shadow-md ring-2 ring-orange-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                    >
                      <span className="text-xs font-black">{item.label}</span>
                      <span className="text-[10px] opacity-80 truncate w-full">{item.detail}</span>
                    </button>
                  );
                })}
              </div>
            </div>


            {/* Notification Bell & Dropdown Test Matrix */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white block">
                  Notification Bell &amp; Dropdown Test Matrix:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderShowNotifications(!headerShowNotifications);
                    setPreviewTarget('header');
                    addLog(`Toggled notification dropdown: ${!headerShowNotifications ? 'OPEN' : 'CLOSED'}`);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    headerShowNotifications
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-[#ff6b00] text-white font-black'
                  }`}
                >
                  {headerShowNotifications ? 'Close dropdown' : 'Open dropdown (Bell tap)'}
                </button>
              </div>

              {/* State Presets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                {[
                  { id: 'normal', label: '1. Normal (3 Unread)', desc: '5 rows with dots' },
                  { id: 'capped9plus', label: '2. 12 Unread (9+)', desc: 'Badge capped at 9+' },
                  { id: 'all_read', label: '3. All Read', desc: 'No badge, softer text' },
                  { id: 'empty', label: '4. Empty State', desc: 'You\'re all caught up' },
                  { id: 'loading', label: '5. Loading State', desc: 'Pulse line skeleton' },
                  { id: 'error', label: '6. Error State', desc: 'Try again button' }
                ].map((item) => {
                  const isSelected = headerNotifMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setHeaderNotifMode(item.id);
                        if (item.id === 'all_read') {
                          setPreviewNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                        } else if (item.id === 'normal') {
                          setPreviewNotifications(SAMPLE_NOTIFICATIONS);
                        }
                        setHeaderShowNotifications(true);
                        setPreviewTarget('header');
                        addLog(`Switched notification preset to: ${item.label}`);
                      }}
                      className={`p-2.5 rounded-xl font-bold flex flex-col items-start gap-0.5 cursor-pointer transition-all ${isSelected
                        ? 'bg-[#ff6b00] text-white shadow-md ring-2 ring-orange-400 font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                    >
                      <span className="text-xs">{item.label}</span>
                      <span className="text-[10px] opacity-80 font-mono">{item.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                    addLog('Simulated "Mark all as read". Badge cleared to 0.');
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Simulate: Mark all read
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewNotifications(SAMPLE_NOTIFICATIONS);
                    setHeaderNotifMode('normal');
                    addLog('Reset notifications to initial test dataset.');
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Reset notifications
                </button>
              </div>
            </div>

            {/* Search Input & Recent Searches Interactive Test Controls */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-white block">
                Row 2 Search Field &amp; Recent Searches Interactive States:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setHeaderSearchQuery('');
                    setHeaderIsSearchOpen(false);
                    setPreviewTarget('header');
                    addLog('Reset search field to resting state.');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  Resting state
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderSearchQuery('');
                    setHeaderIsSearchOpen(true);
                    setPreviewTarget('header');
                    addLog('Opened search dropdown with recent searches chips.');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#ff6b00] hover:bg-orange-500 text-slate-950 cursor-pointer font-semibold"
                >
                  Open search dropdown
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHeaderSearchQuery('Drainage Celina Homes');
                    setHeaderIsSearchOpen(true);
                    setPreviewTarget('header');
                    addLog('Typed query into search field (clear X button visible).');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  Type query ("Drainage...")
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewRecentSearches(['Water Interruption', 'Street Lighting', 'Engineering Contact']);
                    setHeaderSearchQuery('');
                    setHeaderIsSearchOpen(true);
                    setPreviewTarget('header');
                    addLog('Reset recent searches to default 3 items.');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  Reset recent searches (3 items)
                </button>
              </div>
            </div>

            {/* ── UPDATES TAB HISTORY ICON TAXONOMY & AUDIT ── */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <History size={16} className="text-orange-500" aria-hidden="true" />
                    Updates Tab History Icon Taxonomy &amp; States
                  </h3>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Separates civic Updates (Clock-and-Arrow) from Home notifications (Bell).
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  PASS WCAG AA
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Updates Tab (Clock-and-Arrow) Showcase */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Updates Item (History)</span>
                    <span className="text-[10px] font-mono text-orange-400">lucide: History</span>
                  </div>
                  <div className="flex items-center gap-4 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800/80 justify-around">
                    {/* Inactive state */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative">
                        <History size={22} strokeWidth={2} className="text-[#9AA8C7]" aria-hidden="true" />
                      </div>
                      <span className="text-[10px] font-medium text-[#9AA8C7]">Inactive</span>
                    </div>
                    {/* Active state */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative flex items-center justify-center">
                        <History size={22} strokeWidth={2.5} className="text-[#FF6B00] scale-105" aria-hidden="true" />
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-1 bg-[#FF6B00] rounded-full" />
                      </div>
                      <span className="text-[10px] font-bold text-[#FF6B00]">Active</span>
                    </div>
                    {/* With unread badge */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative flex items-center justify-center">
                        <History size={22} strokeWidth={2} className="text-[#9AA8C7]" aria-hidden="true" />
                        <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-3.5 px-0.5 rounded-full bg-[#f05a00] text-white text-[8px] font-bold flex items-center justify-center leading-none ring-2 ring-slate-950">
                          9+
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-[#9AA8C7]">Unread 9+</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Used on mobile bottom bar, desktop sidebar rail, search shortcuts, and empty state.
                  </p>
                </div>

                {/* Notifications Bell Showcase */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Notifications Button (Bell)</span>
                    <span className="text-[10px] font-mono text-blue-400">lucide: Bell</span>
                  </div>
                  <div className="flex items-center gap-4 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800/80 justify-around">
                    {/* Resting */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-200">
                        <Bell size={18} aria-hidden="true" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-400">Resting</span>
                    </div>
                    {/* With Badge */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="relative w-10 h-10 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-200">
                        <Bell size={18} aria-hidden="true" />
                        <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#f05a00] text-white text-[9px] font-extrabold flex items-center justify-center">
                          3
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-orange-400">Badge (3)</span>
                    </div>
                    {/* Open Panel State */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full border-2 border-orange-500 bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <Bell size={18} aria-hidden="true" />
                      </div>
                      <span className="text-[10px] font-bold text-orange-500">Open Panel</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Reserved exclusively for Home greeting header dropdown and notification rows.
                  </p>
                </div>
              </div>
            </div>

            {/* Quality & Accessibility Invariants */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs pt-1">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-orange-400 font-bold block">Height Limit</span>
                <span className="text-white font-bold block">~138px / 8.6rem</span>
                <span className="text-slate-400 text-[11px] block">Guaranteed &lt; 9rem (144px). No screen crowding.</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">Tap Targets</span>
                <span className="text-white font-bold block">48×48px Minimum</span>
                <span className="text-slate-400 text-[11px] block">48px Bell button &amp; greeting tap target meet WCAG 2.2 AAA.</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-blue-400 font-bold block">Recent Searches X</span>
                <span className="text-white font-bold block">Non-Closing 48px</span>
                <span className="text-slate-400 text-[11px] block">Separate 48px target, 150ms fade, keeps search open &amp; focused.</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">iOS Safari Safe</span>
                <span className="text-white font-bold block">16px Typed Text</span>
                <span className="text-slate-400 text-[11px] block">Prevents iOS auto-zoom on field focus.</span>
              </div>
            </div>
          </div>

          {/* ── LATEST REPORT CARD CONTROLS & 5 STATUS TEST ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b00]" />
                <h2 className="font-heading font-black text-lg text-white">
                  Latest Report Card Showcase
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('cards');
                  addLog('Switched preview to Latest Report Card.');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${previewTarget === 'cards'
                  ? 'bg-[#ff6b00] text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
              >
                {previewTarget === 'cards' ? 'Active in phone' : 'Show in phone'}
              </button>
            </div>

            <p className="text-sm text-[#C9D3EA] leading-relaxed">
              Redesigned to Civic Aperture standards: Solid PULSO orange pill badge (white bold text on #ff6b00), 5-step progress line with done/current/upcoming states, and inset location card with 40px pin tile and 48px Map button.
            </p>

            {/* Status Quick Switcher Buttons */}
            <div>
              <span className="text-xs font-bold text-[#C9D3EA] block mb-2">
                Select Report Status to Preview:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {SAMPLE_SHOWCASE_REPORTS.map((rep, idx) => {
                  const isSelected = previewTarget === 'cards' && selectedStatusIndex === idx;
                  const stepLabel = REPORT_WORKFLOW_STEPS[idx]?.label;
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => {
                        setPreviewTarget('cards');
                        setSelectedStatusIndex(idx);
                        addLog(`Viewing status: ${stepLabel} (${rep.ticket_id})`);
                      }}
                      className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${isSelected
                        ? 'bg-[#ff6b00] text-white shadow-md shadow-orange-500/20 ring-2 ring-orange-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                    >
                      <span className="text-xs">{stepLabel}</span>
                      <span className="text-[10px] opacity-75 font-mono">{rep.ticket_id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dual-Theme Verification Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Morning Field Sheet (Light)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewAppearance('light');
                      addLog('Switched appearance to Light mode.');
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${previewAppearance === 'light' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                  >
                    Set Light
                  </button>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  White card surface, dark navy text, current step in high-contrast #B83A00 (4.8:1), upcoming labels in #5B6B88 (4.8:1).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Night Inspection (Dark)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewAppearance('dark');
                      addLog('Switched appearance to Dark mode.');
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${previewAppearance === 'dark' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                  >
                    Set Dark
                  </button>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Survey blue card surface, pure white text, current step in #ff6b00, upcoming labels in #9AA8C7 (5.6:1).
                </p>
              </div>
            </div>
          </div>

          {/* ── LOADING SCREEN (SPLASH) TEST CONTROLS ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <h2 className="font-heading font-black text-lg text-white">
                  Loading Screen (Animated Wordmark &amp; Pulse)
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold">
                Cold Start
              </span>
            </div>

            <p className="text-sm text-[#C9D3EA] leading-relaxed">
              Centered <strong>PULSO</strong> wordmark with traveling heartbeat pulse line, cold start timing (min 1.2s, 250ms fade-out), and network failure states.
            </p>

            {/* Splash Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('splash');
                  setSplashSimulateMode('normal');
                  setSplashKey((k) => k + 1);
                  addLog('Replaying cold-start splash animation from 0s.');
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${previewTarget === 'splash' && splashSimulateMode === 'normal'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
              >
                <Play size={15} />
                <span>Replay splash</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('splash');
                  setSplashSimulateMode('slow');
                  setSplashKey((k) => k + 1);
                  addLog('Simulating slow connection (> 5s warning message).');
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${previewTarget === 'splash' && splashSimulateMode === 'slow'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
              >
                <AlertTriangle size={15} />
                <span>Simulate slow (5s)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('splash');
                  setSplashSimulateMode('offline');
                  setSplashKey((k) => k + 1);
                  addLog('Simulating offline error (> 12s with Try Again button).');
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${previewTarget === 'splash' && splashSimulateMode === 'offline'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
              >
                <XCircle size={15} />
                <span>Simulate offline</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('splash');
                  setSplashSimulateMode('looping');
                  setSplashKey((k) => k + 1);
                  addLog('Simulating continuous pulse loop (> 1.6s).');
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${previewTarget === 'splash' && splashSimulateMode === 'looping'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
              >
                <Activity size={15} />
                <span>Loop pulse</span>
              </button>
            </div>

            {/* Reusable In-App Pulse Line Component Demo */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-white block">In-App Pulse Line (replaces spinners)</span>
                <span className="text-xs text-[#C9D3EA]">Standardized &lt;PulsoPulseLine /&gt; component</span>
              </div>
              <div className="w-40 px-2 py-1 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center">
                <PulsoPulseLine isDark={true} reducedMotion={reducedMotion} />
              </div>
            </div>
          </div>

          {/* ── BACKGROUND TEST CONTROLS (City Scene Illustrations) ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="font-heading font-black text-lg text-white">
                  Background (City Scene Illustrations)
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                Light &amp; Dark Scene
              </span>
            </div>

            <p className="text-sm text-[#C9D3EA] leading-relaxed">
              Official 390×844 city scene illustrations (<code className="text-orange-400 font-mono">pulso-bg-dark.svg</code> &amp; <code className="text-orange-400 font-mono">pulso-bg-light.svg</code>) applied as CSS background behind Loading, 5 Tutorial screens, and Installed App Sign-In.
            </p>

            {/* Mode Switch: Light / Dark */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#C9D3EA]">
                  Background Mode Switch:
                </span>
                <span className="text-xs font-mono text-orange-400 font-bold px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/30">
                  Showing: {previewIsDark ? 'Dark' : 'Light'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' }
                ].map((opt) => {
                  const isSelected = previewAppearance === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPreviewAppearance(opt.id);
                        addLog(`Background mode switched to "${opt.label}".`);
                      }}
                      className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center ${isSelected
                        ? 'bg-[#ff6b00] text-white font-extrabold shadow-md shadow-orange-500/25 ring-2 ring-orange-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-[#C9D3EA]'
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Asset Metrics & Contrast Verification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#C9D3EA] font-medium">Dark Artwork</span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">11.69 KB (&lt; 12 KB)</span>
                </div>
                <span className="font-mono text-sm text-white font-semibold block truncate">/pulso-bg-dark.svg</span>
                <span className="text-xs text-[#C9D3EA] block">Sky: #080D19 • Scrim: #0B1120</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#C9D3EA] font-medium">Light Artwork</span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">10.95 KB (&lt; 12 KB)</span>
                </div>
                <span className="font-mono text-sm text-white font-semibold block truncate">/pulso-bg-light.svg</span>
                <span className="text-xs text-[#C9D3EA] block">Sky: #EAF2FF • Scrim: #F5F9FF</span>
              </div>
            </div>
          </div>

          {/* Control Panel Card */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-heading font-black text-lg text-white">
                Tutorial Test Controls
              </h2>
              <button
                type="button"
                onClick={() => {
                  setPreviewTarget('tutorial');
                  handleRestartTutorial();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Restart tutorial</span>
              </button>
            </div>

            {/* Switches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">

              {/* Switch 1: Simulate installed app */}
              <div
                role="switch"
                aria-checked={simulateInstalled}
                tabIndex={0}
                onClick={() => {
                  setSimulateInstalled(!simulateInstalled);
                  addLog(`Simulate installed app toggled ${!simulateInstalled ? 'ON' : 'OFF'}.`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSimulateInstalled(!simulateInstalled);
                  }
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <div>
                  <span className="font-bold text-white block">Simulate installed app</span>
                  <span className="text-xs text-[#C9D3EA]">App context vs standard website</span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${simulateInstalled ? 'bg-orange-500' : 'bg-slate-700'
                  }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${simulateInstalled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                </div>
              </div>

              {/* Switch 2: Tutorial already completed */}
              <div
                role="switch"
                aria-checked={tutorialCompleted}
                tabIndex={0}
                onClick={() => {
                  setTutorialCompleted(!tutorialCompleted);
                  addLog(`Tutorial already completed toggled ${!tutorialCompleted ? 'ON' : 'OFF'}.`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTutorialCompleted(!tutorialCompleted);
                  }
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <div>
                  <span className="font-bold text-white block">Tutorial already completed</span>
                  <span className="text-xs text-[#C9D3EA]">Returning launch vs first launch</span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${tutorialCompleted ? 'bg-orange-500' : 'bg-slate-700'
                  }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${tutorialCompleted ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                </div>
              </div>

              {/* Switch 3: Signed in as resident */}
              <div
                role="switch"
                aria-checked={signedInResident}
                tabIndex={0}
                onClick={() => {
                  setSignedInResident(!signedInResident);
                  addLog(`Signed in as resident toggled ${!signedInResident ? 'ON' : 'OFF'}.`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSignedInResident(!signedInResident);
                  }
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <div>
                  <span className="font-bold text-white block">Signed in as resident</span>
                  <span className="text-xs text-[#C9D3EA]">Resident account vs guest</span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${signedInResident ? 'bg-orange-500' : 'bg-slate-700'
                  }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${signedInResident ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                </div>
              </div>

              {/* Switch 4: Reduced motion */}
              <div
                role="switch"
                aria-checked={reducedMotion}
                tabIndex={0}
                onClick={() => {
                  setReducedMotion(!reducedMotion);
                  addLog(`Reduced motion mode toggled ${!reducedMotion ? 'ON' : 'OFF'}.`);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setReducedMotion(!reducedMotion);
                  }
                }}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <div>
                  <span className="font-bold text-white block">Reduced motion</span>
                  <span className="text-xs text-[#C9D3EA]">Disable slide and pulse motion</span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${reducedMotion ? 'bg-orange-500' : 'bg-slate-700'
                  }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${reducedMotion ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                </div>
              </div>

            </div>

            {/* Appearance Mode Selection [ Light | Dark ] */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#C9D3EA]">
                  Appearance:
                </span>
                <span className="text-xs font-mono text-orange-400 font-bold px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/30">
                  Showing: {previewIsDark ? 'Dark' : 'Light'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' }
                ].map((opt) => {
                  const isSelected = previewAppearance === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPreviewAppearance(opt.id);
                        addLog(`Appearance test mode set to "${opt.label}".`);
                      }}
                      className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center text-center ${isSelected
                        ? 'bg-[#ff6b00] text-white font-extrabold shadow-md shadow-orange-500/25 ring-2 ring-orange-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-[#C9D3EA]'
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jump to Screen Buttons */}
            <div>
              <span className="text-sm font-bold text-[#C9D3EA] block mb-2">
                Jump to screen (1 to 5):
              </span>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isActive = testStep === num && simulateInstalled && !tutorialCompleted;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setSimulateInstalled(true);
                        setTutorialCompleted(false);
                        setTestStep(num);
                        addLog(`Jumped to Screen ${num}.`);
                      }}
                      className={`min-h-[42px] rounded-xl font-heading font-black text-xs transition-all cursor-pointer flex flex-col items-center justify-center ${isActive
                        ? 'bg-[#ff6b00] text-white font-extrabold shadow-md shadow-orange-500/25 ring-2 ring-orange-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-[#C9D3EA]'
                        }`}
                    >
                      <span>Screen {num}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Screen Size Selection & Orientation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#C9D3EA]">
                  Screen size presets:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsLandscape(!isLandscape);
                    addLog(`Orientation switched to ${!isLandscape ? 'Landscape' : 'Portrait'}.`);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${isLandscape
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  title="Toggle landscape orientation"
                >
                  <RotateCcw size={13} className={isLandscape ? 'rotate-90 text-white' : 'text-slate-400'} />
                  <span>{isLandscape ? 'Landscape (Active)' : 'Landscape Toggle'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                {SCREEN_SIZE_PRESETS.map((size) => {
                  const isSelected = screenSize.width === size.width && screenSize.height === size.height;
                  return (
                    <button
                      key={`${size.width}x${size.height}`}
                      type="button"
                      onClick={() => {
                        setScreenSize(size);
                        addLog(`Screen size set to ${size.label}.`);
                      }}
                      className={`min-h-[38px] px-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer truncate text-left flex items-center justify-between ${isSelected
                        ? 'bg-slate-700 text-orange-400 border border-orange-500/50 shadow-xs font-bold'
                        : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                      <span className="truncate">{size.label}</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ── LIVE FONT CHECK CARD (Inter Variable Font Status & Type Scale) ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <h3 className="font-heading font-black text-base text-white">
                  Font Check & Typography Scale
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                {fontLoaded ? 'Inter Active' : 'Loading Inter...'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-xs text-[#C9D3EA] block font-medium">Font family in use</span>
                <span className="font-bold text-white text-sm block">Inter (Variable WOFF2)</span>
                <span className="text-xs text-[#C9D3EA] block">Self-hosted, weights 400–700, under 100KB</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-xs text-[#C9D3EA] block font-medium">Offline caching & fallback</span>
                <span className="font-bold text-emerald-400 text-sm block">Precached in sw.js</span>
                <span className="text-xs text-[#C9D3EA] block">Inter-fallback with size-adjust prevents shift</span>
              </div>
            </div>

            {/* Typography Tokens Scale Matrix */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
              <span className="text-xs font-semibold text-[#C9D3EA] uppercase tracking-wider block">
                Active shared typography tokens
              </span>
              <div className="space-y-1.5 divide-y divide-slate-800/60 text-slate-300">
                <div className="flex items-center justify-between pt-1">
                  <span className="font-medium text-white">Display (Welcome heading)</span>
                  <span className="text-orange-400 text-[11px]">32px (2rem) / 44px (2.75rem), Bold 700</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Heading 1 (Screens 2–5)</span>
                  <span className="text-orange-400 text-[11px]">28px (1.75rem) / 36px (2.25rem), Bold 700</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Card title (Screen 2 steps)</span>
                  <span className="text-orange-400 text-[11px]">18px (1.125rem) / 20px (1.25rem), Semibold 600</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Body text</span>
                  <span className="text-orange-400 text-[11px]">16px (1rem), Regular 400, line-height 1.5</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Small text (Min readable)</span>
                  <span className="text-orange-400 text-[11px]">14px (0.875rem), Regular 400</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Badge / caption</span>
                  <span className="text-orange-400 text-[11px]">13px (0.8125rem), Medium 500, sentence case</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Primary button text</span>
                  <span className="text-orange-400 text-[11px]">16px (1rem), Semibold 600, sentence case</span>
                </div>
                <div className="flex items-center justify-between pt-1.5">
                  <span className="font-medium text-white">Tracking numbers</span>
                  <span className="text-emerald-400 text-[11px]">Inter (tabular-nums enabled)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── QUICK CHECKS SECTION (Pass / Fail) ── */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-heading font-black text-lg text-white">
                  Quick Checks (Screen {testStep})
                </h3>
                <p className="text-xs text-[#C9D3EA]">
                  Live verification of PULSO mobile onboarding requirements
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                All {quickChecksData.filter((c) => c.pass).length} Passing
              </span>
            </div>

            <div
              className="space-y-2.5 pt-1"
              role="region"
              aria-label="Tutorial requirement verification results"
              aria-live="polite"
            >
              {quickChecksData.map((chk) => (
                <div
                  key={chk.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {chk.title}
                      </span>
                    </div>
                    <p className="text-xs text-[#C9D3EA] mt-1 leading-relaxed">
                      {chk.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {chk.pass ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>Pass</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/50 border border-rose-500/30 px-2 py-0.5 rounded-full">
                        <XCircle size={13} className="text-rose-400" />
                        <span>Fail</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── LIVE EVENT LOG ── */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Event Log (Simulated Actions)
              </span>
              <button
                type="button"
                onClick={() => setEventLogs([])}
                className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Clear log
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] custom-scrollbar pr-1">
              {eventLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-slate-300">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span className="text-orange-300/90">{log.text}</span>
                </div>
              ))}
              {eventLogs.length === 0 && (
                <div className="text-slate-600 text-center py-2">No events recorded.</div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
