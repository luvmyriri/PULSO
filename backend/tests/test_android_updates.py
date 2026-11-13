"""Synthetic packages in an isolated folder; no real app publication."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
import android_updates


class AndroidUpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='pulso-updates-')
        self.directory = Path(self.temp.name)
        self.patch = patch.object(android_updates, 'RELEASE_DIRECTORY', self.directory)
        self.patch.start()
        app = FastAPI()
        app.include_router(android_updates.router)
        self.client = TestClient(app)
        self.release = dict(applicationId=android_updates.APPLICATION_ID, versionCode=5,
                            versionName='2.4.4', size=3, sha256='a' * 64)

    def tearDown(self):
        self.patch.stop()
        self.temp.cleanup()

    def publish_fixture(self):
        (self.directory / 'latest.json').write_text(json.dumps(self.release), encoding='utf-8')
        (self.directory / 'pulso-5.apk').write_bytes(b'apk')

    def test_unpublished_is_unavailable_not_current(self):
        self.assertEqual(self.client.get('/api/mobile/app-updates/latest').status_code, 503)
        self.assertEqual(self.client.get('/api/mobile/app-updates/download').status_code, 503)

    def test_latest_and_download_are_uncached_and_consistent(self):
        self.publish_fixture()
        response = self.client.get('/api/mobile/app-updates/latest')
        self.assertEqual(response.json(), self.release)
        self.assertEqual(response.headers['cache-control'], 'no-store')
        apk = self.client.get('/api/mobile/app-updates/5/apk')
        self.assertEqual(apk.content, b'apk')
        self.assertEqual(apk.headers['content-type'], 'application/vnd.android.package-archive')
        self.assertEqual(apk.headers['cache-control'], 'no-store')
        stable = self.client.get('/api/mobile/app-updates/download')
        self.assertEqual(stable.content, apk.content)
        self.assertEqual(stable.headers['content-type'], apk.headers['content-type'])
        self.assertEqual(stable.headers['cache-control'], 'no-store')
        self.assertEqual(stable.headers['x-content-type-options'], 'nosniff')
        self.assertIn('PULSO-2.4.4.apk', stable.headers['content-disposition'])

    def test_replaced_version_requires_fresh_check(self):
        self.publish_fixture()
        self.assertEqual(self.client.get('/api/mobile/app-updates/4/apk').status_code, 409)

    def test_wrong_package_or_incomplete_file_is_not_published(self):
        self.release['applicationId'] = 'another.app'
        self.publish_fixture()
        self.assertEqual(self.client.get('/api/mobile/app-updates/latest').status_code, 503)
        self.release['applicationId'] = android_updates.APPLICATION_ID
        self.release['size'] = 999
        self.publish_fixture()
        self.assertEqual(self.client.get('/api/mobile/app-updates/latest').status_code, 503)


if __name__ == '__main__':
    unittest.main()
