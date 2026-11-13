"""Offline research-only LightGBM completion-time comparison; no live artifact."""
import argparse
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from checkpoint_candidate import experiment
from checkpoint_baseline import GROUPINGS
from learning_dataset_contract import canonical
from scripts.evaluate_checkpoint_baseline import read
from scripts.export_report_learning import write_new


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--training',required=True,type=Path);parser.add_argument('--evaluation',required=True,type=Path)
    parser.add_argument('--source-key',required=True);parser.add_argument('--grouping',required=True,choices=sorted(GROUPINGS))
    parser.add_argument('--interval-end-days',required=True,type=float,action='append')
    parser.add_argument('--min-train-groups',required=True,type=int);parser.add_argument('--min-train-events',required=True,type=int)
    parser.add_argument('--trees',required=True,type=int);parser.add_argument('--seed',required=True,type=int)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args(argv)
    try:
        result=experiment(read(args.training),read(args.evaluation),grouping=args.grouping,interval_ends=args.interval_end_days,
            min_train_groups=args.min_train_groups,min_train_events=args.min_train_events,source_key=args.source_key,trees=args.trees,seed=args.seed)
    except (OSError,ValueError,TypeError,KeyError,OverflowError,RecursionError,ImportError):
        print('Experiment input, working policy or numerical runtime is invalid/unavailable. No result or model artifact saved.',file=sys.stderr)
        return 2
    try:write_new(args.output,canonical(result)+b'\n')
    except OSError:
        print('Output could not be saved. Choose a new private file; no reusable model was installed.',file=sys.stderr)
        return 1
    print(f"Experiment status: {result['model_status']}. Offline research only; live ETA and model release remain blocked.")
    return 0


if __name__=='__main__':raise SystemExit(main())
