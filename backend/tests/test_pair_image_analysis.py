"""Real image decoding and typed adapter checks; no provider/network calls."""
from hashlib import sha256
from io import BytesIO
import json
from types import SimpleNamespace

from PIL import Image
import pytest

import gemini_service
import pair_image_analysis as analysis


def image_bytes(color='red',exif=False):
    image=Image.new('RGB',(8,6),color);output=BytesIO()
    tags=Image.Exif()
    if exif:
        tags[274]=6;tags[270]='SAMPLE private image metadata'
    image.save(output,format='JPEG',exif=tags)
    return output.getvalue()


def hints():
    return dict(source_usable=True,target_usable=True,asset_relation='uncertain',defect_relation='uncertain',
        visible_matches=['SAMPLE repeated structural design.'],visible_differences=[],limitations=['Viewpoint does not establish a unique object or episode.'])


def test_derivative_is_oriented_metadata_free_and_original_is_unchanged(tmp_path):
    raw=image_bytes(exif=True);path=tmp_path/'SAMPLE.jpg';path.write_bytes(raw)
    result=analysis.prepare_report_image(tmp_path,'/api/uploads/reports/SAMPLE.jpg')
    assert path.read_bytes()==raw and result['original_sha256']==sha256(raw).hexdigest()
    with Image.open(BytesIO(result['data'])) as image:
        assert image.size==(6,8) and not image.getexif()
        assert b'SAMPLE private' not in result['data']
    assert result['prepared_sha256']==sha256(result['data']).hexdigest()


@pytest.mark.parametrize('reference',['https://example.invalid/x.jpg','/api/uploads/reports/../x.jpg',
    '/api/uploads/reports/%2e%2e/x.jpg','/api/uploads/reports/a.jpg?x=1','C:/private.jpg',None])
def test_only_local_report_references_are_supported(tmp_path,reference):
    with pytest.raises(analysis.AnalysisUnavailable,match='unsupported_photo_reference'):
        analysis.prepare_report_image(tmp_path,reference)


def test_oversized_corrupt_or_high_pixel_images_fail_closed(tmp_path,monkeypatch):
    path=tmp_path/'SAMPLE.jpg';path.write_bytes(b'not a photo')
    with pytest.raises(analysis.AnalysisUnavailable):analysis.prepare_report_image(tmp_path,'/api/uploads/reports/SAMPLE.jpg')
    path.write_bytes(image_bytes());monkeypatch.setattr(analysis,'MAX_PIXELS',10)
    with pytest.raises(analysis.AnalysisUnavailable,match='unsupported_image'):analysis.prepare_report_image(tmp_path,'/api/uploads/reports/SAMPLE.jpg')
    monkeypatch.setattr(analysis,'MAX_BYTES',5)
    with pytest.raises(analysis.AnalysisUnavailable,match='photo_size_limit'):analysis.prepare_report_image(tmp_path,'/api/uploads/reports/SAMPLE.jpg')


def provider_environment(monkeypatch):
    monkeypatch.setattr(gemini_service,'AI_DISABLED',False)
    monkeypatch.setattr(gemini_service,'_SDK_READY',True)
    monkeypatch.setattr(gemini_service._rate_limiter,'check_and_consume',lambda *_:(True,''))


def test_typed_generation_has_bounded_timeout_no_retry_no_tools_and_safe_context(monkeypatch):
    provider_environment(monkeypatch)
    supplied={}
    def generate(**kwargs):
        supplied.update(kwargs)
        return SimpleNamespace(text=json.dumps(hints()),model_version='SAMPLE-provider-version')
    client=SimpleNamespace(models=SimpleNamespace(generate_content=generate))
    image=dict(data=image_bytes(),mime_type='image/jpeg')
    result=analysis.compare_images(image,image,{'image_a':['Roads & Bridges'],'image_b':['Roads & Bridges']},model='SAMPLE-model',actor_id=1,client=client)
    config=supplied['config']
    assert config.http_options.timeout==30000 and config.http_options.retry_options.attempts==1
    assert config.tools is None and config.response_schema is analysis.VisualHints
    assert supplied['model']=='SAMPLE-model' and 'untrusted evidence' in config.system_instruction
    assert 'latitude' not in str(supplied['contents']) and 'contact_email' not in str(supplied['contents'])
    assert result['episode_identity']=='not_established_from_images'
    assert result['review_required'] is True and result['location_verified'] is False


@pytest.mark.parametrize('raw',[
    '{"incomplete":true}',
    json.dumps(dict(hints(),confidence=.99)),
    json.dumps(dict(hints(),source_usable=False,asset_relation='possibly_same')),
    json.dumps(dict(hints(),source_usable='true')),
    json.dumps(dict(hints(),visible_matches=['Email private@example.invalid'])),
    json.dumps(dict(hints(),asset_relation='visibly_different',defect_relation='visually_consistent')),
    json.dumps(dict(hints(),asset_relation='possibly_same',visible_matches=[])),
    json.dumps(dict(hints(),defect_relation='different_visible_defects',visible_differences=[])),
])
def test_malformed_or_unsupported_model_claims_never_become_advice(monkeypatch,raw):
    provider_environment(monkeypatch)
    client=SimpleNamespace(models=SimpleNamespace(generate_content=lambda **_ :SimpleNamespace(text=raw)))
    with pytest.raises(analysis.AnalysisUnavailable,match='provider_failed_or_invalid_output'):
        analysis.compare_images(dict(data=b'SAMPLE',mime_type='image/jpeg'),dict(data=b'SAMPLE',mime_type='image/jpeg'),{},model='SAMPLE',actor_id=1,client=client)


def test_disabled_or_budget_limited_provider_never_sends(monkeypatch):
    provider_environment(monkeypatch)
    client=SimpleNamespace(models=SimpleNamespace(generate_content=lambda **_:pytest.fail('Provider contacted.')))
    monkeypatch.setattr(gemini_service,'AI_DISABLED',True)
    with pytest.raises(analysis.AnalysisUnavailable,match='deployment_disabled'):
        analysis.compare_images({}, {}, {},model='SAMPLE',actor_id=1,client=client)
    monkeypatch.setattr(gemini_service,'AI_DISABLED',False)
    monkeypatch.setattr(gemini_service._rate_limiter,'check_and_consume',lambda *_:(False,'SAMPLE private limiter detail'))
    with pytest.raises(analysis.AnalysisUnavailable,match='provider_budget_or_rate_limit'):
        analysis.compare_images({}, {}, {},model='SAMPLE',actor_id=1,client=client)


@pytest.mark.parametrize('status',[200,429])
def test_installed_google_sdk_serializes_schema_and_honors_one_attempt_offline(monkeypatch,status):
    import httpx
    from google import genai
    from google.genai import types
    from google.auth.credentials import Credentials
    class OfflineCredentials(Credentials):
        def refresh(self,request):
            self.token='SAMPLE-offline-token'  # No refresh/network call is allowed in this transport fixture.
    provider_environment(monkeypatch)
    requests=[]
    def transport(request):
        requests.append(json.loads(request.content))
        if status==429:
            return httpx.Response(429,json={'error':{'code':429,'status':'RESOURCE_EXHAUSTED','message':'SAMPLE'}})
        return httpx.Response(200,json={'candidates':[{'content':{'role':'model','parts':[{'text':json.dumps(hints())}]},'finishReason':'STOP'}],'modelVersion':'SAMPLE'})
    with httpx.Client(transport=httpx.MockTransport(transport)) as http_client:
        with genai.Client(vertexai=True,project='SAMPLE-offline',location='us-central1',credentials=OfflineCredentials(),
                          http_options=types.HttpOptions(httpx_client=http_client)) as client:
            image=dict(data=image_bytes(),mime_type='image/jpeg')
            if status==200:
                result=analysis.compare_images(image,image,{},model='gemini-2.5-flash',actor_id=1,client=client)
                assert result['hints']['asset_relation']=='uncertain'
            else:
                with pytest.raises(analysis.AnalysisUnavailable):
                    analysis.compare_images(image,image,{},model='gemini-2.5-flash',actor_id=1,client=client)
    assert len(requests)==1
    assert requests[0]['generationConfig']['responseMimeType']=='application/json'
    assert requests[0]['generationConfig']['responseSchema']['properties']['asset_relation']['enum']
