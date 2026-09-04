/**
 * PositionDashboard.jsx
 * ──────────────────────────────────────────────────────────────────────
 * Role-specific landing dashboard for every CEO Plantilla position.
 * Each position sees:
 *   1. Their "My Pending Actions" — items awaiting THEIR action per the workflow
 *   2. Their work queue (assigned to them)
 *   3. Current workflow guide for their position
 *   4. Quick-action buttons relevant to their role
 * ──────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
    AlertTriangle, CheckCircle2, Clock, ChevronRight, ChevronDown,
    GitBranch, Building2, PackageCheck, ShieldCheck, BarChart2,
    Users, Wrench, HardHat, Ruler, Eye, Activity, Megaphone,
    ClipboardList, ArrowRight, Plus, Bell, Map, FileCheck,
    TrendingUp, UserCog, BookOpen, Truck, RefreshCw, XCircle,
    CircleDot, AlertCircle, CheckSquare, Brain
} from 'lucide-react';
import GovSidebar from '../components/GovSidebar';
import { useTheme } from '../contexts/ThemeContext';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import Spline from '@splinetool/react-spline';

const API = 'http://localhost:33159';

// ─────────────────────────────────────────────────────────────────────────────
// Per-role configuration: what they see, what actions they can take
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
    city_engineer: {
        label: 'City Engineer',
        division: 'Executive Leadership',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Oversees all operations of the City Engineering Office. Signs off on all major approvals.',
        myActions: [
            { label: 'Projects Pending Your Approval', endpoint: '/api/gov/projects?status=approved_by_city_engineer', icon: Map, urgency: 'high', action: 'Approve' },
            { label: 'Procurement Awaiting Signature', endpoint: '/api/gov/procurement?status=validated', icon: PackageCheck, urgency: 'high', action: 'Sign & Forward' },
            { label: 'Work Orders to Close', endpoint: '/api/gov/work-orders?status=completed', icon: GitBranch, urgency: 'medium', action: 'Close' },
            { label: 'OBO Permits to Issue', endpoint: '/api/gov/obo?status=inspection_complete', icon: ShieldCheck, urgency: 'medium', action: 'Issue Permit' },
        ],
        workflow: [
            { step: 'Review Division Chief recommendations', color: 'orange' },
            { step: 'Approve project designs & BoQ budgets', color: 'orange' },
            { step: 'Sign procurement requests (RA 9184)', color: 'orange' },
            { step: 'Issue Building Permits (OBO)', color: 'orange' },
            { step: 'Sign Certificates of Completion', color: 'orange' },
        ],
        quickActions: [
            { label: 'Intelligence Analytics', to: '/gov/analytics', icon: Brain },
            { label: 'View All Projects', to: '/gov/projects', icon: Map },
            { label: 'Post Advisory', to: '/management', tab: 'advisories', icon: Megaphone },
            { label: 'Audit Logs', to: '/gov/audit-logs', icon: BarChart2 },
        ],
    },

    asst_city_engineer: {
        label: 'Assistant City Engineer',
        division: 'Executive Leadership',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Assists the City Engineer in day-to-day operations. Reviews project phases and issues Certificates of Completion.',
        myActions: [
            { label: 'New Project Requests to Review (Phase 1)', endpoint: '/api/gov/projects?status=request_received', icon: Map, urgency: 'high', action: 'Accept/Reject' },
            { label: 'Projects Ready for CoC (Phase 6)', endpoint: '/api/gov/projects?status=resolved', icon: FileCheck, urgency: 'high', action: 'Issue Certificate' },
            { label: 'Work Orders Pending Dispatch Approval', endpoint: '/api/gov/work-orders?status=open', icon: GitBranch, urgency: 'medium', action: 'Approve Dispatch' },
        ],
        workflow: [
            { step: 'Receive & review project requests (Phase 1)', color: 'orange' },
            { step: 'Accept project requests → forward to survey', color: 'orange' },
            { step: 'Monitor project phase progress', color: 'orange' },
            { step: 'Review completion report from Project Engineer', color: 'orange' },
            { step: 'Issue Certificate of Completion (CoC, Phase 6)', color: 'orange' },
        ],
        quickActions: [
            { label: 'Intelligence Analytics', to: '/gov/analytics', icon: Brain },
            { label: 'All Projects', to: '/gov/projects', icon: Map },
            { label: 'Work Orders', to: '/gov/work-orders', icon: GitBranch },
            { label: 'Exec Overview', to: '/management', icon: TrendingUp },
        ],
    },

    admin_officer: {
        label: 'Administrative Officer V',
        division: 'Administrative Division',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Manages the office budget, HR, and validates procurement requests before forwarding to the City Engineer.',
        myActions: [
            { label: 'Procurement Requests to Validate', endpoint: '/api/gov/procurement?status=submitted', icon: PackageCheck, urgency: 'high', action: 'Validate' },
            { label: 'Budget Check Required', endpoint: '/api/gov/projects?status=boq_submitted', icon: BarChart2, urgency: 'high', action: 'Check Budget' },
            { label: 'Posts for Advisory Approval', endpoint: null, icon: Megaphone, urgency: 'low', action: 'Review' },
        ],
        workflow: [
            { step: 'Receive BoQ/Estimates from Project Engineer', color: 'orange' },
            { step: 'Check budget availability (PPAS/AIP)', color: 'orange' },
            { step: 'Validate Procurement Request letter', color: 'orange' },
            { step: 'Forward validated PR to City Engineer for signature', color: 'orange' },
            { step: 'Process internal procurement if below threshold', color: 'orange' },
        ],
        quickActions: [
            { label: 'Procurement Requests', to: '/gov/procurement', icon: PackageCheck },
            { label: 'Manage Users', to: '/management', tab: 'users', icon: Users },
            { label: 'Post Advisory', to: '/management', tab: 'advisories', icon: Megaphone },
        ],
    },

    admin_clerk: {
        label: 'Administrative Clerk (Dispatcher)',
        division: 'Administrative Division',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'First responder in the command center. Monitors, verifies, and triages all incoming citizen reports.',
        myActions: [
            { label: 'Unverified Reports to Triage', endpoint: '/api/reports?status=unverified', icon: AlertTriangle, urgency: 'high', action: 'Verify / Reject' },
            { label: 'Reports Pending Division Chief Approval', endpoint: '/api/reports?status=pending_approval', icon: Clock, urgency: 'medium', action: 'Track' },
            { label: 'OBO Applications to Log', endpoint: '/api/gov/obo?status=application_received', icon: ShieldCheck, urgency: 'low', action: 'Log & Assign' },
        ],
        workflow: [
            { step: 'Monitor incoming citizen reports (live feed)', color: 'orange' },
            { step: 'Verify authenticity (photos, location, AI score)', color: 'orange' },
            { step: 'Reject spam OR forward to Division Chief queue', color: 'orange' },
            { step: 'Log OBO applications & assign tracking number', color: 'orange' },
            { step: 'Assist in dispatching approved work orders', color: 'orange' },
        ],
        quickActions: [
            { label: 'Command Center', to: '/dispatcher', icon: AlertTriangle },
            { label: 'File OBO Application', to: '/gov/obo', icon: ShieldCheck },
            { label: 'Work Orders', to: '/gov/work-orders', icon: GitBranch },
        ],
    },

    records_officer: {
        label: 'Records Officer',
        division: 'Administrative Division',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Maintains all official documents of the City Engineering Office and manages the OBO permit application registry.',
        myActions: [
            { label: 'OBO Applications to Schedule', endpoint: '/api/gov/obo?status=application_received', icon: ShieldCheck, urgency: 'high', action: 'Schedule Inspection' },
            { label: 'Completed Inspections to Archive', endpoint: '/api/gov/obo?status=inspection_complete', icon: FileCheck, urgency: 'medium', action: 'Archive' },
        ],
        workflow: [
            { step: 'Receive OBO permit applications from window/online', color: 'orange' },
            { step: 'Assign OBO tracking number & log in registry', color: 'orange' },
            { step: 'Schedule inspection → assign correct inspector', color: 'orange' },
            { step: 'Receive inspector\'s report → update registry', color: 'orange' },
            { step: 'Archive completed/issued permits', color: 'orange' },
        ],
        quickActions: [
            { label: 'OBO Registry', to: '/gov/obo', icon: ShieldCheck },
            { label: 'Records Archive', to: '/gov/records', icon: BookOpen },
            { label: 'Reports Archive', to: '/gov/reports-archive', icon: BarChart2 },
        ],
    },

    division_chief: {
        label: 'Division Chief',
        division: 'Division Management',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Manages division operations and is the key approval node between field engineers and executive leadership.',
        myActions: [
            { label: 'Verified Reports Awaiting WO Creation', endpoint: '/api/reports?status=pending_approval', icon: AlertTriangle, urgency: 'high', action: 'Create Work Order' },
            { label: 'Design Submissions to Review', endpoint: '/api/gov/projects?status=design_in_progress', icon: Ruler, urgency: 'medium', action: 'Review & Recommend' },
            { label: 'Work Orders to Assign', endpoint: '/api/gov/work-orders?status=open', icon: GitBranch, urgency: 'high', action: 'Assign Engineer' },
        ],
        workflow: [
            { step: 'Review verified reports from Admin Clerk', color: 'orange' },
            { step: 'Create Work Order → assign to Project Engineer', color: 'orange' },
            { step: 'Monitor project phase transitions', color: 'orange' },
            { step: 'Review designs from Design Engineer', color: 'orange' },
            { step: 'Recommend approval to City Engineer', color: 'orange' },
        ],
        quickActions: [
            { label: 'Command Center', to: '/dispatcher', icon: AlertTriangle },
            { label: 'Work Orders', to: '/gov/work-orders', icon: GitBranch },
            { label: 'LGU Projects', to: '/gov/projects', icon: Map },
        ],
    },

    design_engineer: {
        label: 'Design Engineer',
        division: 'Design & Planning Division',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Creates engineering plans and designs for all LGU infrastructure projects in Phase 3.',
        myActions: [
            { label: 'Projects Awaiting Design (Phase 3)', endpoint: '/api/gov/projects?status=survey_complete', icon: Ruler, urgency: 'high', action: 'Start Design' },
            { label: 'Designs to Submit for Review', endpoint: '/api/gov/projects?status=design_in_progress', icon: Map, urgency: 'medium', action: 'Submit Design' },
        ],
        workflow: [
            { step: 'Receive survey report from Project Engineer', color: 'orange' },
            { step: 'Create engineering plans & technical drawings', color: 'orange' },
            { step: 'Coordinate with CAD Operator for drafting', color: 'orange' },
            { step: 'Submit completed design to Division Chief', color: 'orange' },
            { step: 'Revise per Division Chief / City Engineer feedback', color: 'orange' },
        ],
        quickActions: [
            { label: 'Design Requests', to: '/gov/design-requests', icon: Ruler },
            { label: 'LGU Projects', to: '/gov/projects', icon: Map },
        ],
    },

    cad_operator: {
        label: 'CAD Operator',
        division: 'Design & Planning Division',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Produces technical drawings and CAD files based on designs from the Design Engineer.',
        myActions: [
            { label: 'Design Tasks Assigned to You', endpoint: '/api/gov/projects?status=design_in_progress', icon: Ruler, urgency: 'high', action: 'Work on Drawing' },
        ],
        workflow: [
            { step: 'Receive design brief from Design Engineer', color: 'orange' },
            { step: 'Produce AutoCAD / technical drawings', color: 'orange' },
            { step: 'Submit drawings for Design Engineer review', color: 'orange' },
            { step: 'Revise per feedback', color: 'orange' },
        ],
        quickActions: [
            { label: 'Design Division', to: '/gov/design-requests', icon: Ruler },
            { label: 'LGU Projects', to: '/gov/projects', icon: Map },
        ],
    },

    project_engineer: {
        label: 'Project Engineer',
        division: 'Survey / Construction Division',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Conducts field surveys (Phase 2), manages active construction (Phase 6), and signs off on work order completion.',
        myActions: [
            { label: 'Projects to Survey (Phase 2)', endpoint: '/api/gov/projects?status=survey_in_progress', icon: Eye, urgency: 'high', action: 'Submit Survey Report' },
            { label: 'Work Orders Assigned to You', endpoint: '/api/gov/work-orders?status=assigned', icon: GitBranch, urgency: 'high', action: 'Start Work' },
            { label: 'Work Orders In Progress', endpoint: '/api/gov/work-orders?status=in_progress', icon: Wrench, urgency: 'medium', action: 'Mark Complete' },
        ],
        workflow: [
            { step: 'Receive work order assignment from Division Chief', color: 'orange' },
            { step: 'Conduct field survey / inspection', color: 'orange' },
            { step: 'Coordinate Foreman and Field Workers', color: 'orange' },
            { step: 'Monitor daily construction progress', color: 'orange' },
            { step: 'Submit completion report when done', color: 'orange' },
        ],
        quickActions: [
            { label: 'My Work Orders', to: '/gov/work-orders', icon: GitBranch },
            { label: 'Field Surveys', to: '/gov/surveys', icon: Eye },
            { label: 'LGU Projects', to: '/gov/projects', icon: Map },
        ],
    },

    estimator: {
        label: 'Estimator / Quantity Surveyor',
        division: 'Survey & Estimation Division',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Prepares Bill of Quantities and Procurement Requests for all LGU projects and work orders.',
        myActions: [
            { label: 'Projects Needing BoQ (Phase 4)', endpoint: '/api/gov/projects?status=survey_complete', icon: ClipboardList, urgency: 'high', action: 'Prepare BoQ' },
            { label: 'My Draft Procurement Requests', endpoint: '/api/gov/procurement?status=draft', icon: PackageCheck, urgency: 'high', action: 'Submit for Validation' },
            { label: 'Submitted PRs Awaiting Validation', endpoint: '/api/gov/procurement?status=submitted', icon: Clock, urgency: 'low', action: 'Track' },
        ],
        workflow: [
            { step: 'Receive survey report from Project Engineer', color: 'orange' },
            { step: 'Prepare detailed Bill of Quantities (BoQ)', color: 'orange' },
            { step: 'Draft Procurement Request letter', color: 'orange' },
            { step: 'Submit PR to Administrative Officer V for validation', color: 'orange' },
            { step: 'Track PR through validation → City Engineer signature', color: 'orange' },
        ],
        quickActions: [
            { label: 'My Procurement Requests', to: '/gov/procurement', icon: PackageCheck },
            { label: 'Cost Estimation', to: '/gov/estimation', icon: ClipboardList },
            { label: 'Bill of Quantities', to: '/gov/boq', icon: BarChart2 },
        ],
    },

    construction_foreman: {
        label: 'Construction Foreman',
        division: 'Construction Division',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Supervises daily construction activities and coordinates field workers on assigned work orders.',
        myActions: [
            { label: 'Active Work Orders Under My Supervision', endpoint: '/api/gov/work-orders?status=in_progress', icon: HardHat, urgency: 'high', action: 'Update Progress' },
            { label: 'Work Orders Assigned to Team', endpoint: '/api/gov/work-orders?status=assigned', icon: GitBranch, urgency: 'high', action: 'Begin Work' },
        ],
        workflow: [
            { step: 'Receive dispatch from Project Engineer', color: 'orange' },
            { step: 'Brief field workers on the work assignment', color: 'orange' },
            { step: 'Supervise daily construction activities on site', color: 'orange' },
            { step: 'Log daily progress and materials used', color: 'orange' },
            { step: 'Report completion to Project Engineer', color: 'orange' },
        ],
        quickActions: [
            { label: 'My Work Orders', to: '/gov/work-orders', icon: GitBranch },
            { label: 'Command Center', to: '/dispatcher', icon: AlertTriangle },
        ],
    },

    field_worker: {
        label: 'Field Worker / Laborer',
        division: 'Construction Division',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Executes construction and repair tasks as directed by the Construction Foreman.',
        myActions: [
            { label: 'Tasks Assigned to Me', endpoint: '/api/gov/work-orders?status=in_progress', icon: Wrench, urgency: 'high', action: 'View Details' },
        ],
        workflow: [
            { step: 'Receive task assignment from Foreman', color: 'orange' },
            { step: 'Execute assigned construction / repair work', color: 'orange' },
            { step: 'Report task completion to Foreman', color: 'orange' },
        ],
        quickActions: [
            { label: 'Active Work Orders', to: '/gov/work-orders', icon: GitBranch },
        ],
    },

    building_inspector: {
        label: 'Building Inspector',
        division: 'OBO — Office of the Building Official',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Conducts building structure inspections for permits and milestone inspections on LGU projects.',
        myActions: [
            { label: 'Scheduled Building Inspections', endpoint: '/api/gov/obo?status=inspection_scheduled&inspection_type=building', icon: Building2, urgency: 'high', action: 'Conduct & Report' },
            { label: 'Applications Awaiting Assignment', endpoint: '/api/gov/obo?status=application_received', icon: ShieldCheck, urgency: 'medium', action: 'Accept' },
        ],
        workflow: [
            { step: 'Receive inspection assignment from Records Officer', color: 'orange' },
            { step: 'Review permit application documents', color: 'orange' },
            { step: 'Conduct on-site building inspection', color: 'orange' },
            { step: 'File inspection report (COMPLIANT / NON-COMPLIANT)', color: 'orange' },
            { step: 'Division Chief reviews → forward to City Engineer', color: 'orange' },
        ],
        quickActions: [
            { label: 'OBO Inspections', to: '/gov/obo', icon: ShieldCheck },
            { label: 'Permit Tracking', to: '/management', tab: 'permits', icon: Building2 },
        ],
    },

    electrical_inspector: {
        label: 'Electrical Inspector',
        division: 'OBO — Office of the Building Official',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Conducts electrical systems inspections for building permits and compliance.',
        myActions: [
            { label: 'Scheduled Electrical Inspections', endpoint: '/api/gov/obo?status=inspection_scheduled&inspection_type=electrical', icon: Building2, urgency: 'high', action: 'Conduct & Report' },
        ],
        workflow: [
            { step: 'Receive assignment from Records Officer', color: 'orange' },
            { step: 'Review electrical plan/documents', color: 'orange' },
            { step: 'Conduct on-site electrical inspection', color: 'orange' },
            { step: 'File findings report', color: 'orange' },
            { step: 'Division Chief review → City Engineer signs permit', color: 'orange' },
        ],
        quickActions: [
            { label: 'OBO Inspections', to: '/gov/obo', icon: ShieldCheck },
        ],
    },

    mechanical_inspector: {
        label: 'Mechanical Inspector',
        division: 'OBO — Office of the Building Official',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Conducts mechanical systems inspections (plumbing, HVAC, etc.) for building permits.',
        myActions: [
            { label: 'Scheduled Mechanical Inspections', endpoint: '/api/gov/obo?status=inspection_scheduled&inspection_type=mechanical', icon: Wrench, urgency: 'high', action: 'Conduct & Report' },
        ],
        workflow: [
            { step: 'Receive assignment from Records Officer', color: 'orange' },
            { step: 'Review mechanical plan/documents', color: 'orange' },
            { step: 'Conduct on-site mechanical inspection', color: 'orange' },
            { step: 'File findings report', color: 'orange' },
            { step: 'Division Chief review → City Engineer signs permit', color: 'orange' },
        ],
        quickActions: [
            { label: 'OBO Inspections', to: '/gov/obo', icon: ShieldCheck },
        ],
    },

    system_admin: {
        label: 'System Administrator',
        division: 'DICT / IT Services',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Manages all system users, roles, and configurations. Full access to all modules.',
        myActions: [
            { label: 'All System Users', endpoint: '/api/gov/users', icon: Users, urgency: 'low', action: 'Manage Roles' },
            { label: 'Recent Audit Events', endpoint: '/api/gov/audit-logs', icon: BarChart2, urgency: 'low', action: 'Review' },
        ],
        workflow: [
            { step: 'Create user accounts for new staff', color: 'orange' },
            { step: 'Assign Plantilla positions as roles', color: 'orange' },
            { step: 'Monitor audit logs for anomalies', color: 'orange' },
            { step: 'Maintain system configuration', color: 'orange' },
        ],
        quickActions: [
            { label: 'User Management', to: '/management', tab: 'users', icon: Users },
            { label: 'Role Management', to: '/gov/users', icon: UserCog },
            { label: 'Audit Logs', to: '/gov/audit-logs', icon: BarChart2 },
            { label: 'System Settings', to: '/gov/settings', icon: TrendingUp },
        ],
    },

    manager: {
        label: 'Manager',
        division: 'Executive Leadership',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Senior management access to all modules and approval queues.',
        myActions: [
            { label: 'Pending Approvals', endpoint: '/api/gov/work-orders?status=completed', icon: CheckSquare, urgency: 'high', action: 'Approve' },
            { label: 'Active Projects', endpoint: '/api/gov/projects', icon: Map, urgency: 'medium', action: 'Review' },
        ],
        workflow: [
            { step: 'Review division reports', color: 'orange' },
            { step: 'Approve/reject escalated items', color: 'orange' },
            { step: 'Monitor overall system performance', color: 'orange' },
        ],
        quickActions: [
            { label: 'Exec Overview', to: '/management', icon: TrendingUp },
            { label: 'All Projects', to: '/gov/projects', icon: Map },
            { label: 'Audit Logs', to: '/gov/audit-logs', icon: BarChart2 },
        ],
    },

    dispatcher: {
        label: 'Dispatcher',
        division: 'Operations',
        color: 'orange',
        gradient: 'from-primary to-secondary animate-gradient-flow',
        description: 'Monitors and triages incoming citizen incident reports.',
        myActions: [
            { label: 'Unverified Reports', endpoint: '/api/reports?status=unverified', icon: AlertTriangle, urgency: 'high', action: 'Triage' },
            { label: 'Active Work Orders', endpoint: '/api/gov/work-orders?status=in_progress', icon: Truck, urgency: 'medium', action: 'Track' },
        ],
        workflow: [
            { step: 'Monitor live incident feed', color: 'orange' },
            { step: 'Verify or reject incoming reports', color: 'orange' },
            { step: 'Track active dispatched work orders', color: 'orange' },
        ],
        quickActions: [
            { label: 'Command Center', to: '/dispatcher', icon: AlertTriangle },
            { label: 'Work Orders', to: '/gov/work-orders', icon: Truck },
        ],
    },
};

const URGENCY_COLORS = {
    high: 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    medium: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800',
    low: 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700',
};

const URGENCY_BADGE = {
    high: 'bg-red-500 text-white',
    medium: 'bg-orange-400 text-white',
    low: 'bg-slate-400 text-white',
};

const COLOR_MAP = {
    blue: 'text-blue-600 dark:text-blue-400', indigo: 'text-indigo-600 dark:text-indigo-400',
    purple: 'text-purple-600 dark:text-purple-400', teal: 'text-teal-600 dark:text-teal-400',
    emerald: 'text-emerald-600 dark:text-emerald-400', green: 'text-green-600 dark:text-green-400',
    orange: 'text-orange-600 dark:text-orange-400', red: 'text-red-600 dark:text-red-400',
    yellow: 'text-yellow-600 dark:text-yellow-400', violet: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400', cyan: 'text-cyan-600 dark:text-cyan-400',
    slate: 'text-slate-600 dark:text-slate-400',
};

// ─────────────────────────────────────────────────────────────────────────────
// Action Card  — shows a "pending action" count and lets user navigate to it
// ─────────────────────────────────────────────────────────────────────────────
const ActionCard = ({ action, token }) => {
    const [count, setCount] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!action.endpoint || !token) { setLoading(false); return; }
        fetch(`${API}${action.endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then(data => setCount(Array.isArray(data) ? data.length : 0))
            .catch(() => setCount(null))
            .finally(() => setLoading(false));
    }, [action.endpoint, token]);

    const Icon = action.icon;
    const hasItems = count !== null && count > 0;

    // Derive navigation target from endpoint pattern
    const getNavTarget = () => {
        if (!action.endpoint) return null;
        if (action.endpoint.includes('/reports')) return '/dispatcher';
        if (action.endpoint.includes('/work-orders')) return '/gov/work-orders';
        if (action.endpoint.includes('/projects')) return '/gov/projects';
        if (action.endpoint.includes('/procurement')) return '/gov/procurement';
        if (action.endpoint.includes('/obo')) return '/gov/obo';
        if (action.endpoint.includes('/users')) return '/gov/users';
        if (action.endpoint.includes('/audit-logs')) return '/gov/audit-logs';
        return null;
    };

    const navTarget = getNavTarget();

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navTarget && navigate(navTarget)}
            className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-all hover:shadow-md ${URGENCY_COLORS[action.urgency]} ${navTarget ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/60 dark:bg-slate-800/60 flex items-center justify-center shrink-0 shadow-sm">
                    <Icon size={18} className={URGENCY_BADGE[action.urgency].replace('bg-', 'text-').replace('text-white', action.urgency === 'high' ? 'text-red-600' : action.urgency === 'medium' ? 'text-orange-500' : 'text-slate-500')} />
                </div>
                <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{action.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{action.action}</div>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {loading ? (
                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
                ) : count !== null ? (
                    <span className={`text-lg font-black px-2 py-0.5 rounded-xl ${hasItems ? URGENCY_BADGE[action.urgency] : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                        {count}
                    </span>
                ) : (
                    <span className="text-xs text-slate-400">—</span>
                )}
                {navTarget && <ChevronRight size={16} className="text-slate-400" />}
            </div>
        </motion.div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Step list
// ─────────────────────────────────────────────────────────────────────────────
const WorkflowGuide = ({ steps }) => (
    <div className="space-y-2">
        {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5 bg-gradient-to-br ${
                    step.color === 'green' ? 'from-green-500 to-emerald-600' :
                    step.color === 'red' ? 'from-red-500 to-red-600' :
                    step.color === 'blue' ? 'from-blue-500 to-blue-700' :
                    step.color === 'indigo' ? 'from-indigo-500 to-indigo-700' :
                    step.color === 'orange' ? 'from-orange-400 to-orange-600' :
                    step.color === 'teal' ? 'from-teal-500 to-teal-700' :
                    step.color === 'violet' ? 'from-violet-500 to-violet-700' :
                    step.color === 'purple' ? 'from-purple-500 to-purple-700' :
                    'from-slate-500 to-slate-700'
                }`}>
                    {i + 1}
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-snug pt-0.5">{step.step}</div>
            </div>
        ))}
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Stats Bar  — quick overall system snapshot
// ─────────────────────────────────────────────────────────────────────────────
const StatsBar = ({ token }) => {
    const [stats, setStats] = useState(null);
    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/gov/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(setStats)
            .catch(() => {});
    }, [token]);

    const items = stats ? [
        { label: 'Open Work Orders', value: stats.open_work_orders || 0, icon: GitBranch, color: 'text-blue-600' },
        { label: 'Active Projects', value: stats.active_projects || 0, icon: Map, color: 'text-indigo-600' },
        { label: 'Pending Procurement', value: stats.pending_procurement || 0, icon: PackageCheck, color: 'text-violet-600' },
        { label: 'OBO Applications', value: stats.obo_pending || 0, icon: ShieldCheck, color: 'text-teal-600' },
    ] : [];

    return stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {items.map((item, i) => {
                const Icon = item.icon;
                return (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Icon size={18} className={item.color} />
                        </div>
                        <div>
                            <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">{item.value}</div>
                            <div className="text-[10px] text-slate-500 font-bold">{item.label}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    ) : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const PositionDashboard = () => {
    const navigate = useNavigate();
    const [token] = useState(() => getAuthToken());
    const [currentUser] = useState(() => getAuthUser());

    const { theme } = useTheme();
    const DARK_SCENE  = 'https://prod.spline.design/us1Y6xfaQLiI2cim/scene.splinecode';
    const LIGHT_SCENE = 'https://prod.spline.design/nrFjYzbJnF7GU92z/scene.splinecode';

    useEffect(() => {
        if (!token || !currentUser) navigate('/gov');
    }, [token, currentUser, navigate]);

    const role = currentUser?.role || 'dispatcher';
    const config = ROLE_CONFIG[role] || ROLE_CONFIG['dispatcher'];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-300 font-sans flex text-sm">
            <GovSidebar currentUser={currentUser} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white dark:bg-slate-900/80 flex items-center justify-between px-8 shrink-0 border-b border-slate-100 dark:border-slate-800 z-40">
                    <div>
                        <h1 className="font-black text-base text-slate-900 dark:text-white">
                            {currentUser ? `Welcome, ${currentUser.full_name?.split(' ')[0] || 'Officer'}` : 'My Dashboard'}
                        </h1>
                        <p className="text-[11px] text-slate-500">
                            {config.label} · {config.division}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-[11px] font-black text-white bg-gradient-to-r ${config.gradient}`}>
                            {config.division}
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="w-full mx-auto">

                        {/* Role Banner */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`relative overflow-hidden rounded-2xl p-6 mb-6 bg-gradient-to-br ${config.gradient} text-white shadow-lg`}
                        >
                            {/* Spline Background */}
                            <div className="absolute -top-10 -left-10 -right-20 -bottom-20 z-0 opacity-40 mix-blend-overlay pointer-events-none">
                                <Spline scene={theme === 'dark' ? DARK_SCENE : LIGHT_SCENE} />
                            </div>

                            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">{config.division}</div>
                                    <h2 className="text-xl font-black leading-tight">{config.label}</h2>
                                    <p className="text-sm opacity-80 mt-1 max-w-lg">{config.description}</p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="text-3xl font-black opacity-20">{role.substring(0, 2).toUpperCase()}</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* System-wide Stats */}
                        <StatsBar token={token} />

                        {/* Two columns */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Left column — My Pending Actions */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Bell size={16} className="text-red-500" />
                                        My Pending Actions
                                    </h3>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Requires your action</span>
                                </div>

                                <div className="space-y-2">
                                    {config.myActions.map((action, i) => (
                                        <ActionCard key={i} action={action} token={token} />
                                    ))}
                                    {config.myActions.length === 0 && (
                                        <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                            <CheckCircle2 size={36} className="mx-auto mb-2 opacity-30" />
                                            <p className="font-bold">No pending actions for this role.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Actions */}
                                <div className="mt-4">
                                    <h3 className="font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <ArrowRight size={16} className="text-indigo-500" />
                                        Quick Actions
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {config.quickActions.map((qa, i) => {
                                            const Icon = qa.icon;
                                            return (
                                                <Link
                                                    key={i}
                                                    to={qa.to}
                                                    className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm transition-all group"
                                                >
                                                    <Icon size={16} className="text-indigo-500 group-hover:text-indigo-600 shrink-0" />
                                                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs leading-tight">{qa.label}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Right column — Workflow Guide */}
                            <div className="space-y-4">
                                <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Activity size={16} className="text-indigo-500" />
                                    My Workflow
                                </h3>
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Process Guide for {config.label}</p>
                                    <WorkflowGuide steps={config.workflow} />
                                </div>

                                {/* Inter-position Approval Chain hint */}
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Approval Chain</p>
                                    <ApprovalChainHint role={role} />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Approval Chain visual hint per role
// ─────────────────────────────────────────────────────────────────────────────
const APPROVAL_CHAINS = {
    city_engineer: ['Division Chiefs', 'Asst. City Engineer', '→ YOU sign off'],
    asst_city_engineer: ['Division Chiefs', '→ YOU review', 'City Engineer co-signs'],
    admin_officer: ['Estimator submits PR', '→ YOU validate', 'City Engineer signs'],
    admin_clerk: ['Citizen report', '→ YOU verify', 'Division Chief reviews'],
    records_officer: ['Citizen/applicant', '→ YOU receive & log', 'You assign inspector'],
    division_chief: ['Admin Clerk forwards', '→ YOU review', 'You create Work Order'],
    design_engineer: ['Division Chief assigns', '→ YOU design', 'Division Chief reviews'],
    cad_operator: ['Design Engineer', '→ YOU draft', 'Design Engineer submits'],
    project_engineer: ['Division Chief assigns', '→ YOU execute', 'You mark complete'],
    estimator: ['Project Engineer survey', '→ YOU prepare BoQ', 'Admin Officer validates'],
    construction_foreman: ['Project Engineer dispatches', '→ YOU supervise', 'Report completion'],
    field_worker: ['Foreman directs', '→ YOU execute', 'Report to Foreman'],
    building_inspector: ['Records Officer assigns', '→ YOU inspect', 'Division Chief reviews'],
    electrical_inspector: ['Records Officer assigns', '→ YOU inspect', 'Division Chief reviews'],
    mechanical_inspector: ['Records Officer assigns', '→ YOU inspect', 'Division Chief reviews'],
    system_admin: ['All users managed', '→ YOU administer', 'Full system access'],
    manager: ['All divisions report', '→ YOU oversee', 'City Engineer leads'],
    dispatcher: ['Citizens report', '→ YOU triage', 'Division Chief reviews'],
};

const ApprovalChainHint = ({ role }) => {
    const chain = APPROVAL_CHAINS[role] || ['Standard LGU workflow applies'];
    return (
        <div className="space-y-1">
            {chain.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${step.startsWith('→ YOU') ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span className={step.startsWith('→ YOU') ? 'font-black text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}>
                        {step}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default PositionDashboard;
