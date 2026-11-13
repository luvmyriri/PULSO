"""Prepare a blank matching run or evaluate supplied decisions entirely offline."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from learning_dataset_contract import canonical
from matching_evaluation import evaluate,prepare
from scripts.export_report_learning import write_new

MAX_BYTES=64*1024*1024


def read(path):
    with path.open('rb') as source:
        content=source.read(MAX_BYTES+1)
    if len(content)>MAX_BYTES:
        raise ValueError('Input exceeds limit.')
    return json.loads(content)


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    commands=parser.add_subparsers(dest='command',required=True)
    initialize=commands.add_parser('prepare',help='Create entries with no decisions or partitions preselected.')
    initialize.add_argument('--run-id',required=True)
    initialize.add_argument('--artifact-key',required=True)
    audit=commands.add_parser('audit',help='Evaluate a complete supplied run; never calls a model or API.')
    audit.add_argument('--predictions',required=True,type=Path)
    for command in (initialize,audit):
        command.add_argument('--input',required=True,type=Path,help='Verified private matching audit JSON.')
        command.add_argument('--output',required=True,type=Path,help='New file in a controlled private directory.')
    args=parser.parse_args(argv)
    try:
        document=read(args.input)
        result=prepare(document,run_id=args.run_id,artifact_key=args.artifact_key) if args.command=='prepare' else evaluate(document,read(args.predictions))
    except (OSError,ValueError,TypeError,KeyError,OverflowError,RecursionError):
        print('Matching input is invalid or unavailable. Check snapshot checksums, complete pair coverage, latest revisions, times and grouped partitions. No output saved.',file=sys.stderr)
        return 2
    try:
        write_new(args.output,canonical(result)+b'\n')
    except OSError:
        print('Output could not be saved. Choose a new file in a writable private directory.',file=sys.stderr)
        return 1
    print('Saved blank scoring entries. Supply actual decisions and grouped partitions; no scores generated.' if args.command=='prepare' else
        f"Evaluated {result['latest_pair_count']} supplied pairs. Descriptive operational agreement only; automatic matching release blocked.")
    return 0


if __name__=='__main__':
    raise SystemExit(main())
