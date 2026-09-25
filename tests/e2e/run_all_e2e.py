"""
========================================================================================
PULSO Government Workspace E2E Test Suite Unified Orchestrator Runner
========================================================================================
Executes all 4 Tiers:
  - Tier 1: Core Feature Coverage (155 tests across all 31 features)
  - Tier 2: Boundary & Corner Cases (155 tests across all 31 features)
  - Tier 3: Cross-Feature Interaction Workflows (10 complex multi-feature state machines)
  - Tier 4: Real-World Municipal Operational Scenarios (5 realistic workload simulations)
Total Tests: 325 test cases

Execution:
  python tests/e2e/run_all_e2e.py
========================================================================================
"""

import sys
import os
import time
import unittest

DIR = os.path.dirname(os.path.abspath(__file__))
if DIR not in sys.path:
    sys.path.insert(0, DIR)

REPO_ROOT = os.path.abspath(os.path.join(DIR, "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

def run_suite():
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    from test_tier1_feature_coverage import TestTier1FeatureCoverage
    from test_tier2_boundary_corner import TestTier2BoundaryCorner
    from test_tier3_cross_feature import TestTier3CrossFeature
    from test_tier4_real_world import TestTier4RealWorldScenarios

    suite.addTests(loader.loadTestsFromTestCase(TestTier1FeatureCoverage))
    suite.addTests(loader.loadTestsFromTestCase(TestTier2BoundaryCorner))
    suite.addTests(loader.loadTestsFromTestCase(TestTier3CrossFeature))
    suite.addTests(loader.loadTestsFromTestCase(TestTier4RealWorldScenarios))

    print("=" * 88)
    print(" PULSO GOVERNMENT WORKSPACE E2E TEST SUITE (TIERS 1-4)")
    print("=" * 88)
    print(f" Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    print(" Suites loaded:")
    print("   - Tier 1: Core Feature Coverage (Features 1-31, >=5 tests each)")
    print("   - Tier 2: Boundary & Corner Cases (Features 1-31, >=5 tests each)")
    print("   - Tier 3: Cross-Feature Interactions (10 End-to-End Workflows)")
    print("   - Tier 4: Real-World Scenarios (5 Municipal Operational Workloads)")
    print("-" * 88)

    start_time = time.time()
    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)
    elapsed = time.time() - start_time

    total = result.testsRun
    failed = len(result.failures)
    errored = len(result.errors)
    passed = total - (failed + errored)
    pass_pct = (passed / total) * 100.0 if total > 0 else 0.0

    print("=" * 88)
    print(" TEST EXECUTION SUMMARY")
    print("=" * 88)
    print(f" Total Tests Run:  {total}")
    print(f" Passed:           {passed} ({pass_pct:.1f}%)")
    print(f" Failures:         {failed}")
    print(f" Errors:           {errored}")
    print(f" Total Duration:   {elapsed:.2f}s")
    print("=" * 88)

    if failed == 0 and errored == 0:
        print(" >>> ALL E2E TEST TIERS PASSED WITH 100% SUCCESS RATE! <<<")
        return 0
    else:
        print(" >>> TEST SUITE COMPLETED WITH FAILURES. <<<")
        return 1

if __name__ == "__main__":
    sys.exit(run_suite())
