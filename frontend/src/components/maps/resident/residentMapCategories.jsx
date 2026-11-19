import { AlertTriangle, Menu, Droplets, Zap, Signpost, Building2, Waves, Lightbulb, Trash2 } from 'lucide-react';
import { CALOOCAN_BARANGAYS } from "../../../utils/philippineAddress";

// Complete 188 Caloocan Barangays (North Caloocan 165-188 & South Caloocan 1-164)
const ALL_CALOOCAN_BARANGAYS_FOR_PICKER = [
    { value: 'all', label: 'All Barangays', sector: 'all', number: 0 },
    // North Caloocan (165 to 188)
    ...(CALOOCAN_BARANGAYS || []).filter(b => b.number >= 165 && b.number <= 188).map(b => ({
        value: `Barangay ${b.number}`,
        label: `Barangay ${b.number}`,
        sector: 'north',
        number: b.number,
        alias: b.alias
    })),
    // South Caloocan (1 to 164)
    ...(CALOOCAN_BARANGAYS || []).filter(b => b.number >= 1 && b.number <= 164).map(b => ({
        value: `Barangay ${b.number}`,
        label: `Barangay ${b.number}`,
        sector: 'south',
        number: b.number,
        alias: b.alias
    }))
];

// RoadIcon matching ResidentDashboard
const RoadIcon = ({ size = 20, className = "", style = {} }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
    >
        <path d="M4 19L9 5M20 19L15 5M12 7V9M12 13V15M12 19V21" />
    </svg>
);

// Authoritative Category Configuration (Matches Approved "What can you report?" Design Image)
const ISSUE_CATEGORIES = [
    {
        id: 'all',
        label: 'All',
        shortLabel: 'All',
        color: '#EA580C',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        textColor: 'text-orange-700 dark:text-orange-300',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: Menu
    },
    {
        id: 'roads',
        label: 'Roads & bridges',
        shortLabel: 'Roads',
        color: '#EA580C',
        bgColor: 'bg-orange-50 dark:bg-orange-950/40',
        textColor: 'text-orange-700 dark:text-orange-300',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: RoadIcon
    },
    {
        id: 'drainage',
        label: 'Drainage & flooding',
        shortLabel: 'Drainage',
        color: '#06B6D4',
        bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
        textColor: 'text-cyan-700 dark:text-cyan-300',
        borderColor: 'border-cyan-200 dark:border-cyan-800',
        icon: Waves
    },
    {
        id: 'streetlights',
        label: 'Street lighting',
        shortLabel: 'Lighting',
        color: '#F59E0B',
        bgColor: 'bg-amber-50 dark:bg-amber-950/40',
        textColor: 'text-amber-700 dark:text-amber-300',
        borderColor: 'border-amber-200 dark:border-amber-800',
        icon: Lightbulb
    },
    {
        id: 'water',
        label: 'Water supply',
        shortLabel: 'Water',
        color: '#0EA5E9',
        bgColor: 'bg-sky-50 dark:bg-sky-950/40',
        textColor: 'text-sky-700 dark:text-sky-300',
        borderColor: 'border-sky-200 dark:border-sky-800',
        icon: Droplets
    },
    {
        id: 'safety',
        label: 'Public safety hazards',
        shortLabel: 'Safety',
        color: '#F43F5E',
        bgColor: 'bg-rose-50 dark:bg-rose-950/40',
        textColor: 'text-rose-700 dark:text-rose-300',
        borderColor: 'border-rose-200 dark:border-rose-800',
        icon: AlertTriangle
    },
    {
        id: 'traffic',
        label: 'Traffic & road signs',
        shortLabel: 'Traffic',
        color: '#A855F7',
        bgColor: 'bg-purple-50 dark:bg-purple-950/40',
        textColor: 'text-purple-700 dark:text-purple-300',
        borderColor: 'border-purple-200 dark:border-purple-800',
        icon: Signpost
    },
    {
        id: 'facilities',
        label: 'Public facilities',
        shortLabel: 'Buildings',
        color: '#6366F1',
        bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
        textColor: 'text-indigo-700 dark:text-indigo-300',
        borderColor: 'border-indigo-200 dark:border-indigo-800',
        icon: Building2
    },
    {
        id: 'electrical',
        label: 'Electrical wiring',
        shortLabel: 'Electrical',
        color: '#EAB308',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/40',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        icon: Zap
    },
    {
        id: 'waste',
        label: 'Waste management',
        shortLabel: 'Waste',
        color: '#10B981',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
        textColor: 'text-emerald-700 dark:text-emerald-300',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        icon: Trash2
    }
];

const CATEGORY_TILES = ISSUE_CATEGORIES.map(c => ({
    id: c.id,
    shortLabel: c.shortLabel || c.label,
    fullLabel: c.label,
    icon: c.icon
}));

const MAP_CATEGORIES = ISSUE_CATEGORIES.map(c => ({
    id: c.id,
    label: c.label
}));

function classifyTextToCategoryId(text) {
    if (!text || typeof text !== 'string') return null;
    const str = text.trim().toLowerCase();
    if (!str || str === 'others' || str === 'other' || str === 'general' || str === 'civic infrastructure report') return null;

    // 1. Traffic & Road Signs (must check before roads because of "road signs")
    if (
        str.includes('traffic') ||
        str.includes('road sign') ||
        str.includes('street sign') ||
        str.includes('signage') ||
        str.includes('signal') ||
        str.includes('semaforo') ||
        str.includes('stoplight') ||
        str.includes('crossing') ||
        str.includes('lane marking')
    ) {
        return 'traffic';
    }

    // 2. Public Safety Hazards
    if (
        str.includes('safety') ||
        str.includes('hazard') ||
        str.includes('danger') ||
        str.includes('sunog') ||
        str.includes('fire') ||
        str.includes('collapse') ||
        str.includes('emergency') ||
        str.includes('open manhole') ||
        str.includes('sinkhole') ||
        str.includes('unstable') ||
        str.includes('tree fallen') ||
        str.includes('falling debris')
    ) {
        return 'safety';
    }

    // 3. Street Lighting (including canonical "Power & Street Lighting" or "Streetlights")
    if (
        str.includes('street light') ||
        str.includes('streetlight') ||
        str.includes('street lighting') ||
        str.includes('power & street lighting') ||
        str.includes('lighting') ||
        str.includes('lamp') ||
        str.includes('poste') ||
        str.includes('ilaw') ||
        str.includes('busted light') ||
        str.includes('flicker') ||
        str.includes('bulb')
    ) {
        return 'streetlights';
    }

    // 4. Electrical Wiring (live wire, dangling wire, transformer, high voltage, kuryente)
    if (
        str.includes('wire') ||
        str.includes('wiring') ||
        str.includes('kuryente') ||
        str.includes('electric') ||
        str.includes('transformer') ||
        str.includes('cable') ||
        str.includes('power line') ||
        str.includes('high voltage') ||
        str.includes('blackout') ||
        str.includes('brownout')
    ) {
        return 'electrical';
    }

    // 5. Drainage & Flooding
    if (
        str.includes('drain') ||
        str.includes('flood') ||
        str.includes('baha') ||
        str.includes('canal') ||
        str.includes('kanal') ||
        str.includes('gutter') ||
        str.includes('sewer') ||
        str.includes('estero') ||
        str.includes('barado') ||
        str.includes('clog') ||
        str.includes('culvert') ||
        str.includes('overflow')
    ) {
        return 'drainage';
    }

    // 6. Water Supply (water supply, water distribution, pipe leak, tubo, tubig, maynilad)
    if (
        str.includes('water supply') ||
        str.includes('water distribution') ||
        str.includes('water network') ||
        str.includes('maynilad') ||
        str.includes('pipe') ||
        str.includes('tubo') ||
        str.includes('water leak') ||
        str.includes('burst pipe') ||
        str.includes('low pressure') ||
        (str.includes('water') && !str.includes('waterway') && !str.includes('flood') && !str.includes('baha') && !str.includes('drain')) ||
        (str.includes('tubig') && !str.includes('baha'))
    ) {
        return 'water';
    }

    // 7. Waste Management
    if (
        str.includes('waste') ||
        str.includes('garbage') ||
        str.includes('basura') ||
        str.includes('dump') ||
        str.includes('trash') ||
        str.includes('litter') ||
        str.includes('uncollected') ||
        str.includes('collection') ||
        str.includes('smell') ||
        str.includes('dumi')
    ) {
        return 'waste';
    }

    // 8. Public Facilities
    if (
        str.includes('building') ||
        str.includes('facilit') ||
        str.includes('hall') ||
        str.includes('park') ||
        str.includes('court') ||
        str.includes('school') ||
        str.includes('center') ||
        str.includes('plaza') ||
        str.includes('barangay hall') ||
        str.includes('gym')
    ) {
        return 'facilities';
    }

    // 9. Roads & Bridges
    if (
        str.includes('road') ||
        str.includes('bridge') ||
        str.includes('pothole') ||
        str.includes('lubak') ||
        str.includes('kalsada') ||
        str.includes('tulay') ||
        str.includes('asphalt') ||
        str.includes('pavement') ||
        str.includes('sidewalk') ||
        str.includes('curb') ||
        str.includes('crack') ||
        str.includes('driveway') ||
        str.includes('infrastructure')
    ) {
        return 'roads';
    }

    return null;
}

function getReportCategoryMeta(report) {
    if (!report) return ISSUE_CATEGORIES[1]; // Roads fallback

    // 1. Authoritative category field assigned to report (exact match / keywords)
    const rawCat = report.category || report.raw_category;
    let catId = classifyTextToCategoryId(rawCat);

    // 2. AI Category
    if (!catId && report.ai_category) {
        catId = classifyTextToCategoryId(report.ai_category);
    }

    // 3. Title
    if (!catId && report.title) {
        catId = classifyTextToCategoryId(report.title);
    }

    // 4. Tags
    if (!catId && report.tags) {
        catId = classifyTextToCategoryId(report.tags);
    }

    // 5. Description as last resort
    if (!catId && report.description) {
        catId = classifyTextToCategoryId(report.description);
    }

    const finalId = catId || 'roads';
    return ISSUE_CATEGORIES.find(c => c.id === finalId) || ISSUE_CATEGORIES[1];
}

function matchesCategory(r, catId) {
    if (!catId || catId === 'all') return true;
    const meta = getReportCategoryMeta(r);
    return meta.id === catId;
}

function getCategoryColor(categoryOrReport) {
    if (!categoryOrReport) return '#EA580C';
    const obj = typeof categoryOrReport === 'object' ? categoryOrReport : { category: categoryOrReport };
    const meta = getReportCategoryMeta(obj);
    return meta.color || '#EA580C';
}

function getCategoryIconComponent(category, rawCategory) {
    const meta = getReportCategoryMeta({ category, raw_category: rawCategory });
    return meta.icon;
}

export { ALL_CALOOCAN_BARANGAYS_FOR_PICKER, ISSUE_CATEGORIES, getReportCategoryMeta, matchesCategory, CATEGORY_TILES, MAP_CATEGORIES, classifyTextToCategoryId, getCategoryColor, getCategoryIconComponent };
