import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { isReportPhotoRestricted, canAutoAdvancePhoto, screeningMessageKey, REPORT_SCREENING_VERSION } from '../reportScreening.js';

test('unknown category and legacy invalid-photo flags remain reviewable', () => {
    for (const result of [null, {}, { is_inappropriate: true }, { is_infrastructure: false },
        { category: 'Undetermined' }, { screening: { outcome: 'restricted_upload', submission_allowed: false } },
    ]) {
        assert.equal(isReportPhotoRestricted(result), false);
    }
});

test('a current restricted upload, screen, private indoor scene or category mismatch blocks the photo step', () => {
    const result = { screening: { version: REPORT_SCREENING_VERSION, outcome: 'restricted_upload', submission_allowed: false } };
    assert.equal(isReportPhotoRestricted(result), true);
    assert.equal(screeningMessageKey(result), 'reportScreening.replacePhoto');
    assert.equal(isReportPhotoRestricted({ screening: { ...result.screening, submission_allowed: true } }), false);
    const screen = { screening: { version: REPORT_SCREENING_VERSION, outcome: 'submit_for_review', submission_allowed: true, provider_state: 'suggested', authenticity: 'screen_suspected' } };
    assert.equal(isReportPhotoRestricted(screen), true);
    assert.equal(screeningMessageKey(screen), 'reportScreening.replacePhoto');
    for (const finding of [{ scene_context: 'private_indoor_suspected' }, { category_fit: 'mismatch_selected' }]) {
        assert.equal(isReportPhotoRestricted({ screening: { ...screen.screening, ...finding } }), true);
    }
});

test('review warnings stay visible until the resident explicitly continues', () => {
    const screening = { version: REPORT_SCREENING_VERSION, provider_state: 'suggested', authenticity: 'not_assessed',
        evidence_quality: 'usable', service_eligibility: 'unknown', content_safety: 'clear' };
    assert.equal(canAutoAdvancePhoto({ category: 'Roads', screening }), true);
    for (const change of [{ authenticity: 'screen_suspected' }, { evidence_quality: 'unclear' },
        { service_eligibility: 'potentially_out_of_service' }, { provider_state: 'unavailable' }]) {
        assert.equal(canAutoAdvancePhoto({ category: 'Roads', screening: { ...screening, ...change } }), false);
    }
});

test('review guidance has English and Filipino parity without echoing model reasons', async () => {
    const keys = ['review', 'possibleScreen', 'scopeUnknown', 'unavailable', 'replacePhoto', 'checking', 'captured'];
    for (const language of ['en', 'tl']) {
        const dictionary = JSON.parse(await readFile(new URL(`../../locales/${language}.json`, import.meta.url), 'utf8'));
        for (const key of keys) assert.ok(dictionary.translation.reportScreening[key]);
    }
    const screening = { version: REPORT_SCREENING_VERSION, provider_state: 'suggested', authenticity: 'screen_suspected' };
    assert.equal(screeningMessageKey({ screening }), 'reportScreening.replacePhoto');
    assert.equal(screeningMessageKey({ screening: { ...screening, provider_state: 'disabled' } }), 'reportScreening.unavailable');
});
