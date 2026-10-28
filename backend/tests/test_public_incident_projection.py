from public_reports import public_incident_description, public_report_photo


def test_public_incident_text_removes_reporter_contact_details():
    text = "Pothole beside Maria Santos. Call 09171234567 or maria@example.com."
    assert public_incident_description(text, ("Maria Santos",)) == (
        "Pothole beside [personal information removed]. Call [contact removed] or [contact removed]."
    )


def test_public_photo_uses_metadata_free_local_copy_only():
    photo = public_report_photo("/api/uploads/reports/report_abcdef0123456789.jpg")
    assert photo == "/api/thumbnails?src=%2Fapi%2Fuploads%2Freports%2Freport_abcdef0123456789.jpg&size=512"
    assert public_report_photo("https://example.com/private.jpg") is None
    assert public_report_photo("/api/uploads/docs/private.jpg") is None
    assert public_report_photo("/api/uploads/reports/../private.jpg") is None
