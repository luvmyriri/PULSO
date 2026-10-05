"""Regression checks for government release-blocking access and records paths."""

import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import auth
import analytics_router
import document_router
import gov_crud
import gov_schemas
import gov_router
import main
import models


class _Query:
    def __init__(self, result):
        self.result = result

    def filter(self, *_args):
        return self

    def with_for_update(self):
        return self

    def first(self):
        return self.result


class _UsersDB:
    def __init__(self, official=None, resident=None):
        self.official = official
        self.resident = resident
        self.commits = 0

    def query(self, model):
        return _Query(self.official if model is models.Official else self.resident)

    def commit(self):
        self.commits += 1

    def refresh(self, _obj):
        pass


def _token(email):
    return auth.create_access_token({"sub": email})


@pytest.mark.parametrize("active,suspended", [(False, False), (True, True)])
def test_inactive_or_suspended_official_token_is_denied(active, suspended):
    official = models.Official(email="official@example.test", role="dispatcher", is_active=active, is_suspended=suspended)
    with pytest.raises(HTTPException) as error:
        auth.get_current_user(token=_token(official.email), db=_UsersDB(official=official))
    assert error.value.status_code == 403


def test_inactive_resident_token_is_denied_even_when_verified():
    resident = models.Resident(email="resident@example.test", is_verified=True, is_active=False)
    with pytest.raises(HTTPException) as error:
        auth.get_current_user(token=_token(resident.email), db=_UsersDB(resident=resident))
    assert error.value.status_code == 403


def test_government_role_guard_does_not_grant_every_official_access():
    dispatcher = models.Official(role="dispatcher")
    gov_router._assert_role(dispatcher, "dispatcher")
    with pytest.raises(HTTPException) as error:
        gov_router._assert_role(dispatcher, "city_engineer", "manager")
    assert error.value.status_code == 403
    with pytest.raises(HTTPException):
        gov_router._assert_role(models.Resident(), *gov_router.GOV_ROLES)


def test_analytics_checks_requested_action_and_escapes_csv(monkeypatch):
    monkeypatch.setattr(analytics_router.roles_service, "has_permission", lambda *_args: False)
    clerk = models.Official(role="admin_clerk")
    analytics_router._assert_permission(clerk, None, "analytics", "view")
    for module, action in (("reports", "detail"), ("analytics", "export"), ("procurement", "manage")):
        with pytest.raises(HTTPException) as error:
            analytics_router._assert_permission(clerk, None, module, action)
        assert error.value.status_code == 403
    with pytest.raises(HTTPException):
        analytics_router._assert_permission(models.Resident(), None, "analytics", "view")
    assert analytics_router._safe_csv_cell(" =HYPERLINK(\"http://bad\")") == "' =HYPERLINK(\"http://bad\")"


def test_status_and_role_paths_have_distinct_handlers():
    paths = {route.path: route.endpoint for route in gov_router.router.routes if route.path.startswith("/api/gov/users/{user_id}/")}
    assert paths["/api/gov/users/{user_id}/status"] is gov_router.update_user_status
    assert paths["/api/gov/users/{user_id}/role"] is gov_router.update_user_role


def test_user_status_change_commits_once_with_audit(monkeypatch):
    actor = models.Official(id=10, role="system_admin", email="admin@example.test")
    target = models.Resident(id=11, email="resident@example.test", is_active=True)
    db = _UsersDB(resident=target)
    audits = []
    monkeypatch.setattr(gov_router.gov_crud, "_append_audit", lambda *_args, **kwargs: audits.append(kwargs))
    result = gov_router.update_user_status(
        user_id=11,
        payload=gov_router.UserStatusPayload(action="deactivate", reason="Account review"),
        db=db,
        current_user=actor,
    )
    assert not target.is_active
    assert db.commits == 1
    assert len(audits) == 1
    assert "deactivated" in result["message"]


def test_document_registry_requires_staff_and_records_capability(monkeypatch):
    with pytest.raises(HTTPException) as error:
        document_router._require_records_view(_UsersDB(), models.Resident())
    assert error.value.status_code == 403

    def deny(*_args):
        raise HTTPException(status_code=403, detail="denied")

    monkeypatch.setattr(document_router.roles_service, "assert_permission", deny)
    with pytest.raises(HTTPException) as error:
        document_router._require_records_view(_UsersDB(), models.Official(role="staff"))
    assert error.value.status_code == 403


def test_delete_paths_do_not_remove_civic_history(monkeypatch):
    actor = models.Official(role="dispatcher")
    with pytest.raises(HTTPException) as report_error:
        main.delete_report(report_id=1, db=SimpleNamespace(), current_user=actor)
    assert report_error.value.status_code == 409

    monkeypatch.setattr(document_router.roles_service, "assert_permission", lambda *_args: None)
    with pytest.raises(HTTPException) as document_error:
        document_router.delete_document(document_id=1, db=SimpleNamespace(), current_user=actor)
    assert document_error.value.status_code == 409


def test_legacy_work_order_and_dispatch_paths_cannot_skip_governed_assignment():
    actor = models.Official(id=7, role="dispatcher")
    with pytest.raises(HTTPException) as create_error:
        main.create_new_work_order(
            wo=SimpleNamespace(), db=SimpleNamespace(), current_user=actor,
        )
    assert create_error.value.status_code == 410

    with pytest.raises(HTTPException) as dispatch_error:
        main.dispatch_report(report_id=1, db=SimpleNamespace(), current_user=actor)
    assert dispatch_error.value.status_code == 409


def test_rejection_requires_reason_and_eligible_intake_state(monkeypatch):
    actor = models.Official(id=7, role="dispatcher")
    monkeypatch.setattr(main.crud, "get_report", lambda *_args, **_kwargs: SimpleNamespace(status="approved_internal"))
    with pytest.raises(HTTPException) as approved_error:
        main.reject_report(
            report_id=1, decision=main.ReportRejectionDecision(reason="Evidence does not match this location"),
            db=SimpleNamespace(), current_user=actor,
        )
    assert approved_error.value.status_code == 409

    monkeypatch.setattr(main.crud, "get_report", lambda *_args, **_kwargs: SimpleNamespace(status="pending"))
    with pytest.raises(HTTPException) as reason_error:
        main.reject_report(
            report_id=1, decision=main.ReportRejectionDecision(reason="short"),
            db=SimpleNamespace(), current_user=actor,
        )
    assert reason_error.value.status_code == 422


def test_report_and_internal_timeline_reads_reject_unscoped_official(monkeypatch):
    monkeypatch.setattr(main.crud, "get_report", lambda *_args, **_kwargs: SimpleNamespace(id=4, resident_id=9, claimed_by_user_id=None))
    actor = models.Official(id=12, role="records_officer")
    with pytest.raises(HTTPException) as report_error:
        main.read_report(report_id=4, db=SimpleNamespace(), current_user=actor)
    assert report_error.value.status_code == 403
    with pytest.raises(HTTPException) as timeline_error:
        main.read_report_timeline(report_id=4, db=SimpleNamespace(), current_user=actor)
    assert timeline_error.value.status_code == 403


def test_public_static_mount_does_not_serve_documents():
    files = main.PublicUploadFiles(directory="uploads")
    with pytest.raises(HTTPException) as error:
        asyncio.run(files.get_response("docs/secret.pdf", {}))
    assert error.value.status_code == 404


def test_work_order_cannot_skip_directly_to_completion():
    wo = SimpleNamespace(id=12, status="in_progress", assigned_to_id=7)
    with pytest.raises(HTTPException) as error:
        gov_crud._validate_work_order_transition(None, wo, "completed")
    assert error.value.status_code == 409


def test_work_order_assignment_requires_an_assignee():
    wo = SimpleNamespace(id=12, status="open", assigned_to_id=None)
    with pytest.raises(HTTPException) as error:
        gov_crud._validate_work_order_transition(None, wo, "assigned")
    assert error.value.status_code == 409


def test_completion_review_requires_proof():
    wo = SimpleNamespace(id=12, status="in_progress", assigned_to_id=7)
    with pytest.raises(HTTPException) as error:
        gov_crud._validate_work_order_transition(_UsersDB(), wo, "completed_pending_review")
    assert error.value.status_code == 409


def test_generic_work_order_patch_cannot_bypass_lifecycle():
    wo = SimpleNamespace(status="in_progress")
    db = _UsersDB(official=wo)
    db.query = lambda _model: _Query(wo)
    with pytest.raises(HTTPException) as error:
        gov_crud.update_work_order(
            db, 12, gov_schemas.WorkOrderUpdate(status="completed"), actor_id=7, actor_role="dispatcher"
        )
    assert error.value.status_code == 422

    assert wo.status == "in_progress"
    assert db.commits == 0


@pytest.mark.parametrize("field", ["estimated_cost", "actual_cost"])
def test_generic_work_order_patch_cannot_change_money_without_approval(field):
    wo = SimpleNamespace(status="open")
    db = _UsersDB(official=wo)
    db.query = lambda _model: _Query(wo)
    with pytest.raises(HTTPException) as error:
        gov_crud.update_work_order(
            db, 12, gov_schemas.WorkOrderUpdate(**{field: 5000}),
            actor_id=7, actor_role="dispatcher",
        )
    assert error.value.status_code == 422
    assert db.commits == 0


def test_generic_work_order_patch_cannot_reassign_active_work():
    wo = SimpleNamespace(status="in_progress", assigned_to_id=8)
    db = _UsersDB(official=wo)
    db.query = lambda _model: _Query(wo)
    with pytest.raises(HTTPException) as error:
        gov_crud.update_work_order(
            db, 12, gov_schemas.WorkOrderUpdate(assigned_to_id=9),
            actor_id=7, actor_role="dispatcher",
        )
    assert error.value.status_code == 409
    assert wo.assigned_to_id == 8
    assert db.commits == 0


def test_general_work_order_edit_records_changed_fields(monkeypatch):
    wo = SimpleNamespace(id=12, wo_number="WO-12", status="open", title="Road edge")
    db = _UsersDB(official=wo)
    db.query = lambda _model: _Query(wo)
    audits = []
    monkeypatch.setattr(gov_crud, "_append_audit", lambda *_args, **kwargs: audits.append(kwargs))
    result = gov_crud.update_work_order(
        db, 12, gov_schemas.WorkOrderUpdate(title="Road edge repair"),
        actor_id=7, actor_role="dispatcher",
    )
    assert result.title == "Road edge repair"
    assert db.commits == 1
    assert audits[0]["details"] == "Fields changed: title"


def test_generic_project_patch_cannot_change_phase_budget_or_emergency():
    project = SimpleNamespace(status="request_received", current_phase=1, estimated_cost=0, is_emergency=False)
    db = _UsersDB()
    db.query = lambda _model: _Query(project)
    with pytest.raises(HTTPException) as error:
        gov_crud.update_project(
            db, 15, gov_schemas.ProjectRequestUpdate(
                status="resolved", current_phase=12, estimated_cost=100000, is_emergency=True,
            ), actor_id=7, actor_role="manager",
        )
    assert error.value.status_code == 422
    assert project.status == "request_received"
    assert db.commits == 0


def test_project_cannot_skip_persisted_phases():
    project = SimpleNamespace(status="request_received", current_phase=1)
    db = _UsersDB()
    db.query = lambda _model: _Query(project)
    with pytest.raises(ValueError, match="one step"):
        gov_crud.advance_project_phase(
            db, 15, "resolved", actor_id=7, actor_role="city_engineer",
        )
    assert project.status == "request_received"
    assert db.commits == 0

    project.status = "milestone_inspections"
    project.current_phase = 11
    with pytest.raises(ValueError, match="governed evidence"):
        gov_crud.advance_project_phase(
            db, 15, "resolved", actor_id=7, actor_role="city_engineer",
        )
    assert project.status == "milestone_inspections"
    assert db.commits == 0


def test_budget_approval_shortcut_is_closed():
    with pytest.raises(HTTPException) as error:
        gov_router.approve_report_with_budget(
            report_id=1,
            payload=gov_schemas.ApproveWithBudgetRequest(
                project_title="Bridge repair", estimated_cost=100000, is_emergency=True,
            ),
            db=SimpleNamespace(), current_user=models.Official(id=7, role="dispatcher"),
        )
    assert error.value.status_code == 409


def test_project_certificate_shortcuts_are_closed_until_evidence_review():
    actor = models.Official(id=7, role="manager")
    with pytest.raises(HTTPException) as direct_error:
        gov_router.issue_certificate(
            proj_id=15, payload=gov_schemas.CertificateOfCompletionIssue(notes="Final audit"),
            db=SimpleNamespace(), current_user=actor,
        )
    assert direct_error.value.status_code == 409
    with pytest.raises(HTTPException) as fqa_error:
        gov_router.issue_fqa_certificate(
            project_id=15, payload=gov_schemas.ProjectStatusUpdate(notes="Final audit"),
            db=SimpleNamespace(), current_user=actor,
        )
    assert fqa_error.value.status_code == 409


def test_generic_report_status_route_only_accepts_verification(monkeypatch):
    monkeypatch.setattr(main.crud, "get_report", lambda *_args, **_kwargs: SimpleNamespace(status="pending"))
    with pytest.raises(HTTPException) as error:
        main.update_report_status(
            report_id=4, status_update=main.ReportStatusUpdate(status="resolved"),
            db=SimpleNamespace(), current_user=models.Official(id=7, role="dispatcher"),
        )
    assert error.value.status_code == 422

    with pytest.raises(HTTPException) as error:
        main.update_report_status(
            report_id=4, status_update=main.ReportStatusUpdate(status="pending_approval", budget=100),
            db=SimpleNamespace(), current_user=models.Official(id=7, role="dispatcher"),
        )
    assert error.value.status_code == 422


@pytest.mark.parametrize("reference", ["https://example.test/proof.jpg", "/api/gov/work-orders/12/evidence/../secret.jpg"])
def test_work_order_evidence_must_reference_a_local_upload(reference):
    with pytest.raises(HTTPException) as error:
        gov_crud._validate_work_order_evidence(reference, 12)
    assert error.value.status_code == 422


def test_work_order_assignee_must_be_active_and_field_eligible():
    suspended = models.Official(id=9, role="field_worker", is_active=True, is_suspended=True)
    with pytest.raises(HTTPException) as error:
        gov_crud._validate_assignee(_UsersDB(official=suspended), 9)
    assert error.value.status_code == 409

    active = models.Official(id=10, role="field_worker", is_active=True, is_suspended=False)
    gov_crud._validate_assignee(_UsersDB(official=active), 10)


def test_field_worker_cannot_read_another_assignment():
    worker = models.Official(id=9, role="field_worker", is_active=True)
    wo = SimpleNamespace(assigned_to_id=10)
    with pytest.raises(HTTPException) as error:
        gov_router._require_work_order_view(wo, worker)
    assert error.value.status_code == 403
