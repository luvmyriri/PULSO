"""Compare two saved checkpoint snapshots using a descriptive censored baseline."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from checkpoint_baseline import GROUPINGS,evaluate
from learning_dataset_contract import canonical
from scripts.export_report_learning import write_new

MAX_BYTES=64*1024*1024


def read(path):
    with path.open('rb') as source:content=source.read(MAX_BYTES+1)
    if len(content)>MAX_BYTES:raise ValueError('Snapshot exceeds limit.')
    return json.loads(content)


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--training',required=True,type=Path)
    parser.add_argument('--evaluation',required=True,type=Path)
    parser.add_argument('--source-key',required=True)
    parser.add_argument('--grouping',required=True,choices=sorted(GROUPINGS))
    parser.add_argument('--horizon-days',required=True,type=float,action='append')
    parser.add_argument('--min-train-groups',required=True,type=int)
    parser.add_argument('--min-train-events',required=True,type=int)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args(argv)
    try:
        result=evaluate(read(args.training),read(args.evaluation),grouping=args.grouping,horizons_days=args.horizon_days,
            min_train_groups=args.min_train_groups,min_train_events=args.min_train_events,source_key=args.source_key)
    except (OSError,ValueError,TypeError,KeyError,OverflowError,RecursionError,ImportError):
        print('Snapshots, working policy or statistical runtime are invalid/unavailable. Check verified cohort files, ordered cutoffs, frozen lineage, grouping coverage and SciPy ECDF support. No output saved.',file=sys.stderr)
        return 2
    try:write_new(args.output,canonical(result)+b'\n')
    except OSError:
        print('Output could not be saved. Choose a new file in a writable private directory.',file=sys.stderr)
        return 1
    print(f"Analyzed {result['counts']['holdout_eligible_checkpoints']} eligible later checkpoints. Descriptive reference only; live ETA and training release remain blocked.")
    return 0


if __name__=='__main__':raise SystemExit(main())
