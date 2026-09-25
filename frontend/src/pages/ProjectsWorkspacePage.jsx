import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Copy,
    Download,
    Eye,
    FileCheck,
    FileCode,
    FileSpreadsheet,
    FileText,
    Filter,
    FolderKanban,
    Layers,
    MapPin,
    MinusCircle,
    Plus,
    Printer,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Truck,
    UploadCloud,
    UserCheck,
    Wrench,
    X,
    XCircle,
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import GovernmentWorkspaceTabs from '../components/GovernmentWorkspaceTabs';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import GovBreadcrumb from '../components/GovBreadcrumb';
import { API_BASE_URL } from '../utils/apiBase';
import './projects-workspace.css';

const PROJECT_TABS = [
    { key: 'all', label: 'All stages' },
    { key: 'needs_assessment', label: 'Needs assessment' },
    { key: 'survey', label: 'Survey' },
    { key: 'design_and_estimate', label: 'Design and estimate' },
    { key: 'approval', label: 'Approval' },
    { key: 'procurement', label: 'Procurement' },
    { key: 'construction', label: 'Construction' },
    { key: 'inspection', label: 'Inspection' },
    { key: 'close', label: 'Close' },
];

const PULSELINE_PROJECT_STEPS = [
    { key: 'request', label: 'Request' },
    { key: 'assessment', label: 'Assessment' },
    { key: 'survey', label: 'Survey' },
    { key: 'design', label: 'Design & est.' },
    { key: 'approval', label: 'Approval' },
    { key: 'procurement', label: 'Procurement' },
    { key: 'construction', label: 'Construction' },
    { key: 'inspection', label: 'Inspection' },
    { key: 'turnover', label: 'Turnover' },
    { key: 'close', label: 'Close' },
];

const STAGE_STEP_INDEX = {
    needs_assessment: 1,
    survey: 2,
    design_and_estimate: 3,
    approval: 4,
    procurement: 5,
    construction: 6,
    inspection: 7,
    close: 9,
};

const BOQ_ITEMS_FLAGSHIP = [
    { item_no: 'SPL-1', description: 'Mobilization and Demobilization of Equipment', category: 'General Requirements', unit: 'lot', qty: 1, rate: 45000.00, amount: 45000.00 },
    { item_no: 'SPL-2', description: 'Occupational Safety and Health Program (DPWH DO 56)', category: 'General Requirements', unit: 'lot', qty: 1, rate: 38500.00, amount: 38500.00 },
    { item_no: 'SPL-3', description: 'Temporary Facilities, Signages and Traffic Barricades', category: 'General Requirements', unit: 'lot', qty: 1, rate: 22000.00, amount: 22000.00 },
    { item_no: 'Item 101(1)', description: 'Removal of Existing Structures and Concrete Obstructions', category: 'Earthworks', unit: 'sq.m', qty: 120, rate: 240.00, amount: 28800.00 },
    { item_no: 'Item 102(2)', description: 'Surplus Common Excavation and Unsuitable Waste Hauling', category: 'Earthworks', unit: 'cu.m', qty: 165, rate: 380.00, amount: 62700.00 },
    { item_no: 'Item 103(1)a', description: 'Structure Excavation (Common Soil for Culvert Bedding)', category: 'Earthworks', unit: 'cu.m', qty: 240, rate: 420.00, amount: 100800.00 },
    { item_no: 'Item 104(1)a', description: 'Embankment from Roadway Excavation and Compaction', category: 'Earthworks', unit: 'cu.m', qty: 85, rate: 510.00, amount: 43350.00 },
    { item_no: 'Item 105(1)a', description: 'Subgrade Preparation (Common Material, 150mm thick)', category: 'Earthworks', unit: 'sq.m', qty: 380, rate: 95.00, amount: 36100.00 },
    { item_no: 'Item 200(1)', description: 'Aggregate Subbase Course (Graded Crushed Stone)', category: 'Subbase & Base Course', unit: 'cu.m', qty: 65, rate: 1150.00, amount: 74750.00 },
    { item_no: 'Item 201(1)', description: 'Aggregate Base Course (Stabilized Dense Graded Aggregate)', category: 'Subbase & Base Course', unit: 'cu.m', qty: 45, rate: 1320.00, amount: 59400.00 },
    { item_no: 'Item 404(1)a', description: 'Reinforcing Steel Bars Grade 40 (Deformed for Culvert)', category: 'Concrete Works', unit: 'kg', qty: 3650, rate: 68.50, amount: 250025.00 },
    { item_no: 'Item 405(1)a2', description: 'Structural Concrete Class A (20.68 MPa, 14-day cure for RCBC)', category: 'Concrete Works', unit: 'cu.m', qty: 32, rate: 7450.00, amount: 238400.00 },
    { item_no: 'Item 407(1)', description: 'Lean Concrete Bedding (13.8 MPa, 50mm levelling pad)', category: 'Concrete Works', unit: 'cu.m', qty: 15, rate: 4200.00, amount: 63000.00 },
    { item_no: 'Item 414(1)', description: 'Forms and Falseworks (Marine Plywood & Steel Props)', category: 'Concrete Works', unit: 'sq.m', qty: 180, rate: 340.00, amount: 61200.00 },
    { item_no: 'Item 500(1)a3', description: 'Reinforced Concrete Pipe Culverts (910mm dia., Class IV)', category: 'Drainage & Storm Sewer', unit: 'lin.m', qty: 45, rate: 3200.00, amount: 144000.00 },
    { item_no: 'Item 502(1)a1', description: 'Standard Storm Catch Basins (910mm dia. Precast/Cast-in-Place)', category: 'Drainage & Storm Sewer', unit: 'each', qty: 8, rate: 8500.00, amount: 68000.00 },
    { item_no: 'Item 503(1)', description: 'Manhole Inlets and Heavy-Duty Ductile Iron Frame & Grating', category: 'Drainage & Storm Sewer', unit: 'sets', qty: 6, rate: 12400.00, amount: 74400.00 },
    { item_no: 'Item 505(2)a', description: 'Grouted Riprap Class A (for Outfall Transition Headwall)', category: 'Drainage & Storm Sewer', unit: 'cu.m', qty: 28, rate: 3800.00, amount: 106400.00 },
    { item_no: 'Item 508(1)', description: 'Hand-Laid Rock Embankment (Scour Protection at Creek)', category: 'Drainage & Storm Sewer', unit: 'cu.m', qty: 20, rate: 2100.00, amount: 42000.00 },
    { item_no: 'Item 311(1)a', description: 'Portland Cement Concrete Pavement (Unreinforced 0.20m thk)', category: 'Road Restoration & Markings', unit: 'sq.m', qty: 110, rate: 1850.00, amount: 203500.00 },
    { item_no: 'Item 600(1)', description: 'Concrete Curb and Gutter (Cast-in-Place Type A)', category: 'Road Restoration & Markings', unit: 'lin.m', qty: 120, rate: 780.00, amount: 93600.00 },
    { item_no: 'Item 607(3)a', description: 'Reflective Pavement Markings (White Edge & Center Lines)', category: 'Road Restoration & Markings', unit: 'sq.m', qty: 45, rate: 920.00, amount: 41400.00 },
    { item_no: 'Item 612(1)', description: 'Reflectorized Thermoplastic Pavement Markings (Yellow)', category: 'Road Restoration & Markings', unit: 'sq.m', qty: 30, rate: 1100.00, amount: 33000.00 },
    { item_no: 'Item 624(1)', description: 'Site Cleanup, Waste Disposal and Demobilization Finalization', category: 'Road Restoration & Markings', unit: 'lot', qty: 1, rate: 18000.00, amount: 18000.00 },
];

const SAMPLE_PROJECTS = [
    {
        id: 45,
        project_id: 'PRJ-2026-0045',
        source_wo: 'WO-2026-1197',
        source_report: 'PUL-2026-0822',
        title: 'Drainage improvement',
        description: 'Improve drainage along Deparo St. to reduce recurring flooding and prevent property damage.',
        location_string: '176 Deparo St., Brgy. 183, North Caloocan City',
        coordinates: '14.75624° N, 121.03842° E',
        barangay: 'Barangay 183',
        jurisdiction: 'North Caloocan (District 1)',
        stage: 'Design and estimate',
        stage_key: 'design_and_estimate',
        owner_team: 'Design Team: Luis Morales',
        required_artifact: 'Cost estimate',
        dependency: 'Survey result',
        target_date: 'May 30, 2026',
        risk_level: 'Normal',
        updated_at: '14 min ago',
        estimated_cost: '₱1,245,800.00',
        direct_cost: '₱1,132,545.45',
        contingency: '₱113,254.55',
        total_items: 24,
        missing_info: 'Final traffic management plan',
        missing_info_detail: 'Required by Caloocan City Traffic Management Office (TMO) before BAC procurement endorsement.',
        checklist: [
            { label: 'Site assessment', status: 'completed', date: 'May 12, 2026', verifiedBy: 'Ana Reyes' },
            { label: 'Survey result', status: 'completed', date: 'May 14, 2026', verifiedBy: 'Ana Reyes' },
            { label: 'Cost estimate (draft)', status: 'in_progress', date: 'May 15, 2026', verifiedBy: 'Luis Morales' },
            { label: 'Implementation plan', status: 'not_started', date: 'Pending approval', verifiedBy: 'Unassigned' },
            { label: 'Environmental screening', status: 'not_applicable', date: 'Exempt under local infra criteria', verifiedBy: 'City ENRO' },
        ],
        documents: [
            { id: 'doc-1', name: 'Deparo St. drainage survey.pdf', type: 'PDF', size: '3.4 MB', date: 'May 15, 2026', author: 'Ana Reyes', sha256: '7f8a3c9e65bd29a10f889c2e0b51f074d6c41b8a9e6d0a7f1b2c3d4e5f6a7b8c', pages: 14 },
            { id: 'doc-2', name: 'Preliminary design.dwg', type: 'CAD', size: '12.8 MB', date: 'May 15, 2026', author: 'Luis Morales', sha256: '3b1c8a4d7e2f09a15c884b2e9d51f074d6c41b8a9e6d0a7f1b2c3d4e5f6a7b8d', layers: 28 },
            { id: 'doc-3', name: 'Cost estimate (draft).xlsx', type: 'XLSX', size: '78 KB', date: 'May 15, 2026', author: 'Luis Morales', sha256: 'e94f7d110a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8e', sheets: 5 },
        ],
        boq_items: BOQ_ITEMS_FLAGSHIP,
    },
    {
        id: 40,
        project_id: 'PRJ-2026-0040',
        source_wo: 'WO-2026-0822',
        source_report: 'PUL-2026-0540',
        title: 'Utility pole and wire rehabilitation',
        description: 'Underground conduit conversion and high-voltage line realignment along Camarin road intersection.',
        location_string: 'Camarin Rd., Brgy. 176, North Caloocan City',
        coordinates: '14.76110° N, 121.04230° E',
        barangay: 'Barangay 176',
        jurisdiction: 'North Caloocan (District 1)',
        stage: 'Needs assessment',
        stage_key: 'needs_assessment',
        owner_team: 'Field Ops Team: Ana Reyes',
        required_artifact: 'Site assessment',
        dependency: 'Meralco coordination',
        target_date: 'May 20, 2026',
        risk_level: 'High Risk',
        updated_at: '1 hr ago',
        estimated_cost: '₱680,000.00',
        direct_cost: '₱618,181.82',
        contingency: '₱61,818.18',
        total_items: 12,
        missing_info: 'Meralco joint survey',
        missing_info_detail: 'Awaiting scheduled site walkthrough with power utility engineers.',
        checklist: [
            { label: 'Site assessment', status: 'in_progress', date: 'May 14, 2026', verifiedBy: 'Ana Reyes' },
            { label: 'Utility clearance', status: 'not_started', date: 'Pending', verifiedBy: 'Meralco LGU Desk' },
        ],
        documents: [
            { id: 'doc-40-1', name: 'Camarin pole inspection report.pdf', type: 'PDF', size: '2.1 MB', date: 'May 14, 2026', author: 'Ana Reyes', sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678abcdef0123456789abcdef01', pages: 8 },
        ],
    },
    {
        id: 39,
        project_id: 'PRJ-2026-0039',
        source_wo: 'WO-2026-1182',
        source_report: 'PUL-2026-0820',
        title: 'Garbage collection area improvement',
        description: 'Construction of reinforced waste containment facility with drainage connection to prevent leachate runoff.',
        location_string: 'Bagumbong Rd., Brgy. 170, North Caloocan City',
        coordinates: '14.75480° N, 121.03120° E',
        barangay: 'Barangay 170',
        jurisdiction: 'North Caloocan (District 1)',
        stage: 'Survey',
        stage_key: 'survey',
        owner_team: 'Field Crew B: Miguel Santos',
        required_artifact: 'Survey result',
        dependency: 'Property boundary survey',
        target_date: 'May 28, 2026',
        risk_level: 'Normal',
        updated_at: '2 hr ago',
        estimated_cost: '₱420,000.00',
        direct_cost: '₱381,818.18',
        contingency: '₱38,181.82',
        total_items: 8,
        missing_info: 'Right-of-way clearance',
        missing_info_detail: 'Barangay clearance required for sidewalk setback adjustment.',
        checklist: [
            { label: 'Site assessment', status: 'completed', date: 'May 13, 2026', verifiedBy: 'Miguel Santos' },
            { label: 'Survey result', status: 'in_progress', date: 'May 15, 2026', verifiedBy: 'Miguel Santos' },
        ],
        documents: [
            { id: 'doc-39-1', name: 'Bagumbong containment sketch.dwg', type: 'CAD', size: '6.4 MB', date: 'May 14, 2026', author: 'Miguel Santos', sha256: '99887766554433221100aabbccddeeff0123456789abcdef0123456789abcdef', layers: 12 },
        ],
    },
    {
        id: 35,
        project_id: 'PRJ-2026-0035',
        source_wo: 'WO-2026-0815',
        source_report: 'PUL-2026-0412',
        title: 'Road rehabilitation & paving',
        description: '2-lane concrete pavement resurfacing with shoulder stabilization and drainage realignment.',
        location_string: 'St. Jude St., Brgy. 165, North Caloocan City',
        coordinates: '14.74950° N, 121.02560° E',
        barangay: 'Barangay 165',
        jurisdiction: 'North Caloocan (District 1)',
        stage: 'Design and estimate',
        stage_key: 'design_and_estimate',
        owner_team: 'Design Team: Luis Morales',
        required_artifact: 'Cost estimate',
        dependency: 'Survey result',
        target_date: 'Jun 05, 2026',
        risk_level: 'Normal',
        updated_at: '3 hr ago',
        estimated_cost: '₱3,450,000.00',
        direct_cost: '₱3,136,363.64',
        contingency: '₱313,636.36',
        total_items: 45,
        missing_info: 'Materials testing laboratory result',
        missing_info_detail: 'Core specimen compressive strength testing pending DPWH accredited lab report.',
        checklist: [
            { label: 'Site assessment', status: 'completed', date: 'May 10, 2026', verifiedBy: 'Luis Morales' },
            { label: 'Survey result', status: 'completed', date: 'May 12, 2026', verifiedBy: 'Luis Morales' },
            { label: 'Cost estimate', status: 'in_progress', date: 'May 15, 2026', verifiedBy: 'Luis Morales' },
        ],
        documents: [],
    },
    {
        id: 33,
        project_id: 'PRJ-2026-0033',
        source_wo: 'WO-2026-1165',
        source_report: 'PUL-2026-0815',
        title: 'Drainage clearing program',
        description: 'Main outfall box culvert declogging, sediment extraction, and trash trap reconstruction.',
        location_string: '10th Ave., Brgy. 167, North Caloocan City',
        coordinates: '14.75210° N, 121.03450° E',
        barangay: 'Barangay 167',
        jurisdiction: 'North Caloocan (District 1)',
        stage: 'Procurement',
        stage_key: 'procurement',
        owner_team: 'Procurement Team: Rica Natividad',
        required_artifact: 'Procurement plan',
        dependency: 'BAC resolution',
        target_date: 'Jun 12, 2026',
        risk_level: 'Normal',
        updated_at: '4 hr ago',
        estimated_cost: '₱1,890,000.00',
        direct_cost: '₱1,718,181.82',
        contingency: '₱171,818.18',
        total_items: 18,
        missing_info: 'BAC resolution of award',
        missing_info_detail: 'Undergoing 7-day post-qualification review by Bids & Awards Committee.',
        checklist: [
            { label: 'Cost estimate', status: 'completed', date: 'May 08, 2026', verifiedBy: 'Luis Morales' },
            { label: 'Approved Budget for Contract (ABC)', status: 'completed', date: 'May 10, 2026', verifiedBy: 'City Budget Office' },
            { label: 'BAC advertisement', status: 'completed', date: 'May 12, 2026', verifiedBy: 'Rica Natividad' },
        ],
        documents: [],
    },
    {
        id: 30,
        project_id: 'PRJ-2026-0030',
        source_wo: 'WO-2026-1120',
        source_report: 'PUL-2026-0780',
        title: 'Barangay Hall roofing and structural reinforcement',
        description: 'Truss replacement, leak repair, and solar panel mounting preparation.',
        location_string: 'Tala Rd., Brgy. 177, North Caloocan City',
        coordinates: '14.76840° N, 121.05010° E',
        barangay: 'Barangay 177',
        jurisdiction: 'North Caloocan (District 1)',
        stage: 'Approval',
        stage_key: 'approval',
        owner_team: 'Design Team: Luis Morales',
        required_artifact: 'Structural calculation sheet',
        dependency: 'Structural engineer endorsement',
        target_date: 'Jun 18, 2026',
        risk_level: 'Normal',
        updated_at: '5 hr ago',
        estimated_cost: '₱920,000.00',
        direct_cost: '₱836,363.64',
        contingency: '₱83,636.36',
        total_items: 16,
        missing_info: 'City structural engineer stamp',
        checklist: [{ label: 'Detailed engineering drawings', status: 'completed' }, { label: 'Structural analysis', status: 'completed' }],
        documents: [],
    },
    {
        id: 28,
        project_id: 'PRJ-2026-0028',
        source_wo: 'WO-2026-1090',
        source_report: 'PUL-2026-0740',
        title: 'Pedestrian sidewalk elevation & tactile paving',
        description: '1.2 km pedestrian walkway elevation with ADA-compliant tactile guiding tiles and bollards.',
        location_string: 'Zabarte Rd., Brgy. 175, North Caloocan City',
        coordinates: '14.74310° N, 121.03920° E',
        barangay: 'Barangay 175',
        jurisdiction: 'North Caloocan (District 1)',
        stage: 'Construction',
        stage_key: 'construction',
        owner_team: 'Field Ops Team: Ana Reyes',
        required_artifact: 'Weekly progress billing #2',
        dependency: 'Concrete curing inspection',
        target_date: 'Jul 15, 2026',
        risk_level: 'Normal',
        updated_at: '1 day ago',
        estimated_cost: '₱2,150,000.00',
        direct_cost: '₱1,954,545.45',
        contingency: '₱195,454.55',
        total_items: 22,
        missing_info: null,
        checklist: [{ label: 'Notice to Proceed', status: 'completed' }, { label: 'Site mobilization', status: 'completed' }, { label: 'Pouring inspection', status: 'in_progress' }],
        documents: [],
    },
    {
        id: 24,
        project_id: 'PRJ-2026-0024',
        source_wo: 'WO-2026-1045',
        source_report: 'PUL-2026-0690',
        title: 'Public market stormwater interceptor',
        description: 'Multi-chamber sediment trap and grease interceptor installation for commercial drainage protection.',
        location_string: 'Langit Rd., Brgy. 178, North Caloocan City',
        coordinates: '14.77250° N, 121.05340° E',
        barangay: 'Barangay 178',
        jurisdiction: 'North Caloocan (District 1)',
        stage: 'Inspection',
        stage_key: 'inspection',
        owner_team: 'Quality & Inspection Team',
        required_artifact: 'Final inspection punchlist',
        dependency: 'Hydraulic flow testing',
        target_date: 'May 22, 2026',
        risk_level: 'Normal',
        updated_at: '2 days ago',
        estimated_cost: '₱1,450,000.00',
        direct_cost: '₱1,318,181.82',
        contingency: '₱131,818.18',
        total_items: 15,
        missing_info: null,
        checklist: [{ label: 'Final walk-through', status: 'completed' }, { label: 'Punchlist clearing', status: 'in_progress' }],
        documents: [],
    },
    {
        id: 20,
        project_id: 'PRJ-2026-0020',
        source_wo: 'WO-2026-0980',
        source_report: 'PUL-2026-0610',
        title: 'Barangay 171 Evacuation Center stormwater culvert',
        description: 'Culvert extension and drainage connection to prevent ponding at public evacuation facility.',
        location_string: 'Congressional Rd., Brgy. 171, North Caloocan City',
        coordinates: '14.75920° N, 121.03670° E',
        barangay: 'Barangay 171',
        jurisdiction: 'North Caloocan (District 1)',
        stage: 'Close',
        stage_key: 'close',
        owner_team: 'Procurement Team: Rica Natividad',
        required_artifact: 'Certificate of Final Acceptance',
        dependency: 'COA audit compliance',
        target_date: 'May 10, 2026',
        risk_level: 'Normal',
        updated_at: '3 days ago',
        estimated_cost: '₱890,000.00',
        direct_cost: '₱809,090.91',
        contingency: '₱80,909.09',
        total_items: 11,
        missing_info: null,
        checklist: [{ label: 'Turnover ceremony', status: 'completed' }, { label: 'Final billing voucher', status: 'completed' }, { label: 'Warranty security bond', status: 'completed' }],
        documents: [],
    },
];

export default function ProjectsWorkspacePage({ workspace = 'delivery' }) {
    const token = localStorage.getItem('pulso_token');
    const [params, setParams] = useSearchParams();
    const [projects, setProjects] = useState(SAMPLE_PROJECTS);
    const [toastMessage, setToastMessage] = useState(null);
    const [toastType, setToastType] = useState('success');
    const [decisionComment, setDecisionComment] = useState('');
    const [commentError, setCommentError] = useState(false);

    // Filter states
    const [jurisdictionFilter, setJurisdictionFilter] = useState('all');
    const [ownerFilter, setOwnerFilter] = useState('all');
    const [riskFilter, setRiskFilter] = useState('all');

    // Modals
    const [previewDoc, setPreviewDoc] = useState(null);
    const [isBoqExpanded, setIsBoqExpanded] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [pendingDecision, setPendingDecision] = useState(null);

    // New project form state
    const [newProjectForm, setNewProjectForm] = useState({
        title: '',
        description: '',
        barangay: 'Barangay 183',
        jurisdiction: 'North Caloocan (District 1)',
        location_string: '',
        source_wo: 'WO-2026-1197',
        stage_key: 'needs_assessment',
        owner_team: 'Design Team: Luis Morales',
        estimated_cost: '₱850,000.00',
        risk_level: 'Normal',
    });

    const activeTab = params.get('tab') || 'all';
    const searchQuery = params.get('search') || '';
    const selectedPrjId = Number(params.get('prj')) || null;

    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem('pulso_user') || 'null');
        } catch {
            return null;
        }
    };
    const currentUser = readUser();

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/projects`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const merged = data.map((d, index) => {
                        const base = SAMPLE_PROJECTS[index % SAMPLE_PROJECTS.length];
                        return {
                            ...base,
                            ...d,
                            id: d.id,
                            project_id: d.project_number || `PRJ-2026-${String(d.id).padStart(4, '0')}`,
                            title: d.title || base.title,
                        };
                    });
                    setProjects(merged);
                } else {
                    setProjects(SAMPLE_PROJECTS);
                }
            } else {
                setProjects(SAMPLE_PROJECTS);
            }
        } catch {
            setProjects(SAMPLE_PROJECTS);
        }
    };

    useEffect(() => {
        fetchProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showToast = (text, type = 'success') => {
        setToastMessage(text);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 5000);
    };

    const updateParam = (key, value) => {
        setParams((current) => {
            const next = new URLSearchParams(current);
            if (!value || value === 'all') next.delete(key);
            else next.set(key, value);
            return next;
        }, { replace: true });
    };

    // Stage Distribution Portfolio Counts (Fixed portfolio contract: 35 total)
    const stageDistribution = useMemo(() => {
        return {
            needs_assessment: 10,
            survey: 7,
            design_and_estimate: 7,
            approval: 3,
            procurement: 4,
            construction: 2,
            inspection: 1,
            close: 1,
            total: 35,
        };
    }, []);

    const filteredProjects = useMemo(() => {
        return projects.filter((prj) => {
            if (activeTab !== 'all' && prj.stage_key !== activeTab) return false;
            if (jurisdictionFilter !== 'all' && prj.jurisdiction !== jurisdictionFilter) return false;
            if (ownerFilter !== 'all' && !prj.owner_team?.includes(ownerFilter)) return false;
            if (riskFilter !== 'all' && prj.risk_level !== riskFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    prj.project_id?.toLowerCase().includes(q) ||
                    prj.title?.toLowerCase().includes(q) ||
                    prj.barangay?.toLowerCase().includes(q) ||
                    prj.owner_team?.toLowerCase().includes(q) ||
                    prj.source_wo?.toLowerCase().includes(q) ||
                    prj.required_artifact?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [projects, activeTab, jurisdictionFilter, ownerFilter, riskFilter, searchQuery]);

    const selectedPrj = useMemo(() => {
        if (!selectedPrjId) return null;
        return projects.find((p) => p.id === selectedPrjId) || projects[0] || null;
    }, [projects, selectedPrjId]);

    const currentStepIdx = useMemo(() => {
        if (!selectedPrj) return 3;
        return STAGE_STEP_INDEX[selectedPrj.stage_key] ?? 3;
    }, [selectedPrj]);

    const pulselineProgressPercent = useMemo(() => {
        return Math.round((currentStepIdx / (PULSELINE_PROJECT_STEPS.length - 1)) * 100);
    }, [currentStepIdx]);

    const handleInitiateDecision = (decisionType) => {
        if (!decisionComment.trim()) {
            setCommentError(true);
            showToast('A comment or conditions text is required before submitting a decision.', 'error');
            return;
        }
        setCommentError(false);
        setPendingDecision({
            type: decisionType,
            comment: decisionComment,
            projectId: selectedPrj?.project_id,
            targetStage: decisionType === 'approve' ? 'Procurement' : decisionType === 'request_changes' ? 'Revision Needed' : 'Rejected',
            nextOwner: decisionType === 'approve' ? 'Procurement Team: Rica Natividad' : 'Design Team: Luis Morales',
        });
    };

    const handleConfirmDecision = () => {
        if (!pendingDecision || !selectedPrj) return;

        const updatedStageKey = pendingDecision.type === 'approve' ? 'procurement' : selectedPrj.stage_key;
        const updatedStageName = pendingDecision.type === 'approve' ? 'Procurement' : selectedPrj.stage;

        setProjects((prev) =>
            prev.map((p) => {
                if (p.id === selectedPrj.id) {
                    return {
                        ...p,
                        stage: updatedStageName,
                        stage_key: updatedStageKey,
                        updated_at: 'Just now',
                    };
                }
                return p;
            })
        );

        showToast(
            `Decision [${pendingDecision.type.toUpperCase()}] submitted for ${pendingDecision.projectId}. Next owner: ${pendingDecision.nextOwner}.`,
            'success'
        );
        setPendingDecision(null);
        setDecisionComment('');
    };

    const handleCreateProjectSubmit = (e) => {
        e.preventDefault();
        if (!newProjectForm.title.trim() || !newProjectForm.location_string.trim()) {
            showToast('Please provide a project title and location address.', 'error');
            return;
        }

        const newId = 100 + projects.length;
        const newProject = {
            id: newId,
            project_id: `PRJ-2026-0${newId}`,
            source_wo: newProjectForm.source_wo || 'WO-2026-1200',
            source_report: 'PUL-2026-0900',
            title: newProjectForm.title,
            description: newProjectForm.description || 'Capital infrastructure engineering scope under city development plan.',
            location_string: newProjectForm.location_string,
            coordinates: '14.75800° N, 121.03700° E',
            barangay: newProjectForm.barangay,
            jurisdiction: newProjectForm.jurisdiction,
            stage: PROJECT_TABS.find((t) => t.key === newProjectForm.stage_key)?.label || 'Needs assessment',
            stage_key: newProjectForm.stage_key,
            owner_team: newProjectForm.owner_team,
            required_artifact: 'Site assessment',
            dependency: 'Initial survey',
            target_date: 'Jul 30, 2026',
            risk_level: newProjectForm.risk_level,
            updated_at: 'Just now',
            estimated_cost: newProjectForm.estimated_cost,
            direct_cost: '₱772,727.27',
            contingency: '₱77,272.73',
            total_items: 12,
            missing_info: null,
            checklist: [
                { label: 'Site assessment', status: 'in_progress', date: 'May 16, 2026', verifiedBy: newProjectForm.owner_team },
            ],
            documents: [],
            boq_items: [],
        };

        setProjects([newProject, ...projects]);
        setShowCreateModal(false);
        showToast(`Project ${newProject.project_id} registered successfully!`, 'success');
        updateParam('prj', String(newProject.id));
    };

    const copyToClipboard = (text, label = 'Checksum') => {
        navigator.clipboard?.writeText?.(text);
        showToast(`${label} copied to clipboard!`, 'success');
    };

    return (
        <div className="projects-page">
            <GovSidebar currentUser={currentUser} />
            <div className="projects-shell">
                {/* Topbar */}
                <header className="projects-topbar relative z-50">
                    <div className="projects-topbar-left">
                        <div className="projects-title-cluster">
                            <span className="projects-signal-indicator" aria-hidden="true" />
                            <div className="flex flex-col text-left">
                                <GovBreadcrumb category="Infrastructure" current="Capital Projects & Delivery" />
                                <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap mt-0.5">Projects & delivery</h1>
                                <p>Capital engineering projects, technical planning, BoQ and construction lifecycle.</p>
                            </div>
                        </div>
                    </div>
                    <div className="projects-topbar-actions">
                        {toastMessage && (
                            <div className={`projects-toast-pill is-${toastType}`} role="status">
                                {toastType === 'success' ? (
                                    <CheckCircle2 size={14} className="text-emerald-500" />
                                ) : (
                                    <AlertCircle size={14} className="text-amber-500" />
                                )}
                                <span>{toastMessage}</span>
                            </div>
                        )}
                        <span className="projects-freshness">Data as of today 08:42 AM · PHT</span>
                        <ThemeToggle />
                        <button
                            type="button"
                            className="projects-icon-btn"
                            onClick={fetchProjects}
                            aria-label="Refresh projects data"
                            title="Refresh projects"
                        >
                            <RefreshCw size={15} />
                        </button>
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
                    </div>
                </header>

                {workspace && <GovernmentWorkspaceTabs workspace={workspace} currentUser={currentUser} />}

                {/* 8-Stage Lifecycle Navigation Tabs Bar */}
                <nav className="projects-tabs-bar" aria-label="Project lifecycle stages">
                    <div className="projects-tabs-list" role="tablist">
                        {PROJECT_TABS.map((tab) => {
                            const isTabActive = activeTab === tab.key;
                            const count = tab.key === 'all'
                                ? stageDistribution.total
                                : stageDistribution[tab.key] ?? 0;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={isTabActive}
                                    className={`projects-tab${isTabActive ? ' is-active' : ''}`}
                                    onClick={() => {
                                        updateParam('tab', tab.key);
                                        updateParam('prj', null);
                                    }}
                                >
                                    <span>{tab.label}</span>
                                    <span className="projects-tab-count">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="projects-tabs-actions">
                        <button
                            type="button"
                            className="projects-btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={15} />
                            <span>Create project</span>
                        </button>
                    </div>
                </nav>

                <main className="projects-main">
                    {!selectedPrj ? (
                        /* ── PANEL 3: PROJECTS LIST & DELIVERY VIEW ────────────────────────── */
                        <div className="projects-content-container">
                            {/* Filter Controls Bar */}
                            <div className="projects-controls">
                                <div className="projects-filter-group">
                                    <div className="projects-select-wrapper">
                                        <Filter size={13} className="projects-select-icon" />
                                        <select
                                            className="projects-select-pill"
                                            value={jurisdictionFilter}
                                            onChange={(e) => setJurisdictionFilter(e.target.value)}
                                            aria-label="Filter by jurisdiction"
                                        >
                                            <option value="all">All jurisdictions</option>
                                            <option value="North Caloocan (District 1)">North Caloocan (District 1)</option>
                                            <option value="South Caloocan (District 2)">South Caloocan (District 2)</option>
                                        </select>
                                    </div>

                                    <div className="projects-select-wrapper">
                                        <select
                                            className="projects-select-pill"
                                            value={ownerFilter}
                                            onChange={(e) => setOwnerFilter(e.target.value)}
                                            aria-label="Filter by owner team"
                                        >
                                            <option value="all">All owners</option>
                                            <option value="Design Team">Design Team</option>
                                            <option value="Field Ops Team">Field Ops Team</option>
                                            <option value="Field Crew B">Field Crew B</option>
                                            <option value="Procurement Team">Procurement Team</option>
                                            <option value="Quality & Inspection">Quality & Inspection</option>
                                        </select>
                                    </div>

                                    <div className="projects-select-wrapper">
                                        <select
                                            className="projects-select-pill"
                                            value={riskFilter}
                                            onChange={(e) => setRiskFilter(e.target.value)}
                                            aria-label="Filter by risk level"
                                        >
                                            <option value="all">All risk levels</option>
                                            <option value="Normal">Normal</option>
                                            <option value="High Risk">High Risk</option>
                                        </select>
                                    </div>

                                    <div className="projects-search-box">
                                        <Search size={14} className="projects-search-icon" />
                                        <input
                                            type="search"
                                            placeholder="Search project ID, title, barangay..."
                                            className="projects-search-input"
                                            value={searchQuery}
                                            onChange={(e) => updateParam('search', e.target.value)}
                                            aria-label="Search projects"
                                        />
                                    </div>

                                    {(jurisdictionFilter !== 'all' || ownerFilter !== 'all' || riskFilter !== 'all' || searchQuery) && (
                                        <button
                                            type="button"
                                            className="projects-clear-filters-btn"
                                            onClick={() => {
                                                setJurisdictionFilter('all');
                                                setOwnerFilter('all');
                                                setRiskFilter('all');
                                                updateParam('search', '');
                                            }}
                                        >
                                            Reset filters
                                        </button>
                                    )}
                                </div>

                                <span className="projects-result-meta">
                                    <strong>{filteredProjects.length}</strong> {filteredProjects.length === 1 ? 'project' : 'projects'} visible · Live registry
                                </span>
                            </div>

                            {/* Split Grid: Main Projects Table + Right Rail Stage Distribution */}
                            <div className="projects-layout-split">
                                <div className="projects-table-wrapper">
                                    <table className="projects-table" aria-label="Projects list table">
                                        <thead>
                                            <tr>
                                                <th scope="col">Project ID</th>
                                                <th scope="col">Source</th>
                                                <th scope="col">Project</th>
                                                <th scope="col">Barangay</th>
                                                <th scope="col">Stage</th>
                                                <th scope="col">Owner / Team</th>
                                                <th scope="col">Required artifact</th>
                                                <th scope="col">Dependency</th>
                                                <th scope="col">Target</th>
                                                <th scope="col">Est. Cost</th>
                                                <th scope="col" style={{ textAlign: 'right' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProjects.length === 0 ? (
                                                <tr>
                                                    <td colSpan={11} className="projects-empty-cell">
                                                        <FolderKanban size={32} className="projects-empty-icon" />
                                                        <p>No projects match your filter criteria.</p>
                                                        <button
                                                            type="button"
                                                            className="projects-btn-secondary"
                                                            onClick={() => {
                                                                setJurisdictionFilter('all');
                                                                setOwnerFilter('all');
                                                                setRiskFilter('all');
                                                                updateParam('search', '');
                                                                updateParam('tab', 'all');
                                                            }}
                                                        >
                                                            Reset all filters
                                                        </button>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredProjects.map((prj) => (
                                                    <tr
                                                        key={prj.id}
                                                        className="projects-table-row"
                                                        onClick={() => updateParam('prj', String(prj.id))}
                                                    >
                                                        <td className="projects-td-id">
                                                            <button
                                                                type="button"
                                                                className="projects-id-link"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateParam('prj', String(prj.id));
                                                                }}
                                                            >
                                                                {prj.project_id}
                                                            </button>
                                                        </td>
                                                        <td className="projects-td-source">
                                                            <span className="projects-mono-source">
                                                                {prj.source_wo || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="projects-td-title">
                                                            <div className="projects-title-cell">
                                                                <strong>{prj.title}</strong>
                                                                <span className="projects-title-desc">{prj.description}</span>
                                                            </div>
                                                        </td>
                                                        <td className="projects-td-barangay">
                                                            <span className="projects-barangay-text">{prj.barangay}</span>
                                                        </td>
                                                        <td className="projects-td-stage">
                                                            <span className={`projects-stage-badge is-${prj.stage_key}`}>
                                                                {prj.stage}
                                                            </span>
                                                        </td>
                                                        <td className="projects-td-owner">
                                                            <span className="projects-owner-text">{prj.owner_team}</span>
                                                        </td>
                                                        <td className="projects-td-artifact">
                                                            <span className="projects-artifact-tag">{prj.required_artifact}</span>
                                                        </td>
                                                        <td className="projects-td-dependency">
                                                            <span className="projects-dependency-text">{prj.dependency}</span>
                                                        </td>
                                                        <td className="projects-td-target">
                                                            <span className="projects-target-date">{prj.target_date}</span>
                                                        </td>
                                                        <td className="projects-td-cost">
                                                            <span className="projects-cost-mono">{prj.estimated_cost}</span>
                                                        </td>
                                                        <td className="projects-td-action" style={{ textAlign: 'right' }}>
                                                            <button
                                                                type="button"
                                                                className="projects-review-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateParam('prj', String(prj.id));
                                                                }}
                                                            >
                                                                Review <ChevronRight size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Right-Rail Stage Distribution Card */}
                                <aside className="projects-stage-dist-card" aria-label="Portfolio stage distribution">
                                    <div className="projects-dist-card-header">
                                        <h4>Stage distribution (All open projects)</h4>
                                        <span className="projects-dist-total-badge">35 total</span>
                                    </div>
                                    <div className="projects-stage-distribution-list">
                                        {[
                                            { key: 'needs_assessment', label: 'Needs assessment', count: 10 },
                                            { key: 'survey', label: 'Survey', count: 7 },
                                            { key: 'design_and_estimate', label: 'Design and estimate', count: 7 },
                                            { key: 'approval', label: 'Approval', count: 3 },
                                            { key: 'procurement', label: 'Procurement', count: 4 },
                                            { key: 'construction', label: 'Construction', count: 2 },
                                            { key: 'inspection', label: 'Inspection', count: 1 },
                                            { key: 'close', label: 'Close', count: 1 },
                                        ].map((st) => (
                                            <button
                                                key={st.key}
                                                type="button"
                                                className={`projects-stage-dist-row${activeTab === st.key ? ' is-selected' : ''}`}
                                                onClick={() => {
                                                    updateParam('tab', activeTab === st.key ? 'all' : st.key);
                                                    updateParam('prj', null);
                                                }}
                                                title={`Filter by ${st.label}`}
                                            >
                                                <span className="projects-stage-dist-name">{st.label}</span>
                                                <div className="projects-stage-dist-val-wrap">
                                                    <div
                                                        className="projects-stage-dist-bar"
                                                        style={{ width: `${(st.count / 10) * 48}px` }}
                                                    />
                                                    <strong className="projects-stage-dist-count">{st.count}</strong>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="projects-dist-footer">
                                        <span>Total active</span>
                                        <strong>35</strong>
                                    </div>
                                </aside>
                            </div>
                        </div>
                    ) : (
                        /* ── PANEL 4: PROJECTS DECISION PACKAGE DOCKET (2-COLUMN) ───────────── */
                        <article className="prj-docket-container">
                            {/* Breadcrumbs & Metadata Bar */}
                            <div className="prj-docket-breadcrumb-bar">
                                <div className="prj-docket-breadcrumbs">
                                    <button
                                        type="button"
                                        className="prj-docket-btn-back"
                                        onClick={() => updateParam('prj', null)}
                                    >
                                        <ArrowLeft size={14} />
                                        <span>Projects</span>
                                    </button>
                                    <span className="prj-docket-bc-sep">/</span>
                                    <strong className="prj-docket-bc-id">{selectedPrj.project_id}</strong>
                                    <span className={`projects-stage-badge is-${selectedPrj.stage_key}`}>
                                        {selectedPrj.stage}
                                    </span>
                                </div>
                                <div className="prj-docket-provenance">
                                    <span>From {selectedPrj.source_wo}</span>
                                    <span className="prj-meta-dot">·</span>
                                    <span>{selectedPrj.updated_at}</span>
                                    <span className="prj-meta-dot">·</span>
                                    <span>By {selectedPrj.owner_team}</span>
                                </div>
                            </div>

                            {/* Docket Header Row */}
                            <div className="prj-docket-header-row">
                                <div className="prj-docket-title-area">
                                    <h2>
                                        {selectedPrj.project_id}{' '}
                                        <span className={`projects-stage-badge is-${selectedPrj.stage_key}`}>
                                            {selectedPrj.stage}
                                        </span>
                                    </h2>
                                    <p>{selectedPrj.title}</p>
                                </div>
                                <div className="prj-docket-header-actions">
                                    <button
                                        type="button"
                                        className="projects-btn-secondary"
                                        onClick={() => setIsBoqExpanded(true)}
                                    >
                                        <FileSpreadsheet size={14} />
                                        <span>Itemized BoQ (24)</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="projects-btn-secondary"
                                        onClick={() => showToast('Docket export PDF generated.', 'success')}
                                    >
                                        <Printer size={14} />
                                        <span>Print docket</span>
                                    </button>
                                </div>
                            </div>

                            {/* 2px Pulseline Lifecycle Progress Tracker */}
                            <div className="prj-pulseline-box" aria-label="Project lifecycle progress">
                                <div className="prj-pulseline-track">
                                    <div
                                        className="prj-pulseline-fill"
                                        style={{ width: `${pulselineProgressPercent}%` }}
                                    />
                                </div>
                                <div className="prj-pulseline-steps">
                                    {PULSELINE_PROJECT_STEPS.map((st, idx) => {
                                        const isDone = idx < currentStepIdx;
                                        const isCurrent = idx === currentStepIdx;
                                        return (
                                            <div
                                                key={st.key}
                                                className={`prj-pulseline-step${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
                                            >
                                                <div className="prj-pulseline-dot">
                                                    {isDone && <Check size={10} strokeWidth={3} />}
                                                </div>
                                                <span className="prj-pulseline-label">{st.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2-Column Docket Grid */}
                            <div className="prj-docket-grid">
                                {/* ── LEFT COLUMN (1.15fr): SCOPE, CARTOGRAPHY, SOURCE MAPPING, DOCS, BOQ ── */}
                                <div className="prj-docket-col prj-col-main">
                                    {/* Scope Card */}
                                    <div className="prj-card">
                                        <div className="prj-card-header">
                                            <h4>Scope & Engineering Objectives</h4>
                                            <span className="prj-chip-subtle">{selectedPrj.jurisdiction}</span>
                                        </div>
                                        <p className="prj-scope-text">{selectedPrj.description}</p>
                                        <div className="prj-scope-parameters">
                                            <div className="prj-param-item">
                                                <span className="prj-param-label">Target Completion</span>
                                                <strong className="prj-param-val">{selectedPrj.target_date}</strong>
                                            </div>
                                            <div className="prj-param-item">
                                                <span className="prj-param-label">Risk Classification</span>
                                                <strong className="prj-param-val">{selectedPrj.risk_level}</strong>
                                            </div>
                                            <div className="prj-param-item">
                                                <span className="prj-param-label">Assigned Lead</span>
                                                <strong className="prj-param-val">{selectedPrj.owner_team}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location & Cartography Card */}
                                    <div className="prj-card">
                                        <div className="prj-card-header">
                                            <h4>Location & Cartography</h4>
                                            <span className="prj-chip-subtle">{selectedPrj.barangay}</span>
                                        </div>
                                        <div className="prj-location-content">
                                            <div className="prj-location-row">
                                                <MapPin size={16} className="text-sky-600" />
                                                <span className="prj-location-address">
                                                    <strong>{selectedPrj.location_string}</strong>
                                                </span>
                                            </div>
                                            {selectedPrj.coordinates && (
                                                <div className="prj-coordinates-rail">
                                                    <span className="prj-coord-label">GPS Coordinate Rail:</span>
                                                    <code className="prj-coord-code">{selectedPrj.coordinates}</code>
                                                    <button
                                                        type="button"
                                                        className="prj-copy-btn"
                                                        onClick={() => copyToClipboard(selectedPrj.coordinates, 'Coordinates')}
                                                        title="Copy GPS coordinates"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Source Mapping Card */}
                                    <div className="prj-card">
                                        <div className="prj-card-header">
                                            <h4>Source Mapping & Community Request</h4>
                                        </div>
                                        <div className="prj-source-links-grid">
                                            <div className="prj-source-card">
                                                <span className="prj-source-type">Originating Citizen Report</span>
                                                <div className="prj-source-value-wrap">
                                                    <strong className="prj-source-id">{selectedPrj.source_report}</strong>
                                                    <Link
                                                        to={`/gov/operations?view=reports&report=${selectedPrj.source_report.replace(/\D/g, '')}`}
                                                        className="prj-source-jump-btn"
                                                        title="View source citizen report in triage docket"
                                                    >
                                                        <span>View report</span>
                                                        <ChevronRight size={12} />
                                                    </Link>
                                                </div>
                                            </div>
                                            <div className="prj-source-card">
                                                <span className="prj-source-type">Dispatched Parent Work Order</span>
                                                <div className="prj-source-value-wrap">
                                                    <strong className="prj-source-id">{selectedPrj.source_wo}</strong>
                                                    <Link
                                                        to={`/gov/operations?view=work-orders&wo=${selectedPrj.source_wo.replace(/\D/g, '')}`}
                                                        className="prj-source-jump-btn"
                                                        title="View parent work order in operations workspace"
                                                    >
                                                        <span>View work order</span>
                                                        <ChevronRight size={12} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Attached Technical Documents */}
                                    <div className="prj-card">
                                        <div className="prj-card-header">
                                            <h4>Attached Technical Documents ({selectedPrj.documents?.length || 0})</h4>
                                            <button
                                                type="button"
                                                className="prj-btn-inline"
                                                onClick={() => showToast('Document upload dialog opened.', 'success')}
                                            >
                                                <UploadCloud size={13} />
                                                <span>Upload file</span>
                                            </button>
                                        </div>
                                        <div className="prj-doc-list">
                                            {selectedPrj.documents && selectedPrj.documents.length > 0 ? (
                                                selectedPrj.documents.map((doc) => {
                                                    const isPdf = doc.type === 'PDF';
                                                    const isCad = doc.type === 'CAD';
                                                    return (
                                                        <div key={doc.id} className="prj-doc-item">
                                                            <div className="prj-doc-left">
                                                                <div className={`prj-doc-icon-box is-${doc.type.toLowerCase()}`}>
                                                                    {isPdf && <FileText size={16} />}
                                                                    {isCad && <FileCode size={16} />}
                                                                    {!isPdf && !isCad && <FileSpreadsheet size={16} />}
                                                                </div>
                                                                <div className="prj-doc-meta">
                                                                    <strong className="prj-doc-name">{doc.name}</strong>
                                                                    <span className="prj-doc-sub">
                                                                        {doc.type} · {doc.size} · {doc.date} · Author: {doc.author}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="prj-doc-actions">
                                                                <button
                                                                    type="button"
                                                                    className="prj-doc-btn"
                                                                    onClick={() => setPreviewDoc(doc)}
                                                                    title="Preview document"
                                                                >
                                                                    <Eye size={14} />
                                                                    <span>Preview</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="prj-doc-btn"
                                                                    onClick={() => showToast(`Downloaded ${doc.name}`, 'success')}
                                                                    title="Download file"
                                                                >
                                                                    <Download size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="prj-empty-text">No technical attachments registered for this stage.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* BoQ / Estimate Summary Box */}
                                    <div className="prj-boq-summary-box">
                                        <div className="prj-boq-header">
                                            <div>
                                                <h4>BoQ / Estimate summary</h4>
                                                <p>Detailed cost schedule prepared by Estimator / QS (Luis Morales).</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="projects-btn-secondary"
                                                onClick={() => setIsBoqExpanded(!isBoqExpanded)}
                                            >
                                                <FileSpreadsheet size={13} />
                                                <span>{isBoqExpanded ? 'Hide line items' : 'View 24 line items'}</span>
                                            </button>
                                        </div>

                                        <div className="prj-boq-stat-grid">
                                            <div className="prj-boq-stat-card is-primary">
                                                <span className="prj-boq-stat-label">Total Estimated Cost</span>
                                                <strong className="prj-boq-stat-val prj-total-val">{selectedPrj.estimated_cost}</strong>
                                                <span className="prj-boq-stat-hint">DPWH Caloocan standard rate schedule</span>
                                            </div>
                                            <div className="prj-boq-stat-card">
                                                <span className="prj-boq-stat-label">Total Line Items</span>
                                                <strong className="prj-boq-stat-val">{selectedPrj.total_items} items</strong>
                                                <span className="prj-boq-stat-hint">Across 5 civil work categories</span>
                                            </div>
                                            <div className="prj-boq-stat-card">
                                                <span className="prj-boq-stat-label">Contingency Fund (10%)</span>
                                                <strong className="prj-boq-stat-val">{selectedPrj.contingency}</strong>
                                                <span className="prj-boq-stat-hint">Direct: {selectedPrj.direct_cost}</span>
                                            </div>
                                        </div>

                                        {/* Expandable Itemized BoQ Table */}
                                        {isBoqExpanded && selectedPrj.boq_items && (
                                            <div className="prj-boq-expanded-table-wrap">
                                                <div className="prj-boq-table-topbar">
                                                    <strong>Schedule of Itemized Quantities (24 Items)</strong>
                                                    <span className="prj-boq-direct-calc">
                                                        Direct: {selectedPrj.direct_cost} + 10% Contingency: {selectedPrj.contingency} = <strong>{selectedPrj.estimated_cost}</strong>
                                                    </span>
                                                </div>
                                                <div className="prj-boq-table-scroll">
                                                    <table className="prj-boq-table" aria-label="Itemized BoQ table">
                                                        <thead>
                                                            <tr>
                                                                <th>Item No.</th>
                                                                <th>Description</th>
                                                                <th>Category</th>
                                                                <th>Unit</th>
                                                                <th style={{ textAlign: 'right' }}>Qty</th>
                                                                <th style={{ textAlign: 'right' }}>Unit Rate (₱)</th>
                                                                <th style={{ textAlign: 'right' }}>Amount (₱)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedPrj.boq_items.map((row) => (
                                                                <tr key={row.item_no}>
                                                                    <td className="prj-boq-mono">{row.item_no}</td>
                                                                    <td>{row.description}</td>
                                                                    <td className="prj-boq-subtle">{row.category}</td>
                                                                    <td>{row.unit}</td>
                                                                    <td style={{ textAlign: 'right' }}>{row.qty}</td>
                                                                    <td className="prj-boq-mono" style={{ textAlign: 'right' }}>
                                                                        {row.rate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                    <td className="prj-boq-mono" style={{ textAlign: 'right', fontWeight: 600 }}>
                                                                        {row.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── RIGHT COLUMN (0.85fr): GOVERNED DECISION PACKAGE DOCKET ── */}
                                <div className="prj-docket-col prj-col-decision">
                                    <div className="prj-decision-box">
                                        <div className="prj-decision-header">
                                            <div className="prj-decision-badge-row">
                                                <span className="prj-decision-formal-tag">Governance Stage Gate</span>
                                                <span className="prj-decision-req-tag">Formal Review</span>
                                            </div>
                                            <h4>Decision requested</h4>
                                            <p>
                                                Please review the project engineering package, verify prerequisite artifacts, and provide a formal governed decision.
                                            </p>
                                        </div>

                                        {/* Evidence & Checklist */}
                                        <div className="prj-section-checklist">
                                            <span className="prj-section-subhead">
                                                Evidence and checklist:
                                            </span>
                                            <div className="prj-checklist">
                                                {selectedPrj.checklist?.map((item, idx) => {
                                                    const isCompleted = item.status === 'completed';
                                                    const isInProgress = item.status === 'in_progress';
                                                    const isNotStarted = item.status === 'not_started';
                                                    const isNA = item.status === 'not_applicable';

                                                    return (
                                                        <div key={idx} className="prj-check-item">
                                                            <div className="prj-check-left">
                                                                {isCompleted && <CheckCircle2 size={15} className="text-emerald-500" />}
                                                                {isInProgress && <Clock3 size={15} className="text-amber-500" />}
                                                                {isNotStarted && <MinusCircle size={15} className="text-slate-400" />}
                                                                {isNA && <ShieldCheck size={15} className="text-slate-400" />}
                                                                <span className="prj-check-label">{item.label}</span>
                                                            </div>
                                                            <div className="prj-check-right">
                                                                <span className={`prj-check-badge is-${item.status}`}>
                                                                    {item.status.replace(/_/g, ' ')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Missing Information Warning Callout */}
                                        {selectedPrj.missing_info && (
                                            <div className="prj-warning-callout" role="alert">
                                                <div className="prj-warning-icon-wrap">
                                                    <AlertTriangle size={18} className="text-amber-600" />
                                                </div>
                                                <div className="prj-warning-body">
                                                    <strong className="prj-warning-title">
                                                        Missing prerequisite: {selectedPrj.missing_info}
                                                    </strong>
                                                    <p className="prj-warning-desc">
                                                        {selectedPrj.missing_info_detail ||
                                                            'This document is required before endorsement to the Bids and Awards Committee (BAC).'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Required Comments / Conditions Field */}
                                        <div className="prj-comment-field-block">
                                            <div className="prj-comment-header-row">
                                                <label htmlFor="prj-comment" className="prj-comment-label">
                                                    Comment / Conditions (required):
                                                </label>
                                                <span className={`prj-char-count${decisionComment.length > 500 ? ' is-warning' : ''}`}>
                                                    {decisionComment.length} / 1000
                                                </span>
                                            </div>

                                            <textarea
                                                id="prj-comment"
                                                rows={4}
                                                className={`prj-decision-comment-box${commentError ? ' is-invalid' : ''}`}
                                                placeholder="Enter your formal evaluation, conditional approval stipulations, or required adjustments..."
                                                value={decisionComment}
                                                maxLength={1000}
                                                onChange={(e) => {
                                                    setDecisionComment(e.target.value);
                                                    if (commentError && e.target.value.trim()) {
                                                        setCommentError(false);
                                                    }
                                                }}
                                            />
                                            {commentError && (
                                                <span className="prj-field-error" role="alert">
                                                    <AlertCircle size={12} /> A justification comment is required for audit logging.
                                                </span>
                                            )}

                                            {/* Quick stipulation chips */}
                                            <div className="prj-quick-stipulations">
                                                <span className="prj-quick-chip-label">Templates:</span>
                                                <button
                                                    type="button"
                                                    className="prj-chip-btn"
                                                    onClick={() =>
                                                        setDecisionComment(
                                                            'Approved subject to final submission of Traffic Management Plan prior to contractor groundbreaking.'
                                                        )
                                                    }
                                                >
                                                    + Conditional Approval
                                                </button>
                                                <button
                                                    type="button"
                                                    className="prj-chip-btn"
                                                    onClick={() =>
                                                        setDecisionComment(
                                                            'Changes requested: Update concrete mixture specification to 28-day 20.68 MPa curing standard.'
                                                        )
                                                    }
                                                >
                                                    + Revise Concrete Specs
                                                </button>
                                            </div>
                                        </div>

                                        {/* Governed Decision Action Buttons (3-Column Grid) */}
                                        <div className="prj-decision-actions-row">
                                            <button
                                                type="button"
                                                className="prj-btn-approve"
                                                onClick={() => handleInitiateDecision('approve')}
                                            >
                                                <CheckCircle2 size={15} />
                                                <span>Approve</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="prj-btn-changes"
                                                onClick={() => handleInitiateDecision('request_changes')}
                                            >
                                                <AlertTriangle size={15} />
                                                <span>Request changes</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="prj-btn-reject"
                                                onClick={() => handleInitiateDecision('reject')}
                                            >
                                                <XCircle size={15} />
                                                <span>Reject</span>
                                            </button>
                                        </div>

                                        {/* Consequences & Next Owner Box */}
                                        <div className="prj-consequences-box">
                                            <div className="prj-consequence-row">
                                                <span className="prj-c-label">Consequences:</span>
                                                <span className="prj-c-val">
                                                    If approved, project moves to <strong>Procurement</strong>. BoQ estimates and specifications are locked for bidding.
                                                </span>
                                            </div>
                                            <div className="prj-consequence-row">
                                                <span className="prj-c-label">Next owner:</span>
                                                <span className="prj-c-val">
                                                    <strong>Procurement Team (Rica Natividad, BAC Secretariat)</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    )}
                </main>
            </div>

            {/* ── MODAL: DOCUMENT PREVIEW VIEWER ─────────────────────────────────── */}
            {previewDoc && (
                <div className="projects-modal-backdrop" onClick={() => setPreviewDoc(null)}>
                    <div
                        className="projects-modal-card prj-doc-preview-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="preview-modal-title"
                    >
                        <div className="projects-modal-header">
                            <div className="projects-modal-title-wrap">
                                <span className={`projects-doc-tag is-${previewDoc.type.toLowerCase()}`}>
                                    {previewDoc.type}
                                </span>
                                <h3 id="preview-modal-title">{previewDoc.name}</h3>
                            </div>
                            <button
                                type="button"
                                className="projects-modal-close"
                                onClick={() => setPreviewDoc(null)}
                                aria-label="Close preview"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="projects-modal-body">
                            <div className="prj-preview-meta-rail">
                                <div>
                                    <span className="prj-meta-label">File Size</span>
                                    <strong>{previewDoc.size}</strong>
                                </div>
                                <div>
                                    <span className="prj-meta-label">Author</span>
                                    <strong>{previewDoc.author}</strong>
                                </div>
                                <div>
                                    <span className="prj-meta-label">Upload Date</span>
                                    <strong>{previewDoc.date}</strong>
                                </div>
                                <div>
                                    <span className="prj-meta-label">Verification</span>
                                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                                        <ShieldCheck size={14} /> SHA-256 Verified
                                    </span>
                                </div>
                            </div>

                            {previewDoc.sha256 && (
                                <div className="prj-sha-bar">
                                    <span>SHA-256: </span>
                                    <code>{previewDoc.sha256}</code>
                                    <button
                                        type="button"
                                        className="prj-copy-btn"
                                        onClick={() => copyToClipboard(previewDoc.sha256, 'SHA-256 Checksum')}
                                        title="Copy SHA-256 checksum"
                                    >
                                        <Copy size={12} />
                                    </button>
                                </div>
                            )}

                            <div className="prj-simulated-preview-box">
                                <div className="prj-preview-canvas-header">
                                    <span>PULSO Document Viewer · v2.4</span>
                                    <span>Page 1 of {previewDoc.pages || previewDoc.layers || 1}</span>
                                </div>
                                <div className="prj-preview-canvas">
                                    <div className="prj-blueprint-canvas">
                                        <div className="prj-cad-grid-overlay" />
                                        <div className="prj-cad-drawing-box">
                                            <div className="prj-drawing-header">
                                                <span>CALOOCAN CITY ENGINEERING DEPARTMENT</span>
                                                <strong>PROJECT: {selectedPrj?.project_id || 'PRJ-2026-0045'} — DRAINAGE IMPROVEMENT</strong>
                                            </div>
                                            <div className="prj-drawing-schematic">
                                                <div className="prj-culvert-diagram">
                                                    <span>RCBC 910mm x 910mm INVERT -1.45m</span>
                                                </div>
                                            </div>
                                            <div className="prj-drawing-seal">
                                                <FileCheck size={28} className="text-sky-700" />
                                                <span>ENGINEER SEAL · LUIS MORALES (PRC #0084729)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="projects-modal-footer">
                            <button
                                type="button"
                                className="projects-btn-secondary"
                                onClick={() => setPreviewDoc(null)}
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="projects-btn-primary"
                                onClick={() => {
                                    showToast(`Downloaded ${previewDoc.name}`, 'success');
                                    setPreviewDoc(null);
                                }}
                            >
                                <Download size={14} /> Download file
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: GOVERNED DECISION CONFIRMATION ──────────────────────────── */}
            {pendingDecision && (
                <div className="projects-modal-backdrop" onClick={() => setPendingDecision(null)}>
                    <div
                        className="projects-modal-card prj-decision-confirm-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="decision-confirm-title"
                    >
                        <div className="projects-modal-header">
                            <div className="projects-modal-title-wrap">
                                <AlertTriangle size={18} className="text-amber-500" />
                                <h3 id="decision-confirm-title">Confirm Governed Decision</h3>
                            </div>
                            <button
                                type="button"
                                className="projects-modal-close"
                                onClick={() => setPendingDecision(null)}
                                aria-label="Cancel decision"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="projects-modal-body">
                            <p className="prj-confirm-intro">
                                You are recording a formal governed decision on <strong>{pendingDecision.projectId}</strong>. This action will be permanently recorded in the immutable audit stream.
                            </p>

                            <div className="prj-confirm-summary-card">
                                <div className="prj-confirm-row">
                                    <span>Decision:</span>
                                    <strong className={`prj-decision-badge-confirm is-${pendingDecision.type}`}>
                                        {pendingDecision.type.toUpperCase().replace('_', ' ')}
                                    </strong>
                                </div>
                                <div className="prj-confirm-row">
                                    <span>Target Stage:</span>
                                    <strong>{pendingDecision.targetStage}</strong>
                                </div>
                                <div className="prj-confirm-row">
                                    <span>Next Owner:</span>
                                    <strong>{pendingDecision.nextOwner}</strong>
                                </div>
                                <div className="prj-confirm-comment-box">
                                    <span className="prj-confirm-comment-label">Recorded Condition / Comment:</span>
                                    <p className="prj-confirm-comment-text">"{pendingDecision.comment}"</p>
                                </div>
                            </div>
                        </div>
                        <div className="projects-modal-footer">
                            <button
                                type="button"
                                className="projects-btn-secondary"
                                onClick={() => setPendingDecision(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={`prj-btn-confirm-action is-${pendingDecision.type}`}
                                onClick={handleConfirmDecision}
                            >
                                <Check size={15} /> Confirm & Sign Decision
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: CREATE CAPITAL PROJECT ─────────────────────────────────── */}
            {showCreateModal && (
                <div className="projects-modal-backdrop" onClick={() => setShowCreateModal(false)}>
                    <div
                        className="projects-modal-card prj-create-project-modal"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-project-modal-title"
                    >
                        <form onSubmit={handleCreateProjectSubmit}>
                            <div className="projects-modal-header">
                                <div className="projects-modal-title-wrap">
                                    <FolderKanban size={18} className="text-sky-600" />
                                    <h3 id="create-project-modal-title">Create Capital Engineering Project</h3>
                                </div>
                                <button
                                    type="button"
                                    className="projects-modal-close"
                                    onClick={() => setShowCreateModal(false)}
                                    aria-label="Close create project"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="projects-modal-body">
                                <div className="prj-form-grid">
                                    <div className="prj-form-group prj-span-2">
                                        <label htmlFor="new-prj-title">Project Title *</label>
                                        <input
                                            id="new-prj-title"
                                            type="text"
                                            required
                                            className="prj-input"
                                            placeholder="e.g. Drainage improvement and outfall installation"
                                            value={newProjectForm.title}
                                            onChange={(e) => setNewProjectForm({ ...newProjectForm, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="prj-form-group">
                                        <label htmlFor="new-prj-barangay">Barangay Location</label>
                                        <select
                                            id="new-prj-barangay"
                                            className="prj-input"
                                            value={newProjectForm.barangay}
                                            onChange={(e) => setNewProjectForm({ ...newProjectForm, barangay: e.target.value })}
                                        >
                                            <option value="Barangay 183">Barangay 183 (Deparo)</option>
                                            <option value="Barangay 176">Barangay 176 (Bagong Silang)</option>
                                            <option value="Barangay 170">Barangay 170 (Bagumbong)</option>
                                            <option value="Barangay 165">Barangay 165 (St. Jude)</option>
                                            <option value="Barangay 167">Barangay 167 (Llano)</option>
                                            <option value="Barangay 171">Barangay 171 (Congressional)</option>
                                            <option value="Barangay 177">Barangay 177 (Tala)</option>
                                            <option value="Barangay 178">Barangay 178 (Langit)</option>
                                        </select>
                                    </div>

                                    <div className="prj-form-group">
                                        <label htmlFor="new-prj-source-wo">Source Work Order</label>
                                        <input
                                            id="new-prj-source-wo"
                                            type="text"
                                            className="prj-input"
                                            placeholder="e.g. WO-2026-1197"
                                            value={newProjectForm.source_wo}
                                            onChange={(e) => setNewProjectForm({ ...newProjectForm, source_wo: e.target.value })}
                                        />
                                    </div>

                                    <div className="prj-form-group prj-span-2">
                                        <label htmlFor="new-prj-address">Street Address / Location String *</label>
                                        <input
                                            id="new-prj-address"
                                            type="text"
                                            required
                                            className="prj-input"
                                            placeholder="e.g. 176 Deparo St., North Caloocan City"
                                            value={newProjectForm.location_string}
                                            onChange={(e) => setNewProjectForm({ ...newProjectForm, location_string: e.target.value })}
                                        />
                                    </div>

                                    <div className="prj-form-group">
                                        <label htmlFor="new-prj-stage">Initial Lifecycle Stage</label>
                                        <select
                                            id="new-prj-stage"
                                            className="prj-input"
                                            value={newProjectForm.stage_key}
                                            onChange={(e) => setNewProjectForm({ ...newProjectForm, stage_key: e.target.value })}
                                        >
                                            <option value="needs_assessment">Needs assessment</option>
                                            <option value="survey">Survey</option>
                                            <option value="design_and_estimate">Design and estimate</option>
                                        </select>
                                    </div>

                                    <div className="prj-form-group">
                                        <label htmlFor="new-prj-owner">Assigned Engineering Team</label>
                                        <select
                                            id="new-prj-owner"
                                            className="prj-input"
                                            value={newProjectForm.owner_team}
                                            onChange={(e) => setNewProjectForm({ ...newProjectForm, owner_team: e.target.value })}
                                        >
                                            <option value="Design Team: Luis Morales">Design Team: Luis Morales</option>
                                            <option value="Field Ops Team: Ana Reyes">Field Ops Team: Ana Reyes</option>
                                            <option value="Field Crew B: Miguel Santos">Field Crew B: Miguel Santos</option>
                                            <option value="Procurement Team: Rica Natividad">Procurement Team: Rica Natividad</option>
                                        </select>
                                    </div>

                                    <div className="prj-form-group">
                                        <label htmlFor="new-prj-cost">Initial Estimated Cost (₱)</label>
                                        <input
                                            id="new-prj-cost"
                                            type="text"
                                            className="prj-input"
                                            value={newProjectForm.estimated_cost}
                                            onChange={(e) => setNewProjectForm({ ...newProjectForm, estimated_cost: e.target.value })}
                                        />
                                    </div>

                                    <div className="prj-form-group">
                                        <label htmlFor="new-prj-risk">Risk Level</label>
                                        <select
                                            id="new-prj-risk"
                                            className="prj-input"
                                            value={newProjectForm.risk_level}
                                            onChange={(e) => setNewProjectForm({ ...newProjectForm, risk_level: e.target.value })}
                                        >
                                            <option value="Normal">Normal</option>
                                            <option value="High Risk">High Risk</option>
                                        </select>
                                    </div>

                                    <div className="prj-form-group prj-span-2">
                                        <label htmlFor="new-prj-desc">Scope Description</label>
                                        <textarea
                                            id="new-prj-desc"
                                            rows={3}
                                            className="prj-input"
                                            placeholder="Detailed description of engineering intervention and deliverables..."
                                            value={newProjectForm.description}
                                            onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="projects-modal-footer">
                                <button
                                    type="button"
                                    className="projects-btn-secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="projects-btn-primary">
                                    <Plus size={15} /> Register Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
