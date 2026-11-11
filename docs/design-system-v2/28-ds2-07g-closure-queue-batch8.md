# SCE-DS2-07G — Batch 8 closure queue

| Metric | Value |
| --- | ---: |
| Fully VERIFIED | 0 / 214 |
| Evidence contract | 2026-11-11-batch-8 |

## Queue by root cause

### FULLY_VERIFIED

- **Count:** 0

### FIXTURE_ENVIRONMENT

- **Count:** 11

### ACCESSIBILITY_AXE_FAIL

- **Count:** 66

### ACCESSIBILITY_AXE_INCOMPLETE

- **Count:** 137

### ACCESSIBILITY_FIXTURE_UNPROBED

- **Count:** 0

### VISUAL_REVIEW_REQUIRED

- **Count:** 160

### VISUAL_HEURISTIC_FAIL

- **Count:** 25

### FUNCTIONAL_MUTATION_WORKFLOW

- **Count:** 67

### FUNCTIONAL_READ_ONLY_GAP

- **Count:** 1

### RESPONSIVE_FAIL

- **Count:** 0

### CONFIRMED_PRODUCT_DEFECT

- **Count:** 0


## Recommended closure sequence

1. FIXTURE_ENVIRONMENT — disposable verification DB + tenant-scoped seeds (11 routes)
2. ACCESSIBILITY_AXE_FAIL — shared token/label fixes then targeted reassess (66 routes)
3. ACCESSIBILITY_AXE_INCOMPLETE — manual contrast review + keyboard supplement recording
4. VISUAL_REVIEW_REQUIRED — agent screenshot review per viewport archetype
5. FUNCTIONAL_MUTATION_WORKFLOW — isolated DB mutation harness or explicit baseline debt
6. FULLY_VERIFIED — only when all six dimensions PASS with screenshotReviewed
