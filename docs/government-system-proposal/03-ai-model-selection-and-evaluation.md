# 03 — AI model selection and evaluation

**Status:** Proposed, not benchmarked or approved for production. **Version/date:** 1.0 / 18 September 2026. **Owners to nominate:** Technical lead, engineering reviewers, privacy owner and procurement owner.

## Recommendation

Use one primary provider behind a replaceable server-side adapter. Start with classification suggestions, record summaries and announcement drafting. Compare the existing Gemini integration with current Gemini candidates and an OpenAI challenger using the same local test set. Choose the least expensive configuration that meets agreed quality and privacy requirements; do not deploy every model below.

The inspected `backend/gemini_service.py` uses Gemini 2.5 Flash through a Google integration. Keep this as the implementation baseline, not an assumption that it is the newest or best production choice. Verify model availability in the actual deployed service, region and account before migration. A Gemini Developer API catalog entry does not establish equivalent Vertex availability or contractual terms.

## Researched shortlist

| Candidate | Proposed evaluation use | Selection condition |
|---|---|---|
| Gemini 3.8 Flash (`gemini-3.8-flash`) | Primary multimodal candidate for report text, photographs, document understanding and drafts | Beats or matches incumbent quality at acceptable cost and latency in the approved deployment |
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | Lower-cost routine extraction, categorization and short summaries | Meets task-specific quality gates without excessive review or escalation |
| GPT-5.6 Luna (`gpt-5.6-luna`) | Cost-sensitive challenger for extraction, bilingual drafts and image-assisted triage | Demonstrates local quality and suitable data handling; no presumed Filipino advantage |
| GPT-5.6 Terra (`gpt-5.6-terra`) | More demanding cross-document review and ambiguous cases | Measurable improvement justifies additional cost; still advisory |
| Claude Sonnet 5 (`claude-sonnet-5`) | Optional alternative for document synthesis and drafting | Evaluate only if initial candidates leave a material quality, contractual or reliability gap |

These are dated candidates, not permanent procurement specifications. Official capability references: [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), and [Claude Sonnet 5](https://platform.claude.com/docs/en/models/sonnet-5/overview). Multimodal and structured-output support do not establish factual correctness or engineering competence.

## Match the technology to the job

| Job | Recommended approach | Human boundary |
|---|---|---|
| Suggest category, extract location description, summarize report | Small/fast multimodal model with schema validation and source references | Intake confirms classification and jurisdiction |
| Describe visible damage | Multimodal model; record observations, image quality and uncertainty | Engineer assesses severity; no structural safety certification from photographs |
| Draft/translate a notice | Grounded generation from approved record fields | Reviewer checks dates, locations, promises and English/Filipino equivalence |
| Answer questions about procedures | Permission-filtered retrieval from versioned approved documents; PostgreSQL search first, optional pgvector later | Cite exact source/version; abstain when unsupported |
| Read scanned forms | Evaluate PaddleOCR before sending full documents to a cloud model | Staff verify critical numbers, signatures and identifiers; OCR is not authentication |
| Flag possible duplicates | Location/time/category rules plus text/image similarity if useful | Staff decide merge/link; preserve each original report |
| Forecast report demand | Statistical baselines and time-series models | Show evaluation, interval and data coverage; no LLM-generated numerical forecasts |
| Recommend maintenance | Transparent rules first; supervised risk model only after suitable outcome data | Engineer approves work priorities and inspection decisions |
| Plan visits | Constraint-based scheduling, later OR-Tools if justified | Dispatcher confirms access, crew skills, equipment and practical routes |

Specialist references: [PaddleOCR](https://www.paddleocr.ai/main/en/index.html), [pgvector](https://github.com/pgvector/pgvector), [time-aware validation](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html), and [OR-Tools routing](https://developers.google.com/optimization/routing).

Dedicated object detection is a later option if a repeated task warrants collecting labeled municipal imagery. Do not assume a general pretrained detector recognizes drainage defects or grades road damage. Evaluate licensing, class definitions, imagery rights, precision/recall and performance across lighting/weather before considering [Ultralytics models](https://docs.ultralytics.com/models/) or another detector. Review the [license](https://www.ultralytics.com/license) before distribution or service deployment.

## Evaluation plan

1. Assemble a consented or appropriately de-identified pilot set, initially about 200–300 examples as a planning target. Include English, Filipino, mixed language, sparse descriptions, poor images, both city sectors, ambiguous locations, scans and adversarial instructions. This is a starting sample, not statistical proof of citywide accuracy.
2. Have two relevant reviewers annotate critical subsets and resolve disagreements. Separate training/prompt examples from a locked test set. Group near-duplicate reports and images together to avoid leakage.
3. Compare the incumbent, candidate configurations and a manual/rules baseline on the same tasks. Record model identifier, provider endpoint, prompt version, decoding settings, date and input preparation.
4. Measure category precision/recall, critical-field accuracy, unsupported factual additions, useful abstention, bilingual meaning preservation, image-observation errors, review time, latency and cost per accepted result. Report slices and sample sizes, not only an overall score.
5. Proposed release gates: no unauthorized action or cross-scope disclosure in the security test suite; no fabricated dates/locations in accepted publishing outputs; schema-valid output after bounded recovery; operational quality thresholds signed by the service owner. A zero-observed-error test result is not a guarantee of zero real-world errors.
6. Run in shadow mode, then limited assistive use. Monitor corrections and drift. Re-evaluate model, prompt, retrieval and provider changes before promotion; preserve a rollback configuration.

For forecasts, reconstruct complete time buckets and separate true zero from missing collection. Use rolling historical cutoffs, seasonal-naive/last-period baselines, MAE and interval coverage. Report performance by category/geography where sample sizes permit. Asset failure prediction additionally needs inspection exposure, maintenance interventions and reliable failure outcomes; report volume alone is insufficient.

## Data and action controls

Authorization filters apply before retrieval and again before returning citations. Treat report text, files and retrieved passages as untrusted data, including instructions embedded in images. A model cannot assign itself permissions. Allowlisted tools may propose a command; the application enforces its permission, validation and approval requirements.

Keep provider credentials server-side. Minimize personal data, avoid raw resident messages in routine logs, and retain only approved evaluation/audit fields. Record generation provenance and reviewer changes without unnecessarily duplicating sensitive documents. Public-safe derivatives and original evidence have different access policies.

Confirm processing purpose, hosting/transfer arrangements, retention, subprocessors and provider-specific controls with the LGU privacy owner. Do not equate “not used for training” with “never retained.” Relevant references: [NPC AI and personal-data guidance](https://privacy.gov.ph/wp-content/uploads/2025/02/Advisory-2024.12.19-Guidelines-on-Artificial-Intelligence-w-SGD.pdf) and [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). These documents do not constitute a completed privacy assessment.

## Cost and fallback plan

Estimate monthly cost from measured input/output usage, image/document processing, retries, escalations, storage and reviewer time. Recheck provider pricing when purchasing; do not base a commitment on a catalog snapshot. Track cost per reviewed/accepted result, not only cost per API call.

Set per-task token limits, bounded retries, daily/monthly budgets and separate queues for interactive and batch work. If AI is unavailable, retain manual classification and approved templates. Do not silently send sensitive inputs to an unapproved fallback provider. A larger model is an evaluated escalation option, not a substitute for missing evidence.
