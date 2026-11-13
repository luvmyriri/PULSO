"""Validate field payloads locally, or explicitly submit through authorized APIs.

No direct database writes. Defaults to validation without network access.
"""
import argparse
import json
import os
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pydantic import ValidationError
from field_inventory import FieldCandidateInput, FieldObservationInput


def api_origin(value):
    url = urlsplit(value)
    if any(c.isspace() for c in value) or url.username or url.password or url.query or url.fragment or not url.hostname:
        raise ValueError('Use an API base URL without credentials, query or fragment.')
    if url.scheme != 'https' and not (url.scheme == 'http' and url.hostname in {'127.0.0.1', 'localhost', '::1'}):
        raise ValueError('Use HTTPS for a remote API; HTTP is allowed only on loopback.')
    return value.rstrip('/')


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # A redirect must never forward the employee's bearer token elsewhere.
        return None


def open_request(request):
    return build_opener(NoRedirect()).open(request, timeout=30)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path, help='Private JSON field observation payload.')
    parser.add_argument('--asset-id', help='Existing stable asset ID for a repeat observation; omit to create a candidate.')
    parser.add_argument('--submit', action='store_true', help='Send to the API; otherwise only validate locally.')
    parser.add_argument('--base-url', default='http://127.0.0.1:8000')
    parser.add_argument('--idempotency-key', help='Persist one random UUID per operation; reuse it for an unchanged retry.')
    parser.add_argument('--token-env', default='PULSO_FIELD_TOKEN', help='Environment variable holding a staff access token.')
    parser.add_argument('--receipt', type=Path, help='Optionally save the private server receipt as JSON.')
    args = parser.parse_args(argv)
    try:
        payload = json.loads(args.input.read_text(encoding='utf-8'))
        schema = FieldObservationInput if args.asset_id else FieldCandidateInput
        validated = schema.model_validate(payload)
    except (OSError, ValueError, ValidationError) as exc:
        # Do not print input values, private notes, coordinates or credentials.
        fields = ', '.join('.'.join(str(p) for p in e['loc']) for e in exc.errors()) if isinstance(exc, ValidationError) else 'file/JSON'
        print(f'Validation failed ({fields}). Check the private input file.', file=sys.stderr)
        return 2
    if not args.submit:
        print('Field payload validated locally. No network request sent.')
        return 0
    try:
        base = api_origin(args.base_url)
        UUID(args.idempotency_key or '')
    except ValueError:
        print('Submission needs a valid API base URL and a persistent UUID --idempotency-key.', file=sys.stderr)
        return 2
    token = os.environ.get(args.token_env)
    if not token:
        print('Set the staff token in the chosen environment variable before submitting.', file=sys.stderr)
        return 2
    route = '/api/gov/field-inventory/assets' + (f'/{quote(args.asset_id, safe="")}/observations' if args.asset_id else '')
    request = Request(base + route, data=validated.model_dump_json().encode('utf-8'), method='POST', headers={
        'Authorization':f'Bearer {token}', 'Content-Type':'application/json', 'Idempotency-Key':args.idempotency_key})
    try:
        with open_request(request) as response:
            receipt = json.load(response)
        asset_id, observation_id = receipt['asset']['asset_id'], receipt['observation']['id']
    except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError, TypeError) as exc:
        code = f' HTTP {exc.code}.' if isinstance(exc, HTTPError) else ''
        print(f'No successful receipt confirmed.{code} Preserve the operation key and original input. Check the API/session; retry unchanged if the result is uncertain.', file=sys.stderr)
        return 1
    if args.receipt:
        try:
            args.receipt.write_text(json.dumps(receipt, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
        except OSError:
            print('The API confirmed the observation, but the local receipt file could not be saved. Retry unchanged to recover it.', file=sys.stderr)
            return 1
    print(f'Confirmed asset {asset_id}; observation {observation_id}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
