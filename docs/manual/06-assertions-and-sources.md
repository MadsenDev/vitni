# Assertions and Sources

## What an Assertion Is

An assertion is a single factual claim: *entity X has property Y equal to value Z, according to source S, with confidence C*.

Every field value on every node is an assertion. If you type a phone number into a person's record, Vitni stores: *person.phone = "+47 400 00 000", source = manual entry, confidence = unverified*.

You can have **multiple assertions for the same property** from different sources. This is intentional — it captures conflicting information rather than forcing you to pick one upfront.

## Confidence Levels

| Level | Meaning |
|---|---|
| Verified | Confirmed by a reliable, corroborating source |
| Asserted | Stated by a source but not independently confirmed |
| Unverified | Noted or suspected, not yet backed by a source |

## Adding Assertions Manually

Select a node, open the Inspector, and click **Add Assertion**. Choose the property path, enter the value, select or create a source, and set confidence.

## Sources

Every assertion links to exactly one source. When you add a source:

- Give it a meaningful title (e.g. "WHOIS export 2025-01-10", "Interview notes — Smith")
- Attach a file if one exists. Vitni calculates a SHA-256 hash of the file on import for later integrity checking.
- Set the source kind: file, upload, import, or transform output.

Sources are shared across all assertions that come from the same origin. You do not need to re-enter source details for each assertion from the same document.

## Viewing Assertions on a Node

Select any node. The Inspector panel on the right shows all assertions for that node, grouped by property. For each property you can see: the current accepted value, all competing claims, source titles, confidence levels, and review state.
