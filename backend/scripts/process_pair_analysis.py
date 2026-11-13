"""Process a bounded batch of queued visual-comparison jobs. No automatic retries."""
import argparse
from pathlib import Path
import sys

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit',type=int,default=1,help='Maximum jobs in this batch (1–20).')
    parser.add_argument('--upload-root',type=Path,required=True,help='Absolute existing directory matching the API report-upload root.')
    args=parser.parse_args(argv)
    if not 1<=args.limit<=20:
        parser.error('Choose a limit from 1 to 20.')
    if not args.upload_root.is_absolute() or not args.upload_root.is_dir():
        parser.error('Use the absolute existing report-upload directory from the API runtime.')
    from database import SessionLocal
    from pair_analysis_jobs import run_one
    processed=0
    for _ in range(args.limit):
        if run_one(SessionLocal,args.upload_root.resolve()) is None:
            break
        processed+=1
    print(f'Processed {processed} queued visual comparison job(s). Inspect authorized job history for results.')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
