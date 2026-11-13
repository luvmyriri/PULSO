"""Fetch or verify a private PULSO learning audit. Never fits or publishes a model."""
import argparse
import json
import os
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from learning_dataset_contract import canonical, verify,SCHEMA as CONCERN_SCHEMA
from matching_dataset_contract import SCHEMA as MATCHING_SCHEMA, verify as verify_matching
from checkpoint_dataset_contract import SCHEMA as CHECKPOINT_SCHEMA,verify as verify_checkpoints
from observation_field_dataset_contract import SCHEMA as OBSERVATION_FIELD_SCHEMA,verify as verify_observation_fields

MAX_BYTES = 64 * 1024 * 1024


def api_origin(value):
    url = urlsplit(value)
    if (any(c.isspace() for c in value) or not url.hostname or url.username is not None
            or url.password is not None or url.query or url.fragment):
        raise ValueError('Invalid API origin.')
    if url.scheme != 'https' and not (url.scheme == 'http' and url.hostname in {'localhost', '127.0.0.1', '::1'}):
        raise ValueError('Remote access requires HTTPS.')
    return value.rstrip('/')


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward a staff bearer token to a redirect destination.


def open_request(request):
    return build_opener(NoRedirect()).open(request, timeout=120)


def read_document(stream):
    data = stream.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError('Export exceeds the local size limit.')
    document = json.loads(data)
    if not isinstance(document, dict) or not isinstance(document.get('manifest'), dict):
        raise ValueError('Invalid export envelope.')
    schema=document['manifest'].get('schema_version')
    verifier = verify_matching if schema==MATCHING_SCHEMA else verify_checkpoints if schema==CHECKPOINT_SCHEMA else verify_observation_fields if schema==OBSERVATION_FIELD_SCHEMA else verify
    return document, verifier(document)


def write_new(path, content):
    # Exclusive creation protects an existing export even if another run wins the race.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, 'O_BINARY', 0), 0o600)
    try:
        with os.fdopen(fd, 'wb') as destination:
            destination.write(content)
    except OSError:
        path.unlink(missing_ok=True)
        raise


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    local = commands.add_parser('verify', help='Check an existing export offline.')
    local.add_argument('--input', required=True, type=Path)
    fetch = commands.add_parser('fetch', help='Download one complete authorized snapshot.')
    fetch.add_argument('--output', required=True, type=Path, help='New JSON file in a staff-controlled directory.')
    fetch.add_argument('--base-url', default='http://127.0.0.1:8000')
    fetch.add_argument('--token-env', default='PULSO_LEARNING_TOKEN')
    fetch.add_argument('--max-cases', type=int, default=1000)
    fetch.add_argument('--report-id',type=int,help='Explicit single-report selection for observation-fields only.')
    fetch.add_argument('--dataset', choices=['concerns', 'matching','checkpoints','observation-fields'], default='concerns',
                       help='Current concern, matching, checkpoint outcome or observation field-coverage audit.')
    args = parser.parse_args(argv)
    if args.command == 'verify':
        try:
            with args.input.open('rb') as source:
                _, manifest = read_document(source)
        except (OSError, ValueError, TypeError, KeyError, AttributeError, RecursionError):
            print('Export could not be verified. Check the file, schema and checksums.', file=sys.stderr)
            return 1
    else:
        try:
            base = api_origin(args.base_url)
        except ValueError:
            print('Use an HTTPS API URL without credentials, query or fragment. Loopback may use HTTP.', file=sys.stderr)
            return 2
        token = os.environ.get(args.token_env)
        if not token or any(c.isspace() for c in token) or not 1 <= args.max_cases <= 5000:
            print('Set the staff token environment variable and choose max-cases from 1 to 5000.', file=sys.stderr)
            return 2
        if args.report_id is not None and (args.dataset!='observation-fields' or args.report_id<1):
            print('A positive report-id selection is supported only for observation-fields.',file=sys.stderr)
            return 2
        if args.output.exists():
            print('Output already exists. Choose a new file.', file=sys.stderr)
            return 2
        endpoint,bound={'matching':('matching-dataset','max_reviews'),'concerns':('dataset','max_cases'),
            'checkpoints':('checkpoint-dataset','max_checkpoints'),
            'observation-fields':('observation-field-dataset','max_observations')}[args.dataset]
        params={bound:args.max_cases}
        if args.report_id is not None:params['report_id']=args.report_id
        request = Request(base + '/api/gov/report-learning/' + endpoint + '?' + urlencode(params),
                          headers={'Authorization':f'Bearer {token}', 'Accept':'application/json'})
        try:
            with open_request(request) as source:
                document, manifest = read_document(source)
            expected={'concerns':CONCERN_SCHEMA,'matching':MATCHING_SCHEMA,'checkpoints':CHECKPOINT_SCHEMA,
                'observation-fields':OBSERVATION_FIELD_SCHEMA}[args.dataset]
            if manifest['schema_version']!=expected:
                raise ValueError('Response schema does not match the requested dataset.')
            if args.dataset=='observation-fields' and manifest['selection_report_id']!=args.report_id:
                raise ValueError('Response report selection differs from the request.')
        except HTTPError as exc:
            print(f'Export request failed (HTTP {exc.code}). No export saved.', file=sys.stderr)
            return 1
        except (URLError, OSError, ValueError, TypeError, KeyError, AttributeError, RecursionError):
            print('No complete verified response received. No export saved.', file=sys.stderr)
            return 1
        try:
            write_new(args.output, canonical(document) + b'\n')
        except OSError:
            print('Export could not be saved. Use a new file in a writable private directory.', file=sys.stderr)
            return 1
    kind = 'matching review' if manifest['schema_version'] == MATCHING_SCHEMA else 'checkpoint' if manifest['schema_version']==CHECKPOINT_SCHEMA else 'observation field' if manifest['schema_version']==OBSERVATION_FIELD_SCHEMA else 'concern'
    print(f"Verified {manifest['row_count']} {kind} rows; export {manifest['export_sha256'][:16]}. Audit only; training release blocked.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
