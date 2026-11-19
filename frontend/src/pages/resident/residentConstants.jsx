import { User, MoreHorizontal, Camera, Search, BookOpen, Handshake, Plus, Droplets, Zap, FileText, Map as MapIcon, Home, TrendingUp, History } from 'lucide-react';

const REPORT_CATEGORIES = (t) => [
    { value: 'Water Supply & Distribution', label: t('landing.solutions.s1_title', { defaultValue: 'Water Supply & Distribution' }) },
    { value: 'Power & Street Lighting', label: t('landing.solutions.s2_title', { defaultValue: 'Power & Street Lighting' }) },
    { value: 'Roads & Bridges', label: t('landing.solutions.s3_title', { defaultValue: 'Roads & Bridges' }) },
    { value: 'Traffic & Road Signs', label: t('landing.solutions.traffic_title', { defaultValue: 'Traffic & Road Signs' }) },
    { value: 'Public Safety & Hazards', label: t('landing.solutions.s4_title', { defaultValue: 'Public Safety & Hazards' }) },
    { value: 'Public Buildings & Facilities', label: t('landing.solutions.s5_title', { defaultValue: 'Public Buildings & Facilities' }) },
    { value: 'Electrical Wiring', label: 'Electrical Wiring' },
    { value: 'Others', label: t('landing.solutions.s6_title', { defaultValue: 'Others' }) },
];

const MAP_CATEGORY_CHIPS = (t) => [
    { id: 'all', label: t('dashboard.map.allIncidents', { defaultValue: 'All Incidents' }) },
    ...REPORT_CATEGORIES(t).map(c => ({ id: c.value, label: c.label }))
];

const SIMULATED_HAZARDS = [
    { id: 1, category: 'Flooding', title: 'Deep Puddles on Highway', lat: 14.7566, lng: 121.0450, status: 'pending', time: '10 mins ago', distance: '1.2 km' },
    { id: 2, category: 'Road Issue', title: 'Cracked Surface', lat: 14.7610, lng: 121.0480, status: 'unverified', time: '1 hr ago', distance: '2.5 km' },
    { id: 3, category: 'Electrical', title: 'Fallen Wire Hazard', lat: 14.7520, lng: 121.0410, status: 'pending', time: '5 hrs ago', distance: '0.8 km' },
    { id: 4, category: 'Waste Management', title: 'Uncollected Trash Blockage', lat: 14.7590, lng: 121.0390, status: 'pending', time: '1 day ago', distance: '3.1 km' },
    { id: 5, category: 'Flooding', title: 'Blocked City Drainage', lat: 14.7650, lng: 121.0500, status: 'pending', time: '30 mins ago', distance: '4.0 km' },
    { id: 6, category: 'Road Issue', title: 'Severe Pothole', lat: 14.7480, lng: 121.0350, status: 'resolved', time: '2 days ago', distance: '1.5 km' },
    { id: 7, category: 'Public Safety', title: 'Broken Street Light', lat: 14.7630, lng: 121.0420, status: 'pending', time: '2 hrs ago', distance: '0.5 km' },
    { id: 8, category: 'Electrical', title: 'Transformer Sparking', lat: 14.7540, lng: 121.0550, status: 'pending', time: '4 hrs ago', distance: '2.2 km' }
];

const EMERGENCY_HOTLINES = (t) => [
    { name: t('dashboard.help.cityEng', { defaultValue: 'City Engineering' }), tags: 'Public Works, Hazards', num: '888-1234', color: 'orange' },
    { name: t('dashboard.help.maynilad', { defaultValue: 'Maynilad' }), tags: 'Water Leaks, Drainage', num: '1626', color: 'blue' },
    { name: t('dashboard.help.meralco', { defaultValue: 'Meralco' }), tags: 'Live Wires, Outages', num: '16211', color: 'yellow' }
];

const QUICK_FUNCTIONS_DATA = (t) => [
    { id: 'report', icon: <Camera size={22} />, label: t('dashboard.quickReport.title', { defaultValue: 'File Report' }), color: 'orange', modal: 'file-report' },
    { id: 'map', icon: <MapIcon size={22} />, label: t('dashboard.sidebar.map', { defaultValue: 'Barangay Map' }), color: 'blue', modal: 'map' },
    { id: 'services', icon: <Handshake size={22} />, label: t('dashboard.sidebar.services', { defaultValue: 'LGU Services' }), color: 'green', modal: 'services' },
    { id: 'knowledge', icon: <BookOpen size={22} />, label: t('dashboard.sidebar.knowledge', { defaultValue: 'Knowledge Base' }), color: 'indigo', modal: 'knowledge' },
    { id: 'track', icon: <Search size={22} />, label: t('dashboard.sidebar.track', { defaultValue: 'Track Issue' }), color: 'teal', tab: 'reports' }
];

const NAV_ITEMS = (t) => [
    { id: 'overview', icon: <Home size={22} strokeWidth={2} aria-hidden="true" />, label: t('dashboard.sidebar.home', { defaultValue: 'Home' }) },
    { id: 'reports', icon: <FileText size={22} strokeWidth={2} aria-hidden="true" />, label: t('dashboard.sidebar.reports', { defaultValue: 'My reports' }) },
    { id: 'report', icon: <Plus size={24} strokeWidth={3} aria-hidden="true" />, label: t('dashboard.sidebar.report', { defaultValue: 'Report' }), isAction: true },
    { id: 'updates', icon: <History size={22} strokeWidth={2} aria-hidden="true" />, label: t('dashboard.sidebar.updates', { defaultValue: 'Updates' }) },
    { id: 'more', icon: <MoreHorizontal size={22} strokeWidth={2} aria-hidden="true" />, label: t('dashboard.sidebar.more', { defaultValue: 'More' }) },
];

const LGU_SERVICES_LIST = (t) => [
    { id: 1, name: 'Business Permit', icon: <TrendingUp size={24} />, desc: 'Renew or apply for new business permits online.', color: 'blue', url: 'https://caloocancity.gov.ph/business-permit/' },
    { id: 2, name: 'Barangay Clearance', icon: <FileText size={24} />, desc: 'Request official residency documents.', color: 'orange', url: 'https://caloocancity.gov.ph/' },
    { id: 3, name: 'Health Service', icon: <Droplets size={24} />, desc: 'Book appointments at local health centers.', color: 'red', url: 'https://caloocancity.gov.ph/health-services-department/' },
    { id: 4, name: 'PWD/Senior ID', icon: <User size={24} />, desc: 'Apply for social welfare identification.', color: 'green', url: 'https://caloocancity.gov.ph/social-welfare/' },
    { id: 5, name: 'Tax Payment', icon: <Zap size={24} />, desc: 'Pay property and occupation taxes.', color: 'yellow', url: 'https://caloocancity.gov.ph/online-tax-payment/' },
    { id: 6, name: 'Scholarships', icon: <BookOpen size={24} />, desc: 'City-funded educational assistance programs.', color: 'indigo', url: 'https://caloocancity.gov.ph/scholarships/' },
];

const KNOWLEDGE_BASE_ARTICLES = (t) => [
    { id: 1, title: t('knowledge.art1.title', { defaultValue: 'How AI Reporting Works' }), category: t('knowledge.cat.tech', { defaultValue: 'Tech Guide' }), excerpt: t('knowledge.art1.excerpt', { defaultValue: 'Learn how Gemini AI verifies your incident reports in real-time.' }) },
    { id: 2, title: t('knowledge.art2.title', { defaultValue: 'Flood Evacuation Routes' }), category: t('knowledge.cat.emergency', { defaultValue: 'Emergency' }), excerpt: t('knowledge.art2.excerpt', { defaultValue: 'Safe zones and routes for residents in Low-lying North Caloocan areas.' }) },
    { id: 3, title: t('knowledge.art3.title', { defaultValue: 'Engineering Permit Guide' }), category: t('knowledge.cat.publicWorks', { defaultValue: 'Public Works' }), excerpt: t('knowledge.art3.excerpt', { defaultValue: 'Step-by-step guide on applying for building and excavation permits in Caloocan North.' }) },
    { id: 4, title: t('knowledge.art4.title', { defaultValue: 'Noise Ordinance Info' }), category: t('knowledge.cat.community', { defaultValue: 'Community' }), excerpt: t('knowledge.art4.excerpt', { defaultValue: 'Understanding the city wide peace and order regulations.' }) },
];

export { QUICK_FUNCTIONS_DATA, NAV_ITEMS, EMERGENCY_HOTLINES, KNOWLEDGE_BASE_ARTICLES, LGU_SERVICES_LIST };
