"""Clean-install initialization uses real reference data, never developer seeds."""
import importlib.util
import json
from pathlib import Path
from unittest.mock import patch
import pytest
import models
import gov_models as gm

path = Path(__file__).resolve().parents[2] / 'deploy/production/initialize.py'
spec = importlib.util.spec_from_file_location('production_initialize', path)
initialize = importlib.util.module_from_spec(spec)
spec.loader.exec_module(initialize)


def test_reference_only_bootstrap_is_idempotent_and_keeps_operational_tables_empty(clean_postgis):
    with clean_postgis() as db:
        initialize.references(db)
        initialize.references(db)
        assert db.query(models.District).count() == 3
        assert db.query(models.Barangay).count() == 188
        assert db.query(models.CityBoundary).count() == 2
        assert db.query(models.Barangay).filter_by(district_id=1).count() == 59
        assert db.query(models.Barangay).filter_by(district_id=2).count() == 118
        assert db.query(models.Barangay).filter_by(district_id=3).count() == 11
        assert db.get(models.Barangay,176).district_id == 1
        assert db.get(models.Barangay,182).district_id == 3
        for model in (models.Official,models.Resident,models.Report,gm.WorkOrder,gm.InfrastructureAsset,gm.MaintenanceHistory):
            assert db.query(model).count() == 0


def test_initial_admin_uses_existing_single_use_invitation_and_refuses_a_second_bootstrap(clean_postgis,monkeypatch,capsys):
    monkeypatch.setenv('PULSO_ADMIN_EMAIL','fake-admin@test.invalid')
    monkeypatch.setenv('PULSO_ADMIN_NAME','FAKE test administrator')
    monkeypatch.setenv('PULSO_PUBLIC_BASE_URL','https://test.invalid')
    with clean_postgis() as db:
        initialize.first_admin(db)
        result=json.loads(capsys.readouterr().out)
        assert result['activation_url'].startswith('https://test.invalid/gov/activate#token=')
        person=db.query(models.Official).one()
        assert person.role=='system_admin' and not person.is_active and person.invitation_pending
        assert db.query(models.StaffCredentialToken).count()==1
        with pytest.raises(SystemExit,match='Staff already exist'):
            initialize.first_admin(db)
