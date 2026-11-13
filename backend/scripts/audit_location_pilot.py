"""Initialize a private pilot plan or audit recorded phone/reference trials offline."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pydantic import ValidationError
from location_pilot import Pilot, Trial, audit, trial_from_record
from scripts.export_report_learning import write_new

MAX_BYTES = 32 * 1024 * 1024


def read_json(path):
    with path.open('rb') as source:
        payload = source.read(MAX_BYTES+1)
    if len(payload) > MAX_BYTES:
        raise ValueError('Input exceeds size limit.')
    return json.loads(payload)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    initialize = commands.add_parser('init', help='Create an empty plan; no sample coordinates or policy.')
    initialize.add_argument('--pilot-id', required=True)
    initialize.add_argument('--output', required=True, type=Path)
    extract = commands.add_parser('trial', help='Extract a trial from a saved private report or field observation.')
    extract.add_argument('--input', required=True, type=Path)
    extract.add_argument('--kind', required=True, choices=['report', 'field_observation'])
    for flag in ('trial-id', 'session-id', 'device-id', 'observed-at'):
        extract.add_argument('--'+flag, required=True)
    extract.add_argument('--environment', required=True, choices=['open_sky','beside_buildings','across_road','indoors','other'])
    extract.add_argument('--output', required=True, type=Path)
    append = commands.add_parser('append', help='Validate and append trials into a new version of a pilot file.')
    append.add_argument('--input', required=True, type=Path)
    append.add_argument('--trial', required=True, type=Path, action='append')
    append.add_argument('--output', required=True, type=Path)
    evaluate = commands.add_parser('audit', help='Compare recorded trials with independent references.')
    evaluate.add_argument('--input', required=True, type=Path)
    evaluate.add_argument('--output', required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        if args.command == 'init':
            result = Pilot(pilot_id=args.pilot_id).model_dump(mode='json')
        elif args.command == 'trial':
            result = trial_from_record(read_json(args.input), kind=args.kind, trial_id=args.trial_id,
                session_id=args.session_id, device_id=args.device_id, environment=args.environment,
                observed_at=args.observed_at).model_dump(mode='json')
        else:
            pilot = Pilot.model_validate(read_json(args.input))
            if args.command == 'append':
                payload = pilot.model_dump(mode='json')
                payload['trials'] += [Trial.model_validate(read_json(path)).model_dump(mode='json') for path in args.trial]
                result = Pilot.model_validate(payload).model_dump(mode='json')
            else:
                result = audit(pilot)
    except (OSError, ValueError, ValidationError):
        # Do not echo raw Pydantic errors, private coordinates or input values.
        print('Pilot input is invalid or unavailable. Check the private file, IDs, coordinate bounds and timezone-aware timestamps.', file=sys.stderr)
        return 2
    try:
        write_new(args.output, (json.dumps(result, indent=2, sort_keys=True, allow_nan=False)+'\n').encode())
    except OSError:
        print('Output could not be saved. Choose a new file in a writable private directory.', file=sys.stderr)
        return 1
    messages = dict(init='Saved empty pilot plan. No measurements collected.',
        trial='Saved trial with original provenance. Add independent reference and review details before auditing.',
        append='Saved a new pilot version with validated trials.')
    print(messages[args.command] if args.command in messages else
        f"Audited {result['summary']['trial_count']} submitted trials. Automatic location verification and matching remain disabled.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
