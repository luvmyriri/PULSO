# 08 — Research sources and decision register

**Status:** Research record and proposed decisions. **Version/date:** 1.0 / 18 September 2026. Revalidate model catalogs, service terms and API availability before procurement or implementation.

## Evidence limits

Research combines targeted repository inspection and public primary-source documentation. It is not a production audit, model benchmark, legal opinion or approved organizational design. Sources establish documented capabilities/context; recommendations and architecture are the author's proposed application of them.

The earlier [operating-model proposal](../ui-ux-audit/24-government-operating-model-and-automation-proposal-v1.0.md) contains detailed findings on the report panel, assets navigation, sample dashboard data, random predictive outputs, map scope and authorization helpers. This package adds targeted advisory/notification findings. Re-inspect current source before acting because code can change.

## Primary-source register

| Source | What it supports / limitation |
|---|---|
| [Caloocan CED](https://caloocancity.gov.ph/category/ced/) and [Citizen Charter landing page](https://caloocancity.gov.ph/ced-citizen-charter/) | Local engineering service context; embedded charter contents not fully accessible |
| [Quezon City Engineering Department](https://quezoncity.gov.ph/departments/quezon-city-engineering-department/) | Analogous functional responsibilities; not Caloocan's official structure |
| [QC Project Management Manual](https://quezoncity.gov.ph/wp-content/uploads/2020/09/QCDE-Project-Management-Manual.pdf) | Reference project responsibilities/stages; do not import older procurement rules or assume its proposed chart is approved |
| [RA 7160](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/53542) | Statutory engineering context; no automatic PULSO signing delegation inferred |
| [GPPB RA 12009 IRR announcement](https://www.gppb.gov.ph/exciting-announcement-issuance-and-publication-of-the-irr-for-the-new-government-procurement-act/) | Reason to verify current procurement policy rather than reuse old templates |
| [NPC AI guidance](https://privacy.gov.ph/wp-content/uploads/2025/02/Advisory-2024.12.19-Guidelines-on-Artificial-Intelligence-w-SGD.pdf) | Application of personal-data rules to AI processing; local assessment remains necessary |
| [OpenAI model catalog](https://developers.openai.com/api/docs/models) and dedicated pages in document 03 | Dated capability shortlist; no local accuracy claim |
| [Gemini model catalog](https://ai.google.dev/gemini-api/docs/models) and dedicated pages in document 03 | Developer API candidate capabilities; actual deployment availability must be checked |
| [Claude model overview](https://platform.claude.com/docs/en/models/overview) | Optional alternative candidate; no claim that all providers should be deployed |
| [Google HeatmapLayer](https://developers.google.com/maps/documentation/javascript/heatmaplayer) | Legacy map rendering retirement and replacement need |
| [Celery tasks](https://docs.celeryq.dev/en/stable/userguide/tasks.html) | Retry/idempotency considerations; outbox architecture is a proposal |
| [Temporal](https://docs.temporal.io/) and [n8n license](https://docs.n8n.io/sustainable-use-license/) | Optional orchestration evaluation and licensing review |
| [FCM web](https://firebase.google.com/docs/cloud-messaging/web/receive-messages) | Push integration mechanics; no read guarantee |
| [Twilio Philippines SMS](https://www.twilio.com/en-us/guidelines/ph/sms) | Provider-specific country constraints; not a blanket statement of all legal obligations |
| [Microsoft Graph](https://learn.microsoft.com/en-us/graph/overview) and [Google Calendar](https://developers.google.com/workspace/calendar/api/v3/reference) | Office-suite integration possibilities; tenant access is unconfirmed |
| [PAGASA data](https://www.pagasa.dost.gov.ph/climate/climate-data) and [HazardHunterPH](https://hazardhunter.georisk.gov.ph/map) | Authoritative context; no unrestricted warning/layer API assumed |

Specialist AI/search/forecast references are linked beside their recommendations in document 03. Access to Meta's official Pages-posting documentation failed during research; Facebook publishing remains an access- and documentation-dependent candidate. The QC asset management manual was too large for the web reader and is not treated as fully inspected evidence.

## Decisions requiring owners

| ID | Decision | Proposed default | Owner / release dependency |
|---|---|---|---|
| D01 | Official role/delegation mapping | Functional permission bundles with recorded scope | City Engineer/LGU authority; before permissions implementation |
| D02 | Case/work/report states and closure | Separate entities; inspected acceptance before applicable closure | Engineering product owner; before lifecycle implementation |
| D03 | Service clocks and escalation | Configurable approved calendar/pause rules; no invented SLA | Service/legal owner; before due-time claims |
| D04 | Public publishing delegation | Draft/technical review/release approval separated | LGU communications authority; before public publishing |
| D05 | Emergency workflow | Existing authorized channels/procedures, confirmed locally | Emergency/communications owner; before emergency features |
| D06 | North/South boundaries and resident eligibility | Government full-city views; resident policy separately approved | GIS/service owner; before geography rollout |
| D07 | Asset scope and condition rubric | Physical infrastructure with dated inspections | Asset/engineering custodian; before import/condition claims |
| D08 | Personal-data handling and retention | Minimum necessary fields and approved providers | Privacy/records owners; before external AI and channel data |
| D09 | AI provider/model | Benchmark incumbent/current candidates; one primary initially | Technical/procurement/privacy owners; before production calls |
| D10 | Channels and office suite | Web/in-app first, actual approved email, others gated | Communications/IT owners; before connector activation |
| D11 | Metric definitions | Shared catalog with history-based counts and coverage | Operational/data owner; before dashboard acceptance |
| D12 | Pilot scope/resources/budget | Limited workflow pilot; advanced prediction later | Sponsor/delivery owner; before schedule commitment |
| D13 | Hosting, recovery and operations | Match approved environment and support capacity | IT/security owner; before deployment |
| D14 | Visual/Figma reconciliation | Follow Civic Aperture; inspect current shared file | Product/design owner; before material visual decisions |

## Conflicts and migration cautions

- User-requested full-city government mapping and PRODUCT.md's North-focused resident audience are separate scope statements; do not resolve by silently expanding eligibility.
- Existing Assets navigation groups projects and other processes; the proposed asset register is a deliberate information-architecture change.
- Current advisory APIs permit direct creation/deletion in inspected paths; proposed governance adds review, versioning, scheduling and retention-aware withdrawal. Existing behavior is not an approval policy.
- Some notification and project views substitute samples; operational truth requires explicit demo, empty and failure states.
- Existing AI/analytics code is not evidence of validated prediction or authorized automatic decisions.
- Earlier Figma metadata inspection did not establish all documented templates/bindings. Inspect the live file during design; do not claim they were deleted or completed.

## Handoff status

This package contains all eight planned topic documents and its index. It is ready for proposal review and bounded follow-up assignments, **not approved for production implementation**. Remaining work is decision validation, detailed design/contracts, local model evaluation and explicitly authorized implementation. No actual integration credentials, model benchmarks, deployment or publication are included.
