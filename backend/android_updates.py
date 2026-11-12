"""Distribute completed resident APK builds, never an APK still being written."""
import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse

router = APIRouter(prefix='/api/mobile/app-updates', tags=['App updates'])
RELEASE_DIRECTORY = Path(__file__).resolve().parent.parent / 'frontend/android/updates'
APPLICATION_ID = 'ph.gov.caloocan.pulso'


def latest_release():
    try:
        release = json.loads((RELEASE_DIRECTORY / 'latest.json').read_text(encoding='utf-8'))
        code = release['versionCode']
        if (type(code) is not int or code < 1 or release['applicationId'] != APPLICATION_ID
                or not re.fullmatch(r'\d+\.\d+\.\d+', release['versionName'])
                or not re.fullmatch(r'[a-f0-9]{64}', release['sha256'])
                or type(release['size']) is not int or release['size'] <= 0):
            raise ValueError('Invalid update metadata')
        apk = RELEASE_DIRECTORY / f'pulso-{code}.apk'
        if apk.stat().st_size != release['size']:
            raise ValueError('Incomplete update')
        return release, apk
    except (OSError, ValueError, KeyError, TypeError):
        raise HTTPException(status_code=503, detail='App update is not available. Try again later.') from None


@router.get('/latest')
def get_latest_update():
    release, _ = latest_release()
    return JSONResponse(release, headers={'Cache-Control': 'no-store'})


@router.get('/{version_code}/apk')
def download_update(version_code: int):
    release, apk = latest_release()
    if version_code != release['versionCode']:
        raise HTTPException(status_code=409, detail='A newer update is available. Check for updates again.')
    return FileResponse(apk, filename=f'pulso-{version_code}.apk',
                        media_type='application/vnd.android.package-archive',
                        headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})
