"""Canonical job-family names for operational authorization.

The stored role remains unchanged for audit and specialization. Only the three
named division-chief variants inherit the existing division-chief defaults.
"""

SPECIALTY_DIVISION_CHIEFS = frozenset({
    'division_chief_arch',
    'division_chief_structural',
    'division_chief_electrical',
})


def canonical_role(role):
    return 'division_chief' if role in SPECIALTY_DIVISION_CHIEFS else role
