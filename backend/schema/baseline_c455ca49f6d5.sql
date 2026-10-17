CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

CREATE TABLE public.advisories (
    id integer NOT NULL,
    advisory_id character varying,
    department character varying,
    title character varying,
    description character varying,
    priority character varying,
    category character varying,
    has_image boolean,
    image_url character varying,
    stats_views integer,
    stats_affected character varying,
    created_at timestamp with time zone DEFAULT now(),
    author_id integer
);
CREATE SEQUENCE public.advisories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.advisories_id_seq OWNED BY public.advisories.id;
CREATE TABLE public.agent_locations (
    id integer NOT NULL,
    agent_id integer,
    latitude double precision,
    longitude double precision,
    status character varying,
    accuracy double precision,
    battery_level integer,
    location_name character varying,
    updated_at timestamp with time zone DEFAULT now(),
    location_geog public.geography(Point,4326) GENERATED ALWAYS AS (
CASE
    WHEN (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)) AND ((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision))) THEN (public.st_setsrid(public.st_makepoint(longitude, latitude), 4326))::public.geography
    ELSE NULL::public.geography
END) STORED,
    location public.geometry(Point,4326)
);
CREATE SEQUENCE public.agent_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.agent_locations_id_seq OWNED BY public.agent_locations.id;
CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);
CREATE TABLE public.announcement_corrections (
    id integer NOT NULL,
    announcement_id integer NOT NULL,
    editor_id integer NOT NULL,
    correction_summary text NOT NULL,
    reason text NOT NULL,
    previous_content json,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.announcement_corrections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.announcement_corrections_id_seq OWNED BY public.announcement_corrections.id;
CREATE TABLE public.announcement_deliveries (
    id integer NOT NULL,
    announcement_id integer NOT NULL,
    channel character varying NOT NULL,
    status character varying,
    recipient_count integer,
    delivered_count integer,
    failed_count integer,
    error_message text,
    last_attempted_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.announcement_deliveries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.announcement_deliveries_id_seq OWNED BY public.announcement_deliveries.id;
CREATE TABLE public.announcements (
    id integer NOT NULL,
    announcement_id character varying,
    title_en character varying NOT NULL,
    title_fil character varying,
    content_en text NOT NULL,
    content_fil text,
    category character varying,
    priority character varying,
    status character varying,
    target_audience character varying,
    target_districts json,
    target_barangays json,
    district_id integer,
    barangay_id integer,
    channels json NOT NULL,
    scheduled_at timestamp with time zone,
    published_at timestamp with time zone,
    expires_at timestamp with time zone,
    author_id integer NOT NULL,
    reviewer_id integer,
    approved_by_id integer,
    approved_at timestamp with time zone,
    withdrawal_reason text,
    withdrawn_at timestamp with time zone,
    withdrawn_by_id integer,
    source_report_id integer,
    source_work_order_id integer,
    source_project_id integer,
    source_asset_id character varying,
    image_url character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;
CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    trigger_type character varying,
    report_id integer,
    work_order_id integer,
    project_id integer,
    procurement_id integer,
    actor_id integer,
    actor_role character varying,
    action character varying,
    details text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;
CREATE TABLE public.barangays (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    district_id integer NOT NULL,
    zip_code character varying(10),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sector character varying(32),
    brgy_num integer,
    display_name character varying(100),
    geom public.geometry(MultiPolygon,4326)
);
CREATE SEQUENCE public.barangays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.barangays_id_seq OWNED BY public.barangays.id;
CREATE TABLE public.boq_items (
    id integer NOT NULL,
    procurement_request_id integer,
    item_name character varying,
    unit character varying,
    quantity double precision,
    unit_cost double precision,
    total_cost double precision,
    specifications text
);
CREATE SEQUENCE public.boq_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.boq_items_id_seq OWNED BY public.boq_items.id;
CREATE TABLE public.chat_conversations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.chat_conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.chat_conversations_id_seq OWNED BY public.chat_conversations.id;
CREATE TABLE public.chat_messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    role character varying(20) NOT NULL,
    content text NOT NULL,
    tool_name character varying(100),
    tool_data text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.chat_messages_id_seq OWNED BY public.chat_messages.id;
CREATE TABLE public.city_boundaries (
    id integer NOT NULL,
    name character varying(64) NOT NULL,
    sector character varying(32) NOT NULL,
    geom public.geometry(MultiPolygon,4326) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.city_boundaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.city_boundaries_id_seq OWNED BY public.city_boundaries.id;
CREATE TABLE public.command_receipts (
    id integer NOT NULL,
    actor_id integer NOT NULL,
    operation character varying(64) NOT NULL,
    report_id integer NOT NULL,
    idempotency_key character varying(128) NOT NULL,
    request_hash character varying(64) NOT NULL,
    resource_id integer NOT NULL,
    result_json json,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.command_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.command_receipts_id_seq OWNED BY public.command_receipts.id;
CREATE TABLE public.districts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.districts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.districts_id_seq OWNED BY public.districts.id;
CREATE TABLE public.environmental_context (
    id integer NOT NULL,
    barangay_id integer,
    flood_risk_level character varying,
    soil_subsidence double precision
);
CREATE SEQUENCE public.environmental_context_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.environmental_context_id_seq OWNED BY public.environmental_context.id;
CREATE TABLE public.infrastructure_assets (
    asset_id character varying NOT NULL,
    asset_name character varying,
    category character varying,
    gps_coordinates json,
    material_type character varying,
    date_completed date,
    design_life integer,
    original_contractor character varying,
    barangay character varying,
    barangay_id integer,
    condition_score double precision DEFAULT 80.0,
    status character varying DEFAULT 'operational'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    geom public.geometry(Geometry,4326)
);
CREATE TABLE public.maintenance_history (
    log_id character varying NOT NULL,
    asset_id character varying NOT NULL,
    work_type character varying,
    cost double precision,
    completion_date date
);
CREATE TABLE public.news_items (
    id integer NOT NULL,
    category character varying,
    headline character varying NOT NULL,
    excerpt text NOT NULL,
    image_url character varying,
    barangay character varying,
    source_url character varying,
    published_at timestamp with time zone,
    priority character varying,
    posted_by character varying,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.news_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.news_items_id_seq OWNED BY public.news_items.id;
CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    title character varying,
    message character varying,
    priority integer,
    is_read boolean,
    is_hidden boolean,
    created_at timestamp with time zone DEFAULT now(),
    resident_id integer,
    official_id integer,
    outbox_event_id integer
);
CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;
CREATE TABLE public.obo_inspections (
    id integer NOT NULL,
    obo_number character varying,
    applicant_name character varying,
    applicant_contact character varying,
    property_address character varying,
    location_lat double precision,
    location_lng double precision,
    barangay character varying,
    inspection_type character varying,
    status character varying,
    assigned_inspector_id integer,
    filed_by_id integer,
    cleared_by_id integer,
    inspection_date timestamp with time zone,
    findings text,
    is_compliant boolean,
    violation_details text,
    source_report_id integer,
    arch_review character varying,
    civil_review character varying,
    elec_review character varying,
    sani_review character varying,
    mech_review character varying,
    engineering_clearance_id integer,
    review_signatures json,
    order_of_payment_fee double precision,
    payment_verified boolean,
    appeal_status character varying,
    appeal_evidence_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    barangay_id integer,
    district_id integer
);
CREATE SEQUENCE public.obo_inspections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.obo_inspections_id_seq OWNED BY public.obo_inspections.id;
CREATE TABLE public.officials (
    id integer NOT NULL,
    full_name character varying,
    email character varying,
    password_hash character varying,
    role_id integer,
    display_name character varying,
    account_type character varying,
    primary_jurisdiction json,
    is_active boolean,
    is_suspended boolean,
    suspension_reason character varying,
    suspended_at timestamp with time zone,
    suspended_by integer,
    created_at timestamp with time zone DEFAULT now(),
    barangay character varying,
    address character varying,
    phone_number character varying,
    role character varying,
    avatar_url character varying,
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.officials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.officials_id_seq OWNED BY public.officials.id;
CREATE TABLE public.outbox_events (
    id integer NOT NULL,
    event_key character varying(128) NOT NULL,
    event_type character varying(64) NOT NULL,
    payload json NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone
);
CREATE SEQUENCE public.outbox_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.outbox_events_id_seq OWNED BY public.outbox_events.id;
CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    email character varying,
    token character varying,
    expires_at timestamp with time zone,
    used boolean
);
CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;
CREATE TABLE public.process_timelines (
    id integer NOT NULL,
    report_id integer,
    work_order_id integer,
    project_id integer,
    status character varying,
    previous_status character varying,
    actor_id integer,
    actor_role character varying,
    note text,
    is_public boolean,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.process_timelines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.process_timelines_id_seq OWNED BY public.process_timelines.id;
CREATE TABLE public.procurement_requests (
    id integer NOT NULL,
    pr_number character varying,
    work_order_id integer,
    project_id integer,
    raised_by_id integer,
    validated_by_id integer,
    approved_by_id integer,
    title character varying,
    purpose text,
    status character varying,
    rejection_reason text,
    funding_certified boolean,
    obr_number character varying,
    cash_released boolean,
    bac_meeting_date timestamp with time zone,
    ntp_issued boolean,
    validated_at timestamp with time zone,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.procurement_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.procurement_requests_id_seq OWNED BY public.procurement_requests.id;
CREATE TABLE public.project_requests (
    id integer NOT NULL,
    proj_number character varying,
    requesting_party character varying,
    barangay character varying,
    title character varying,
    description text,
    location_string character varying,
    location_lat double precision,
    location_lng double precision,
    asset_id character varying,
    status character varying,
    current_phase integer,
    estimated_cost double precision,
    is_emergency boolean,
    procurement_modality character varying,
    category character varying,
    created_by_id integer,
    survey_engineer_id integer,
    design_lead_id integer,
    project_engineer_id integer,
    survey_completed_at timestamp with time zone,
    design_completed_at timestamp with time zone,
    approved_at timestamp with time zone,
    construction_started_at timestamp with time zone,
    completed_at timestamp with time zone,
    certificate_issued boolean,
    certificate_issued_by_id integer,
    qa_rejection_count integer,
    fqa_savings double precision,
    dlp_expiry timestamp with time zone,
    plan_attachments text,
    cad_attachments text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    barangay_id integer,
    district_id integer,
    source_report_id integer
);
CREATE SEQUENCE public.project_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.project_requests_id_seq OWNED BY public.project_requests.id;
CREATE TABLE public.reports (
    id integer NOT NULL,
    ticket_id character varying,
    user_id integer,
    category character varying,
    description character varying,
    location_lat double precision,
    location_lng double precision,
    location_string character varying,
    status character varying,
    image_url character varying,
    resolution_image_url character varying,
    ai_category character varying,
    ai_urgency character varying,
    ai_summary character varying,
    ai_reasoning character varying,
    severity_score double precision,
    ai_metadata json,
    location_barangay character varying,
    cluster_id integer,
    citizen_trust_score integer,
    kyc_tier_at_report character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    barangay_id integer,
    resident_id integer,
    budget numeric(12,2),
    deployment_date timestamp with time zone,
    citizen_confirmed_at timestamp with time zone,
    satisfaction_rating integer,
    citizen_feedback_note text,
    reporter_type character varying(20) DEFAULT 'registered'::character varying NOT NULL,
    tracking_token_hash character varying(128),
    contact_email character varying(255),
    contact_phone character varying(50),
    contact_verified boolean DEFAULT false NOT NULL,
    claimed_at timestamp with time zone,
    claimed_by_user_id integer,
    submission_source character varying(30) DEFAULT 'web'::character varying NOT NULL,
    location_geog public.geography(Point,4326) GENERATED ALWAYS AS (
CASE
    WHEN (((location_lat >= ('-90'::integer)::double precision) AND (location_lat <= (90)::double precision)) AND ((location_lng >= ('-180'::integer)::double precision) AND (location_lng <= (180)::double precision))) THEN (public.st_setsrid(public.st_makepoint(location_lng, location_lat), 4326))::public.geography
    ELSE NULL::public.geography
END) STORED,
    version integer DEFAULT 1 NOT NULL,
    location public.geometry(Point,4326),
    accuracy_m double precision DEFAULT 0.0,
    plus_code character varying(32),
    sector character varying(32)
);
CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;
CREATE TABLE public.residents (
    id integer NOT NULL,
    full_name character varying,
    email character varying,
    password_hash character varying,
    address character varying,
    barangay_id integer,
    district_id integer,
    phone_number character varying,
    trust_score integer,
    verification_code character varying,
    is_verified boolean,
    kyc_level character varying,
    last_kyc_verification timestamp with time zone,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    avatar_url character varying,
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.residents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.residents_id_seq OWNED BY public.residents.id;
CREATE TABLE public.system_documents (
    id integer NOT NULL,
    document_type character varying,
    file_path character varying,
    file_name character varying,
    file_size_bytes integer,
    sha256_hash character varying,
    category character varying,
    confidentiality character varying,
    retention_policy character varying,
    expiry_date timestamp with time zone,
    legal_hold boolean,
    target_model character varying,
    target_id integer,
    uploader_id integer,
    npki_signature boolean,
    metadata_json json,
    uploaded_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ck_sysdoc_target_model CHECK (((target_model)::text = ANY ((ARRAY['WorkOrder'::character varying, 'ProjectRequest'::character varying, 'ProcurementRequest'::character varying, 'OBOInspection'::character varying, 'Report'::character varying, 'InfrastructureAsset'::character varying, 'MaintenanceHistory'::character varying])::text[])))
);
CREATE SEQUENCE public.system_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.system_documents_id_seq OWNED BY public.system_documents.id;
CREATE TABLE public.system_roles (
    id integer NOT NULL,
    name character varying,
    label character varying,
    capabilities json,
    access_level character varying,
    is_template boolean,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.system_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.system_roles_id_seq OWNED BY public.system_roles.id;
CREATE TABLE public.system_setting_history (
    id integer NOT NULL,
    setting_id integer NOT NULL,
    version integer NOT NULL,
    old_value json,
    new_value json NOT NULL,
    reason text NOT NULL,
    changed_by_id integer,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.system_setting_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.system_setting_history_id_seq OWNED BY public.system_setting_history.id;
CREATE TABLE public.system_settings (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    value json NOT NULL,
    policy_source character varying(255),
    category character varying(50),
    version integer,
    updated_by_id integer,
    updated_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;
CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying,
    email character varying,
    password_hash character varying,
    role character varying,
    address character varying,
    barangay character varying,
    phone_number character varying,
    trust_score integer,
    verification_code character varying,
    is_verified boolean,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
CREATE TABLE public.work_order_approvals (
    id integer NOT NULL,
    work_order_id integer NOT NULL,
    approver_id integer NOT NULL,
    action character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.work_order_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.work_order_approvals_id_seq OWNED BY public.work_order_approvals.id;
CREATE TABLE public.work_order_blockers (
    id integer NOT NULL,
    work_order_id integer NOT NULL,
    reason_code character varying NOT NULL,
    delay_days double precision,
    notes text,
    blocked_by_id integer,
    is_resolved boolean,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolved_by_id integer,
    resolution_notes text
);
CREATE SEQUENCE public.work_order_blockers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.work_order_blockers_id_seq OWNED BY public.work_order_blockers.id;
CREATE TABLE public.work_order_inspections (
    id integer NOT NULL,
    work_order_id integer NOT NULL,
    inspector_id integer NOT NULL,
    inspection_date timestamp with time zone DEFAULT now(),
    checklist_results json,
    passed boolean NOT NULL,
    notes text,
    evidence_photo_url character varying,
    created_at timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE public.work_order_inspections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.work_order_inspections_id_seq OWNED BY public.work_order_inspections.id;
CREATE TABLE public.work_order_updates (
    id integer NOT NULL,
    work_order_id integer NOT NULL,
    user_id integer NOT NULL,
    previous_status character varying,
    new_status character varying,
    comment text,
    image_url character varying,
    created_at timestamp with time zone DEFAULT now(),
    official_id integer
);
CREATE SEQUENCE public.work_order_updates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.work_order_updates_id_seq OWNED BY public.work_order_updates.id;
CREATE TABLE public.work_orders (
    id integer NOT NULL,
    wo_number character varying,
    report_id integer,
    project_id integer,
    asset_id character varying,
    assigned_by_id integer,
    assigned_to_id integer,
    title character varying,
    description text,
    wo_type character varying,
    status character varying,
    priority character varying,
    priority_score double precision,
    is_emergency_assignment boolean,
    assignment_type character varying,
    district_id integer,
    scheduled_date timestamp with time zone,
    completed_date timestamp with time zone,
    category character varying,
    estimated_cost double precision,
    actual_cost double precision,
    ai_plan_summary text,
    notes text,
    citizen_feedback character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    barangay_id integer,
    CONSTRAINT ck_wo_priority CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT ck_wo_status CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'assigned'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);
CREATE SEQUENCE public.work_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.work_orders_id_seq OWNED BY public.work_orders.id;
ALTER TABLE ONLY public.advisories ALTER COLUMN id SET DEFAULT nextval('public.advisories_id_seq'::regclass);
ALTER TABLE ONLY public.agent_locations ALTER COLUMN id SET DEFAULT nextval('public.agent_locations_id_seq'::regclass);
ALTER TABLE ONLY public.announcement_corrections ALTER COLUMN id SET DEFAULT nextval('public.announcement_corrections_id_seq'::regclass);
ALTER TABLE ONLY public.announcement_deliveries ALTER COLUMN id SET DEFAULT nextval('public.announcement_deliveries_id_seq'::regclass);
ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);
ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);
ALTER TABLE ONLY public.barangays ALTER COLUMN id SET DEFAULT nextval('public.barangays_id_seq'::regclass);
ALTER TABLE ONLY public.boq_items ALTER COLUMN id SET DEFAULT nextval('public.boq_items_id_seq'::regclass);
ALTER TABLE ONLY public.chat_conversations ALTER COLUMN id SET DEFAULT nextval('public.chat_conversations_id_seq'::regclass);
ALTER TABLE ONLY public.chat_messages ALTER COLUMN id SET DEFAULT nextval('public.chat_messages_id_seq'::regclass);
ALTER TABLE ONLY public.city_boundaries ALTER COLUMN id SET DEFAULT nextval('public.city_boundaries_id_seq'::regclass);
ALTER TABLE ONLY public.command_receipts ALTER COLUMN id SET DEFAULT nextval('public.command_receipts_id_seq'::regclass);
ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);
ALTER TABLE ONLY public.environmental_context ALTER COLUMN id SET DEFAULT nextval('public.environmental_context_id_seq'::regclass);
ALTER TABLE ONLY public.news_items ALTER COLUMN id SET DEFAULT nextval('public.news_items_id_seq'::regclass);
ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);
ALTER TABLE ONLY public.obo_inspections ALTER COLUMN id SET DEFAULT nextval('public.obo_inspections_id_seq'::regclass);
ALTER TABLE ONLY public.officials ALTER COLUMN id SET DEFAULT nextval('public.officials_id_seq'::regclass);
ALTER TABLE ONLY public.outbox_events ALTER COLUMN id SET DEFAULT nextval('public.outbox_events_id_seq'::regclass);
ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);
ALTER TABLE ONLY public.process_timelines ALTER COLUMN id SET DEFAULT nextval('public.process_timelines_id_seq'::regclass);
ALTER TABLE ONLY public.procurement_requests ALTER COLUMN id SET DEFAULT nextval('public.procurement_requests_id_seq'::regclass);
ALTER TABLE ONLY public.project_requests ALTER COLUMN id SET DEFAULT nextval('public.project_requests_id_seq'::regclass);
ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);
ALTER TABLE ONLY public.residents ALTER COLUMN id SET DEFAULT nextval('public.residents_id_seq'::regclass);
ALTER TABLE ONLY public.system_documents ALTER COLUMN id SET DEFAULT nextval('public.system_documents_id_seq'::regclass);
ALTER TABLE ONLY public.system_roles ALTER COLUMN id SET DEFAULT nextval('public.system_roles_id_seq'::regclass);
ALTER TABLE ONLY public.system_setting_history ALTER COLUMN id SET DEFAULT nextval('public.system_setting_history_id_seq'::regclass);
ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.work_order_approvals ALTER COLUMN id SET DEFAULT nextval('public.work_order_approvals_id_seq'::regclass);
ALTER TABLE ONLY public.work_order_blockers ALTER COLUMN id SET DEFAULT nextval('public.work_order_blockers_id_seq'::regclass);
ALTER TABLE ONLY public.work_order_inspections ALTER COLUMN id SET DEFAULT nextval('public.work_order_inspections_id_seq'::regclass);
ALTER TABLE ONLY public.work_order_updates ALTER COLUMN id SET DEFAULT nextval('public.work_order_updates_id_seq'::regclass);
ALTER TABLE ONLY public.work_orders ALTER COLUMN id SET DEFAULT nextval('public.work_orders_id_seq'::regclass);
ALTER TABLE ONLY public.advisories
    ADD CONSTRAINT advisories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.agent_locations
    ADD CONSTRAINT agent_locations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);
ALTER TABLE ONLY public.announcement_corrections
    ADD CONSTRAINT announcement_corrections_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.announcement_deliveries
    ADD CONSTRAINT announcement_deliveries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_name_key UNIQUE (name);
ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.boq_items
    ADD CONSTRAINT boq_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.city_boundaries
    ADD CONSTRAINT city_boundaries_name_key UNIQUE (name);
ALTER TABLE ONLY public.city_boundaries
    ADD CONSTRAINT city_boundaries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.command_receipts
    ADD CONSTRAINT command_receipts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_code_key UNIQUE (code);
ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_name_key UNIQUE (name);
ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.environmental_context
    ADD CONSTRAINT environmental_context_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.infrastructure_assets
    ADD CONSTRAINT infrastructure_assets_pkey PRIMARY KEY (asset_id);
ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_pkey PRIMARY KEY (log_id);
ALTER TABLE ONLY public.news_items
    ADD CONSTRAINT news_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.obo_inspections
    ADD CONSTRAINT obo_inspections_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.officials
    ADD CONSTRAINT officials_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_event_key_key UNIQUE (event_key);
ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.process_timelines
    ADD CONSTRAINT process_timelines_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT project_requests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.residents
    ADD CONSTRAINT residents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_documents
    ADD CONSTRAINT system_documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_roles
    ADD CONSTRAINT system_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_setting_history
    ADD CONSTRAINT system_setting_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.command_receipts
    ADD CONSTRAINT uq_command_receipt_actor_operation_report_key UNIQUE (actor_id, operation, report_id, idempotency_key);
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT uq_notifications_outbox_event UNIQUE (outbox_event_id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.work_order_approvals
    ADD CONSTRAINT work_order_approvals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.work_order_blockers
    ADD CONSTRAINT work_order_blockers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.work_order_inspections
    ADD CONSTRAINT work_order_inspections_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.work_order_updates
    ADD CONSTRAINT work_order_updates_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);
CREATE INDEX idx_advisories_author_id ON public.advisories USING btree (author_id);
CREATE INDEX idx_brgy_district_id ON public.barangays USING btree (district_id);
CREATE INDEX idx_ec_barangay_id ON public.environmental_context USING btree (barangay_id);
CREATE INDEX idx_ia_barangay_id ON public.infrastructure_assets USING btree (barangay_id);
CREATE INDEX idx_obo_barangay_id ON public.obo_inspections USING btree (barangay_id);
CREATE INDEX idx_proj_barangay_id ON public.project_requests USING btree (barangay_id);
CREATE INDEX idx_reports_status ON public.reports USING btree (status);
CREATE INDEX idx_reports_updated_at ON public.reports USING btree (updated_at DESC);
CREATE INDEX idx_wo_district_id ON public.work_orders USING btree (district_id);
CREATE UNIQUE INDEX ix_advisories_advisory_id ON public.advisories USING btree (advisory_id);
CREATE INDEX ix_advisories_id ON public.advisories USING btree (id);
CREATE INDEX ix_agent_locations_agent_id ON public.agent_locations USING btree (agent_id);
CREATE INDEX ix_agent_locations_id ON public.agent_locations USING btree (id);
CREATE INDEX ix_agent_locations_location ON public.agent_locations USING gist (location);
CREATE INDEX ix_agent_locations_location_geog ON public.agent_locations USING gist (location_geog);
CREATE INDEX ix_announcement_corrections_announcement_id ON public.announcement_corrections USING btree (announcement_id);
CREATE INDEX ix_announcement_corrections_created_at ON public.announcement_corrections USING btree (created_at);
CREATE INDEX ix_announcement_corrections_editor_id ON public.announcement_corrections USING btree (editor_id);
CREATE INDEX ix_announcement_corrections_id ON public.announcement_corrections USING btree (id);
CREATE INDEX ix_announcement_deliveries_announcement_id ON public.announcement_deliveries USING btree (announcement_id);
CREATE INDEX ix_announcement_deliveries_channel ON public.announcement_deliveries USING btree (channel);
CREATE INDEX ix_announcement_deliveries_id ON public.announcement_deliveries USING btree (id);
CREATE INDEX ix_announcement_deliveries_status ON public.announcement_deliveries USING btree (status);
CREATE UNIQUE INDEX ix_announcements_announcement_id ON public.announcements USING btree (announcement_id);
CREATE INDEX ix_announcements_approved_by_id ON public.announcements USING btree (approved_by_id);
CREATE INDEX ix_announcements_author_id ON public.announcements USING btree (author_id);
CREATE INDEX ix_announcements_barangay_id ON public.announcements USING btree (barangay_id);
CREATE INDEX ix_announcements_category ON public.announcements USING btree (category);
CREATE INDEX ix_announcements_district_id ON public.announcements USING btree (district_id);
CREATE INDEX ix_announcements_expires_at ON public.announcements USING btree (expires_at);
CREATE INDEX ix_announcements_id ON public.announcements USING btree (id);
CREATE INDEX ix_announcements_priority ON public.announcements USING btree (priority);
CREATE INDEX ix_announcements_published_at ON public.announcements USING btree (published_at);
CREATE INDEX ix_announcements_scheduled_at ON public.announcements USING btree (scheduled_at);
CREATE INDEX ix_announcements_source_asset_id ON public.announcements USING btree (source_asset_id);
CREATE INDEX ix_announcements_source_project_id ON public.announcements USING btree (source_project_id);
CREATE INDEX ix_announcements_source_report_id ON public.announcements USING btree (source_report_id);
CREATE INDEX ix_announcements_source_work_order_id ON public.announcements USING btree (source_work_order_id);
CREATE INDEX ix_announcements_status ON public.announcements USING btree (status);
CREATE INDEX ix_announcements_target_audience ON public.announcements USING btree (target_audience);
CREATE INDEX ix_announcements_title_en ON public.announcements USING btree (title_en);
CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);
CREATE INDEX ix_audit_logs_trigger_type ON public.audit_logs USING btree (trigger_type);
CREATE INDEX ix_barangays_geom ON public.barangays USING gist (geom);
CREATE INDEX ix_boq_items_id ON public.boq_items USING btree (id);
CREATE INDEX ix_chat_conversations_id ON public.chat_conversations USING btree (id);
CREATE INDEX ix_chat_conversations_user_id ON public.chat_conversations USING btree (user_id);
CREATE INDEX ix_chat_messages_conversation_id ON public.chat_messages USING btree (conversation_id);
CREATE INDEX ix_chat_messages_id ON public.chat_messages USING btree (id);
CREATE INDEX ix_city_boundaries_geom ON public.city_boundaries USING gist (geom);
CREATE UNIQUE INDEX ix_environmental_context_barangay_id ON public.environmental_context USING btree (barangay_id);
CREATE INDEX ix_environmental_context_id ON public.environmental_context USING btree (id);
CREATE INDEX ix_infrastructure_assets_asset_id ON public.infrastructure_assets USING btree (asset_id);
CREATE INDEX ix_infrastructure_assets_asset_name ON public.infrastructure_assets USING btree (asset_name);
CREATE INDEX ix_infrastructure_assets_geom ON public.infrastructure_assets USING gist (geom);
CREATE INDEX ix_maintenance_history_log_id ON public.maintenance_history USING btree (log_id);
CREATE INDEX ix_news_items_category ON public.news_items USING btree (category);
CREATE INDEX ix_news_items_id ON public.news_items USING btree (id);
CREATE INDEX ix_news_items_priority ON public.news_items USING btree (priority);
CREATE INDEX ix_news_items_published_at ON public.news_items USING btree (published_at);
CREATE INDEX ix_notifications_id ON public.notifications USING btree (id);
CREATE INDEX ix_obo_inspections_barangay ON public.obo_inspections USING btree (barangay);
CREATE INDEX ix_obo_inspections_id ON public.obo_inspections USING btree (id);
CREATE INDEX ix_obo_inspections_inspection_type ON public.obo_inspections USING btree (inspection_type);
CREATE UNIQUE INDEX ix_obo_inspections_obo_number ON public.obo_inspections USING btree (obo_number);
CREATE INDEX ix_obo_inspections_status ON public.obo_inspections USING btree (status);
CREATE UNIQUE INDEX ix_officials_email ON public.officials USING btree (email);
CREATE INDEX ix_officials_full_name ON public.officials USING btree (full_name);
CREATE INDEX ix_officials_id ON public.officials USING btree (id);
CREATE INDEX ix_officials_role_id ON public.officials USING btree (role_id);
CREATE INDEX ix_outbox_events_status ON public.outbox_events USING btree (status);
CREATE INDEX ix_password_reset_tokens_email ON public.password_reset_tokens USING btree (email);
CREATE INDEX ix_password_reset_tokens_id ON public.password_reset_tokens USING btree (id);
CREATE UNIQUE INDEX ix_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);
CREATE INDEX ix_process_timelines_id ON public.process_timelines USING btree (id);
CREATE INDEX ix_process_timelines_is_public ON public.process_timelines USING btree (is_public);
CREATE INDEX ix_process_timelines_status ON public.process_timelines USING btree (status);
CREATE INDEX ix_procurement_requests_id ON public.procurement_requests USING btree (id);
CREATE UNIQUE INDEX ix_procurement_requests_pr_number ON public.procurement_requests USING btree (pr_number);
CREATE INDEX ix_procurement_requests_status ON public.procurement_requests USING btree (status);
CREATE INDEX ix_project_requests_category ON public.project_requests USING btree (category);
CREATE INDEX ix_project_requests_current_phase ON public.project_requests USING btree (current_phase);
CREATE INDEX ix_project_requests_id ON public.project_requests USING btree (id);
CREATE INDEX ix_project_requests_is_emergency ON public.project_requests USING btree (is_emergency);
CREATE INDEX ix_project_requests_procurement_modality ON public.project_requests USING btree (procurement_modality);
CREATE UNIQUE INDEX ix_project_requests_proj_number ON public.project_requests USING btree (proj_number);
CREATE INDEX ix_project_requests_status ON public.project_requests USING btree (status);
CREATE INDEX ix_reports_ai_category ON public.reports USING btree (ai_category);
CREATE INDEX ix_reports_ai_urgency ON public.reports USING btree (ai_urgency);
CREATE INDEX ix_reports_category ON public.reports USING btree (category);
CREATE INDEX ix_reports_claimed_by_user_id ON public.reports USING btree (claimed_by_user_id);
CREATE INDEX ix_reports_contact_email ON public.reports USING btree (contact_email);
CREATE INDEX ix_reports_id ON public.reports USING btree (id);
CREATE INDEX ix_reports_location ON public.reports USING gist (location);
CREATE INDEX ix_reports_location_barangay ON public.reports USING btree (location_barangay);
CREATE INDEX ix_reports_location_geog ON public.reports USING gist (location_geog);
CREATE INDEX ix_reports_reporter_type ON public.reports USING btree (reporter_type);
CREATE INDEX ix_reports_resident_id ON public.reports USING btree (resident_id);
CREATE INDEX ix_reports_status ON public.reports USING btree (status);
CREATE UNIQUE INDEX ix_reports_ticket_id ON public.reports USING btree (ticket_id);
CREATE INDEX ix_reports_tracking_token_hash ON public.reports USING btree (tracking_token_hash);
CREATE INDEX ix_residents_barangay_id ON public.residents USING btree (barangay_id);
CREATE INDEX ix_residents_district_id ON public.residents USING btree (district_id);
CREATE UNIQUE INDEX ix_residents_email ON public.residents USING btree (email);
CREATE INDEX ix_residents_full_name ON public.residents USING btree (full_name);
CREATE INDEX ix_residents_id ON public.residents USING btree (id);
CREATE INDEX ix_system_documents_category ON public.system_documents USING btree (category);
CREATE INDEX ix_system_documents_confidentiality ON public.system_documents USING btree (confidentiality);
CREATE INDEX ix_system_documents_document_type ON public.system_documents USING btree (document_type);
CREATE INDEX ix_system_documents_id ON public.system_documents USING btree (id);
CREATE INDEX ix_system_documents_legal_hold ON public.system_documents USING btree (legal_hold);
CREATE INDEX ix_system_documents_sha256_hash ON public.system_documents USING btree (sha256_hash);
CREATE INDEX ix_system_documents_target_id ON public.system_documents USING btree (target_id);
CREATE INDEX ix_system_documents_target_model ON public.system_documents USING btree (target_model);
CREATE INDEX ix_system_roles_id ON public.system_roles USING btree (id);
CREATE UNIQUE INDEX ix_system_roles_name ON public.system_roles USING btree (name);
CREATE INDEX ix_system_setting_history_id ON public.system_setting_history USING btree (id);
CREATE INDEX ix_system_setting_history_setting_id ON public.system_setting_history USING btree (setting_id);
CREATE INDEX ix_system_settings_id ON public.system_settings USING btree (id);
CREATE UNIQUE INDEX ix_system_settings_key ON public.system_settings USING btree (key);
CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);
CREATE INDEX ix_users_full_name ON public.users USING btree (full_name);
CREATE INDEX ix_users_id ON public.users USING btree (id);
CREATE INDEX ix_work_order_approvals_id ON public.work_order_approvals USING btree (id);
CREATE INDEX ix_work_order_blockers_id ON public.work_order_blockers USING btree (id);
CREATE INDEX ix_work_order_blockers_is_resolved ON public.work_order_blockers USING btree (is_resolved);
CREATE INDEX ix_work_order_blockers_reason_code ON public.work_order_blockers USING btree (reason_code);
CREATE INDEX ix_work_order_blockers_work_order_id ON public.work_order_blockers USING btree (work_order_id);
CREATE INDEX ix_work_order_inspections_id ON public.work_order_inspections USING btree (id);
CREATE INDEX ix_work_order_inspections_inspector_id ON public.work_order_inspections USING btree (inspector_id);
CREATE INDEX ix_work_order_inspections_work_order_id ON public.work_order_inspections USING btree (work_order_id);
CREATE INDEX ix_work_order_updates_id ON public.work_order_updates USING btree (id);
CREATE INDEX ix_work_orders_category ON public.work_orders USING btree (category);
CREATE INDEX ix_work_orders_citizen_feedback ON public.work_orders USING btree (citizen_feedback);
CREATE INDEX ix_work_orders_district_id ON public.work_orders USING btree (district_id);
CREATE INDEX ix_work_orders_id ON public.work_orders USING btree (id);
CREATE INDEX ix_work_orders_priority ON public.work_orders USING btree (priority);
CREATE INDEX ix_work_orders_status ON public.work_orders USING btree (status);
CREATE UNIQUE INDEX ix_work_orders_wo_number ON public.work_orders USING btree (wo_number);
CREATE INDEX ix_work_orders_wo_type ON public.work_orders USING btree (wo_type);
ALTER TABLE ONLY public.advisories
    ADD CONSTRAINT advisories_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.agent_locations
    ADD CONSTRAINT agent_locations_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.announcement_corrections
    ADD CONSTRAINT announcement_corrections_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id);
ALTER TABLE ONLY public.announcement_corrections
    ADD CONSTRAINT announcement_corrections_editor_id_fkey FOREIGN KEY (editor_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.announcement_deliveries
    ADD CONSTRAINT announcement_deliveries_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_approved_by_id_fkey FOREIGN KEY (approved_by_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_source_asset_id_fkey FOREIGN KEY (source_asset_id) REFERENCES public.infrastructure_assets(asset_id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_source_project_id_fkey FOREIGN KEY (source_project_id) REFERENCES public.project_requests(id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_source_report_id_fkey FOREIGN KEY (source_report_id) REFERENCES public.reports(id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_source_work_order_id_fkey FOREIGN KEY (source_work_order_id) REFERENCES public.work_orders(id);
ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_withdrawn_by_id_fkey FOREIGN KEY (withdrawn_by_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_procurement_id_fkey FOREIGN KEY (procurement_id) REFERENCES public.procurement_requests(id);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project_requests(id);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id);
ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.boq_items
    ADD CONSTRAINT boq_items_procurement_request_id_fkey FOREIGN KEY (procurement_request_id) REFERENCES public.procurement_requests(id);
ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.residents(id);
ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.command_receipts
    ADD CONSTRAINT command_receipts_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.command_receipts
    ADD CONSTRAINT command_receipts_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_al_procurement_id FOREIGN KEY (procurement_id) REFERENCES public.procurement_requests(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_al_project_id FOREIGN KEY (project_id) REFERENCES public.project_requests(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_al_report_id FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_al_work_order_id FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.boq_items
    ADD CONSTRAINT fk_boq_procurement_request_id FOREIGN KEY (procurement_request_id) REFERENCES public.procurement_requests(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT fk_brgy_district_id FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.environmental_context
    ADD CONSTRAINT fk_ec_barangay_id FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.infrastructure_assets
    ADD CONSTRAINT fk_ia_barangay_id FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT fk_mh_asset_id FOREIGN KEY (asset_id) REFERENCES public.infrastructure_assets(asset_id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_outbox_event FOREIGN KEY (outbox_event_id) REFERENCES public.outbox_events(id);
ALTER TABLE ONLY public.obo_inspections
    ADD CONSTRAINT fk_obo_barangay_id FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.obo_inspections
    ADD CONSTRAINT fk_obo_engineering_clearance_id FOREIGN KEY (engineering_clearance_id) REFERENCES public.project_requests(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.obo_inspections
    ADD CONSTRAINT fk_obo_source_report_id FOREIGN KEY (source_report_id) REFERENCES public.reports(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT fk_pr_project_id FOREIGN KEY (project_id) REFERENCES public.project_requests(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT fk_pr_work_order_id FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT fk_proj_asset_id FOREIGN KEY (asset_id) REFERENCES public.infrastructure_assets(asset_id) ON DELETE SET NULL;
ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT fk_proj_barangay_id FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.process_timelines
    ADD CONSTRAINT fk_pt_project_id FOREIGN KEY (project_id) REFERENCES public.project_requests(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.process_timelines
    ADD CONSTRAINT fk_pt_report_id FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.process_timelines
    ADD CONSTRAINT fk_pt_work_order_id FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT fk_wo_asset_id FOREIGN KEY (asset_id) REFERENCES public.infrastructure_assets(asset_id) ON DELETE SET NULL;
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT fk_wo_district_id FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT fk_wo_project_id FOREIGN KEY (project_id) REFERENCES public.project_requests(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT fk_wo_report_id FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.work_order_approvals
    ADD CONSTRAINT fk_woa_work_order_id FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_order_updates
    ADD CONSTRAINT fk_wou_work_order_id FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.maintenance_history
    ADD CONSTRAINT maintenance_history_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.infrastructure_assets(asset_id);
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_official_id_fkey FOREIGN KEY (official_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.obo_inspections
    ADD CONSTRAINT obo_inspections_assigned_inspector_id_fkey FOREIGN KEY (assigned_inspector_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.obo_inspections
    ADD CONSTRAINT obo_inspections_cleared_by_id_fkey FOREIGN KEY (cleared_by_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.obo_inspections
    ADD CONSTRAINT obo_inspections_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);
ALTER TABLE ONLY public.obo_inspections
    ADD CONSTRAINT obo_inspections_engineering_clearance_id_fkey FOREIGN KEY (engineering_clearance_id) REFERENCES public.project_requests(id);
ALTER TABLE ONLY public.obo_inspections
    ADD CONSTRAINT obo_inspections_filed_by_id_fkey FOREIGN KEY (filed_by_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.obo_inspections
    ADD CONSTRAINT obo_inspections_source_report_id_fkey FOREIGN KEY (source_report_id) REFERENCES public.reports(id);
ALTER TABLE ONLY public.officials
    ADD CONSTRAINT officials_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.system_roles(id);
ALTER TABLE ONLY public.officials
    ADD CONSTRAINT officials_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES public.officials(id);
ALTER TABLE ONLY public.process_timelines
    ADD CONSTRAINT process_timelines_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.process_timelines
    ADD CONSTRAINT process_timelines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project_requests(id);
ALTER TABLE ONLY public.process_timelines
    ADD CONSTRAINT process_timelines_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id);
ALTER TABLE ONLY public.process_timelines
    ADD CONSTRAINT process_timelines_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id);
ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_approved_by_id_fkey FOREIGN KEY (approved_by_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project_requests(id);
ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_raised_by_id_fkey FOREIGN KEY (raised_by_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_validated_by_id_fkey FOREIGN KEY (validated_by_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id);
ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT project_requests_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.infrastructure_assets(asset_id);
ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT project_requests_certificate_issued_by_id_fkey FOREIGN KEY (certificate_issued_by_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT project_requests_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT project_requests_design_lead_id_fkey FOREIGN KEY (design_lead_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT project_requests_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);
ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT project_requests_project_engineer_id_fkey FOREIGN KEY (project_engineer_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_requests
    ADD CONSTRAINT project_requests_survey_engineer_id_fkey FOREIGN KEY (survey_engineer_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id);
ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_claimed_by_user_id_fkey FOREIGN KEY (claimed_by_user_id) REFERENCES public.residents(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.residents
    ADD CONSTRAINT residents_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id);
ALTER TABLE ONLY public.residents
    ADD CONSTRAINT residents_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);
ALTER TABLE ONLY public.system_documents
    ADD CONSTRAINT system_documents_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.system_setting_history
    ADD CONSTRAINT system_setting_history_changed_by_id_fkey FOREIGN KEY (changed_by_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.system_setting_history
    ADD CONSTRAINT system_setting_history_setting_id_fkey FOREIGN KEY (setting_id) REFERENCES public.system_settings(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.work_order_approvals
    ADD CONSTRAINT work_order_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_order_approvals
    ADD CONSTRAINT work_order_approvals_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id);
ALTER TABLE ONLY public.work_order_blockers
    ADD CONSTRAINT work_order_blockers_blocked_by_id_fkey FOREIGN KEY (blocked_by_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.work_order_blockers
    ADD CONSTRAINT work_order_blockers_resolved_by_id_fkey FOREIGN KEY (resolved_by_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.work_order_blockers
    ADD CONSTRAINT work_order_blockers_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_order_inspections
    ADD CONSTRAINT work_order_inspections_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.officials(id);
ALTER TABLE ONLY public.work_order_inspections
    ADD CONSTRAINT work_order_inspections_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_order_updates
    ADD CONSTRAINT work_order_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_order_updates
    ADD CONSTRAINT work_order_updates_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id);
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.infrastructure_assets(asset_id);
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_assigned_by_id_fkey FOREIGN KEY (assigned_by_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.officials(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangays(id);
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project_requests(id);
ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id);
