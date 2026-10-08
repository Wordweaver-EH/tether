# Development history

1. Before implementation/evaluation, wrote PREDECLARATION.md and hashed all 516
   original files. DECLARATION-HASHES.txt and DECLARED-AT.txt retain the declaration
   identity and local timestamp. No match data supplied fixture coordinates
2. Wrote the standalone prototype and fixed synthetic fixtures, then captured
   BEFORE-EVALUATION-SOURCE-HASHES.txt and EVALUATION-READY-AT.txt
3. First execution (results/run-001, TEST-OUTPUT-run-001.txt): 21/22 groups passed.
   F04 failed strict JavaScript equality because the mathematically zero lateral
   x component was -0 rather than +0. No warning, trajectory, movement-side or
   clearance expectation failed. The entire first result remains in
   results/run-001/; the original source is preserved in
   revisions/pre-f04-zero-normalization/
4. Repaired the prototype's vector constructor to canonicalize zero coordinates
   to +0. No fixture/assertion, parameter, horizon, detector or movement rule was
   changed. The identical suite is rerun into a new results directory
5. Second execution (results/run-002): 22/22 passed, including all original-file
   hashes. Before final review, improved fixture realism without changing any
   expected result: a visible HELD spear now comes with its matching visible
   opponent body; the visible EMBEDDED-only fixture is on a wall instead of in
   midair; one evaluator-only hidden-world position now uses exact constant-speed
   arithmetic for its declared recall time/endpoint. Prior fixture sources are
   preserved in revisions/pre-fixture-realism-corrections/. The prototype,
   declaration, fixture groups and pass criteria are unchanged
6. Third execution (results/run-003) passes 22/22 with the final fixture-realism
   version. A fresh fourth execution (results/run-004-reproduction) also passes
   22/22 and produces byte-identical RESULTS.json. The checks/criteria were
   declared before implementation; final executable fixtures were written later
   and were not themselves frozen by the original declaration

This is synthetic implementation debugging against predeclared checks. It is not
outcome tuning. No game match, saved-outcome replay, or full controller was run.
