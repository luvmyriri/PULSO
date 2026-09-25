"""
PULSO E2E Standalone Test Suite Runner
Wrapper for backend/tests/test_e2e_open_reporting.py
"""

import sys
import os

# Ensure current directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from tests.test_e2e_open_reporting import (
    TestTier1FeatureCoverage,
    TestTier2BoundaryCornerCases,
    TestTier3CrossFeatureWorkflows,
    TestTier4RealWorldWorkloads,
    run_standalone_test_suite
)

if __name__ == "__main__":
    sys.exit(run_standalone_test_suite())
