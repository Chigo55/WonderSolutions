---
description: Review an existing deliverable (code/template/rule) standalone using the corresponding agent's review mode.
argument-hint: "Path or description of the target to review (e.g. src/.../UserService.java)"
---

# /wh-review

## 1. Determine Target
- Analyze the path or description provided as the argument and determine the review type:
  - Code (`.java`/`.kt`/`.jsp`, etc.) → **developer** (review)
  - Template (`.claude/templates/**`) → **templater** (review)
  - Rule (`rules/**`) → **ruler** (review)
- If ambiguous, ask the user once to confirm.

## 2. Execute Review
- Invoke the corresponding agent in review mode. The invoked agent loads the relevant rule checklist and checks against it.

## 3. Results
- Present passed/violated items along with modification recommendations.
