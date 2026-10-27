"""Explainable maintenance planning from dated records, without budget proxies."""
from collections import defaultdict
from datetime import date, timedelta
from statistics import median


def maintenance_projection(logs, today=None):
    today = today or date.today()
    groups = defaultdict(set)
    for log in logs:
        if log.completion_date and log.completion_date <= today:
            groups[(log.work_type or 'Unspecified work').strip()].add(log.completion_date)
    candidates = []
    for work_type, dates in groups.items():
        ordered = sorted(dates)
        if len(ordered) < 3:
            continue
        intervals = [(b - a).days for a, b in zip(ordered, ordered[1:])]
        typical = round(median(intervals))
        lower, upper = min(intervals), max(intervals)
        projected = ordered[-1] + timedelta(days=typical)
        candidates.append(dict(work_type=work_type, completed_count=len(ordered),
            last_completed=ordered[-1].isoformat(), typical_interval_days=typical,
            observed_interval_range_days=[lower, upper],
            review_window_start=(ordered[-1] + timedelta(days=lower)).isoformat(),
            review_window_end=(ordered[-1] + timedelta(days=upper)).isoformat(),
            projected_review_date=projected.isoformat(),
            days_until_review=(projected - today).days,
            basis='Median interval between at least three recorded completions of the same work type.'))
    candidates.sort(key=lambda row: row['projected_review_date'])
    return candidates[0] if candidates else None
