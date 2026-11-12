import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const built = await build({ entryPoints: ['src/utils/reportMedia.js'], bundle: true, write: false, format: 'esm',
    define: { 'import.meta.env': '{"VITE_API_BASE_URL":"http://192.168.0.199:33159"}' } });
const { getReportPhotoUrl, resolveReportMediaUrl, getReportPinPhotoUrl } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const api = 'http://192.168.0.199:33159';

test('report evidence paths resolve against the API, not the Capacitor origin', () => {
    for (const path of ['/api/uploads/reports/photo.jpg', 'api/uploads/reports/photo.jpg', '/uploads/reports/photo.jpg']) {
        assert.equal(resolveReportMediaUrl(path), api + '/' + path.replace(/^\//, ''));
    }
    assert.equal(getReportPhotoUrl({ image_url: '/api/uploads/reports/own.jpg', media_urls: ['/other.jpg'] }), api + '/api/uploads/reports/own.jpg');
    assert.equal(getReportPhotoUrl({ image_paths: '["/api/uploads/reports/legacy.jpg"]' }), api + '/api/uploads/reports/legacy.jpg');
    assert.equal(getReportPhotoUrl({ photos: ['/api/uploads/reports/photo.jpg'] }), api + '/api/uploads/reports/photo.jpg');
    for (const path of ['https://cdn.example.invalid/photo.jpg', 'data:image/png;base64,AA', 'blob:https://localhost/sample']) {
        assert.equal(resolveReportMediaUrl(path), path);
    }
    for (const path of [null, {}, '', 'javascript:alert(1)', 'file:///private/image.jpg', '//other.example/photo.jpg']) {
        assert.equal(resolveReportMediaUrl(path), null);
    }
});

test('map thumbnail requests preserve public projection and external media boundaries', () => {
    assert.equal(getReportPinPhotoUrl(api + '/api/uploads/reports/photo.jpg'), api + '/api/thumbnails?src=%2Fapi%2Fuploads%2Freports%2Fphoto.jpg&size=80');
    assert.equal(getReportPinPhotoUrl(api + '/api/thumbnails?src=%2Fapi%2Fuploads%2Freports%2Fphoto.jpg&size=512'), api + '/api/thumbnails?src=%2Fapi%2Fuploads%2Freports%2Fphoto.jpg&size=80');
    assert.equal(getReportPinPhotoUrl('https://cdn.example.invalid/photo.jpg'), 'https://cdn.example.invalid/photo.jpg');
});
