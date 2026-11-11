# SCE-DS2-07G — Batch 8 closure queue

| Metric | Value |
| --- | ---: |
| Fully VERIFIED | 0 / 214 |
| Evidence contract | 2026-11-11-batch-10 |

## Queue by root cause

### FULLY_VERIFIED

- **Count:** 0

### FIXTURE_ENVIRONMENT

- **Count:** 0

### ACCESSIBILITY_AXE_FAIL

- **Count:** 75

### ACCESSIBILITY_AXE_INCOMPLETE

- **Count:** 128

### ACCESSIBILITY_FIXTURE_UNPROBED

- **Count:** 11

### VISUAL_REVIEW_REQUIRED

- **Count:** 177

### VISUAL_HEURISTIC_FAIL

- **Count:** 14

### FUNCTIONAL_MUTATION_WORKFLOW

- **Count:** 65

### FUNCTIONAL_READ_ONLY_GAP

- **Count:** 11

### RESPONSIVE_FAIL

- **Count:** 11

### CONFIRMED_PRODUCT_DEFECT

- **Count:** 11


## Recommended closure sequence

1. FIXTURE_ENVIRONMENT — disposable verification DB + tenant-scoped seeds (11 routes)
2. ACCESSIBILITY_AXE_FAIL — shared token/label fixes then targeted reassess (66 routes)
3. ACCESSIBILITY_AXE_INCOMPLETE — manual contrast review + keyboard supplement recording
4. VISUAL_REVIEW_REQUIRED — agent screenshot review per viewport archetype
5. FUNCTIONAL_MUTATION_WORKFLOW — isolated DB mutation harness or explicit baseline debt
6. FULLY_VERIFIED — only when all six dimensions PASS with screenshotReviewed
