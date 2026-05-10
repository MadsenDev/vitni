# Review Workspace

Switch to Review from the workspace switcher.

## Purpose

Review is where you make deliberate decisions about the evidence. You work through assertions one by one, examining what each claims, where it came from, and whether it holds up. Review is how you get from "data that might be right" to "a case that is defensible."

## Review Queue

Assertions are shown in priority order:

1. **Needs review** — unreviewed assertions, shown first
2. **Disputed** — assertions you have flagged as questionable
3. **Weakly supported** — accepted assertions with only a single unverified source
4. **No sources** — assertions with no source attached
5. **Recently reviewed** — recently processed assertions for reference

## Reviewing an Assertion

Select an assertion from the queue. The Inspector shows:

- The entity it belongs to and which property it concerns
- The claimed value
- The source it comes from (with title, hash if available)
- Other assertions for the same property (corroboration or conflict)
- Evidence strength (no sources / single source / multiple sources)

Make a decision:

| Action | Meaning |
|---|---|
| **Accept** | This claim is correct and should be part of the case |
| **Dispute** | You have reason to question this — flag for further scrutiny |
| **Reject** | This claim is incorrect or inadmissible |

Add a review note to explain your reasoning. Use the navigation arrows to move to the next assertion or jump to the next unreviewed item.

## Node Review Status

Each node in the Investigation workspace shows a small status indicator:

- **Conflict** — two or more accepted assertions make conflicting claims about the same property
- **Needs review** — at least one assertion is still unreviewed
- **Clear** — all assertions reviewed, no conflicts
