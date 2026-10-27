"""Read registered API routes without invoking application startup or mutations.

Inventory is coverage evidence only: dependency names are not proof of authorization.
"""
from pathlib import Path
from collections import Counter, defaultdict
import inspect
import json
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
from main import app
from fastapi.routing import APIRoute


def inventory():
    result=[]
    for route in app.routes:
        if not isinstance(route,APIRoute): continue
        if not route.path.startswith(('/api/gov','/api/admin','/api/analytics','/api/news','/api/advisories','/api/reports','/api/work-orders','/api/notifications')): continue
        filename=Path(inspect.getsourcefile(route.endpoint))
        source=inspect.getsource(route.endpoint)
        result.append(dict(path=route.path,methods=sorted(route.methods),function=route.endpoint.__name__,
            source=filename.relative_to(ROOT).as_posix(),line=inspect.getsourcelines(route.endpoint)[1],
            dependencies=sorted({getattr(dependency.call,'__name__','callable') for dependency in route.dependant.dependencies}),
            declared_disposition='legacy_or_policy_blocked' if 'raise HTTPException' in source and any(message in source for message in ('status_code=410','requires governed','outside PULSO','does not approve budgets','records sourced disclosures only')) else 'requires_behavioral_review'))
    by_route=defaultdict(list)
    for row in result:
        for method in row['methods']: by_route[(method,row['path'])].append(f"{row['source']}:{row['line']} {row['function']}")
    return dict(status='Observed route inventory; not a completion claim',route_count=len(result),
        by_source=dict(Counter(row['source'] for row in result)),
        duplicates=[dict(method=key[0],path=key[1],registrations=values) for key,values in by_route.items() if len(values)>1],routes=result)


if __name__=='__main__':
    data=inventory()
    target=ROOT/'docs/government-system-proposal/government-endpoint-inventory-2026-10-24.json'
    target.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({key:data[key] for key in ('route_count','by_source','duplicates')},indent=2))
