# Feedback Template: Adapter Families and Client Ports

Use this template if you want a structured response.

## 1. High-level reaction

- What in the seed feels right?
- What feels overfit, underfit, or still blurry?

## 2. Server-side adapter-family proposal

- List your preferred 5-7 adapter families.
- For each one, say whether it belongs mostly in:
  - stable core
  - installable plugin space
  - mixed / unclear

## 3. Client-side architecture proposal

- How should client apps be split into:
  - app core
  - capability ports
  - provider adapters
  - storage/search adapters
  - policy/orchestration

## 4. Pressure-test clients

- Which client is the best speech-heavy pressure test?
- Which client is the best docs/rules-heavy pressure test?
- Which client most risks misleading the architecture if treated as “normal”?

## 5. Where I disagree

- Name at least one important disagreement or uncertainty you think should stay
  open for now.

## 6. Suggested next move

- What should happen next?
  - another discussion round
  - a client-mirror discussion
  - a coding/testing cleanup sprint
  - something else
