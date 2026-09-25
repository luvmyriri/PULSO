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
import GovBreadcrumb from '../components/GovBreadcrumb';
import GovSystemBanner from '../components/GovSystemBanner';
import GovBiDashboard from '../components/GovBiDashboard';
import ThemeToggle from '../components/ThemeToggle';
import GovUserDropdown from '../components/GovUserDropdown';
import GovNotificationDropdown from '../components/GovNotificationDropdown';
import './position-dashboard.css';
import { useTheme } from '../contexts/ThemeContext';
import { getAuthToken, getAuthUser } from '../utils/authSession';
import Spline from '@splinetool/react-spline';

import { API_BASE_URL } from '../utils/apiBase';

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

const actionTargetFor = (action) => {
    if (!action.endpoint) {
        return action.label.includes('Advisory') ? '/gov/operations?view=updates' : null;
    }
    if (action.endpoint.includes('/reports')) return '/gov/operations?view=reports';
    if (action.endpoint.includes('/work-orders')) return '/gov/operations?view=work-orders';
    if (action.endpoint.includes('/projects')) return '/gov/delivery?view=projects';
    if (action.endpoint.includes('/procurement')) return '/gov/delivery?view=procurement';
    if (action.endpoint.includes('/obo')) return '/gov/obo';
    if (action.endpoint.includes('/users')) return '/gov/administration?view=staff';
    if (action.endpoint.includes('/audit-logs')) return '/gov/records-workspace?view=audit';
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Action Card  — shows a "pending action" count and lets user navigate to it
// ─────────────────────────────────────────────────────────────────────────────
const ActionCard = ({ action, token }) => {
    const [count, setCount] = useState(null);
    const [status, setStatus] = useState(action.endpoint ? 'loading' : 'unavailable');

    useEffect(() => {
        if (!action.endpoint || !token) return undefined;
        const controller = new AbortController();
        fetch(`${API_BASE_URL}${action.endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) throw new Error(`Request failed with ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setCount(data.length);
                } else if (data.items) {
                    setCount(data.total ?? data.items.length);
                } else if (data.users) {
                    setCount(data.total ?? data.users.length);
                } else if (data.total !== undefined) {
                    setCount(data.total);
                } else if (data.count !== undefined) {
                    setCount(data.count);
                } else {
                    setCount(0);
                }
                setStatus('ready');
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    setCount(null);
                    setStatus('error');
                }
            });

        return () => controller.abort();
    }, [action.endpoint, token]);

    const Icon = action.icon;
    const navTarget = actionTargetFor(action);
    const content = (
        <>
            <span className="gov-action-row__signal" aria-hidden="true" />
            <span className="gov-action-row__icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.8} />
            </span>
            <span className="gov-action-row__copy">
                <strong>{action.label}</strong>
                <span>{action.action}</span>
            </span>
            <span className="gov-action-row__state" aria-live="polite">
                {status === 'loading' && <span className="gov-action-row__loading">Loading</span>}
                {status === 'ready' && <strong>{count}</strong>}
                {status === 'error' && <span className="is-error">Unavailable</span>}
                {status === 'unavailable' && <span>Open</span>}
            </span>
            {navTarget && <ChevronRight size={17} aria-hidden="true" />}
        </>
    );

    return navTarget ? (
        <Link to={navTarget} className="gov-action-row" data-urgency={action.urgency}>
            {content}
        </Link>
    ) : (
        <div className="gov-action-row" data-urgency={action.urgency}>
            {content}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Step list
// ─────────────────────────────────────────────────────────────────────────────
const WorkflowGuide = ({ steps }) => (
    <ol className="gov-workflow-list">
        {steps.map((step, i) => (
            <li key={step.step}>
                <span className="gov-workflow-list__step" aria-hidden="true">{i + 1}</span>
                <span>{step.step}</span>
            </li>
        ))}
    </ol>
);

// ─────────────────────────────────────────────────────────────────────────────
// Stats Bar  — quick overall system snapshot
// ─────────────────────────────────────────────────────────────────────────────
const StatsBar = ({ token }) => {
    const [stats, setStats] = useState(null);
    const [status, setStatus] = useState('loading');
    const [updatedAt, setUpdatedAt] = useState(null);
    const [requestVersion, setRequestVersion] = useState(0);

    useEffect(() => {
        if (!token) return undefined;
        const controller = new AbortController();
        fetch(`${API_BASE_URL}/api/gov/dashboard/stats`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) throw new Error(`Request failed with ${response.status}`);
                return response.json();
            })
            .then((data) => {
                setStats(data);
                setUpdatedAt(new Date());
                setStatus('ready');
            })
            .catch((error) => {
                if (error.name !== 'AbortError') setStatus('error');
            });

        return () => controller.abort();
    }, [token, requestVersion]);

    const items = [
        { label: 'Open work orders', value: stats?.open_work_orders ?? null, icon: GitBranch },
        { label: 'Active projects', value: stats?.active_projects ?? null, icon: Map },
        { label: 'Pending procurement', value: stats?.pending_procurement ?? null, icon: PackageCheck },
        { label: 'Permit applications', value: stats?.obo_pending ?? null, icon: ShieldCheck },
    ];

    if (status === 'error') {
        return (
            <GovSystemBanner
                type="partial_data"
                title="Work summary unavailable."
                message="The workspaces are still available from navigation."
                actionLabel="Retry"
                onAction={() => {
                    setStatus('loading');
                    setRequestVersion((version) => version + 1);
                }}
            />
        );
    }

    return (
        <section className="gov-work-summary" aria-labelledby="work-summary-heading" aria-busy={status === 'loading'}>
            <div className="gov-section-heading gov-section-heading--summary">
                <div>
                    <p className="gov-eyebrow">Office workload</p>
                    <h2 id="work-summary-heading">Current work summary</h2>
                </div>
                <p>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Loading current totals'}</p>
            </div>
            <div className="gov-work-summary__grid">
                {items.map((item) => {
                const Icon = item.icon;
                return (
                    <div key={item.label} className="gov-work-summary__item">
                        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                        <strong className={item.value === null && status !== 'loading' ? 'is-unavailable' : undefined}>
                            {status === 'loading' ? '…' : item.value ?? 'Not provided'}
                        </strong>
                        <span>{item.label}</span>
                    </div>
                );
            })}
            </div>
        </section>
    );
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
    const firstName = currentUser?.full_name?.split(' ')[0] || 'Officer';

    return (
        <div className="gov-workspace-shell">
            <GovSidebar currentUser={currentUser} />

            <div className="gov-workspace">
                <GovSystemBanner autoOffline={true} />
                <header className="gov-workspace-header relative z-50">
                    <div className="flex flex-col text-left">
                        <GovBreadcrumb category="Staff Workspace" current="Assigned Tasks & Roles" />
                        <h1>My work</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="gov-workspace-header__scope" aria-label="Current role and division">
                            <span>{config.division}</span>
                            <strong>{config.label}</strong>
                        </div>
                        <ThemeToggle />
                        <GovNotificationDropdown />
                        <GovUserDropdown currentUser={currentUser} />
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

                        {/* Executive Business Intelligence Graph Dashboard */}
                        <GovBiDashboard token={token} currentUser={currentUser} />

                        <div className="gov-my-work__grid">
                            <section className="gov-action-queue" aria-labelledby="pending-actions-heading">
                                <div className="gov-section-heading">
                                    <div>
                                        <p className="gov-eyebrow">Personal queue</p>
                                        <h2 id="pending-actions-heading">Needs your attention</h2>
                                    </div>
                                    <span>Based on your role</span>
                                </div>

                                <div className="gov-action-queue__list">
                                    {config.myActions.map((action) => (
                                        <ActionCard key={action.label} action={action} token={token} />
                                    ))}
                                    {config.myActions.length === 0 && (
                                        <div className="gov-queue-empty">
                                            <CheckCircle2 size={26} aria-hidden="true" />
                                            <div>
                                                <strong>No pending actions</strong>
                                                <p>Nothing currently requires this role.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <aside className="gov-process-rail" aria-label="Role process guidance">
                                <section aria-labelledby="workflow-heading">
                                    <div className="gov-section-heading gov-section-heading--compact">
                                        <div>
                                            <p className="gov-eyebrow">Role guide</p>
                                            <h2 id="workflow-heading">How your work moves</h2>
                                        </div>
                                        <Activity size={17} aria-hidden="true" />
                                    </div>
                                    <WorkflowGuide steps={config.workflow} />
                                </section>

                                <section className="gov-approval-chain" aria-labelledby="approval-chain-heading">
                                    <p className="gov-eyebrow">Handoff context</p>
                                    <h2 id="approval-chain-heading">Approval chain</h2>
                                    <ApprovalChainHint role={role} />
                                </section>
                            </aside>
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
        <ol className="gov-approval-chain__list">
            {chain.map((step) => (
                <li key={step} className={step.startsWith('→ YOU') ? 'is-current' : undefined}>
                    <span className="gov-approval-chain__marker" aria-hidden="true" />
                    <span>{step.replace('→ YOU', 'Your action:')}</span>
                </li>
            ))}
        </ol>
    );
};

export default PositionDashboard;
