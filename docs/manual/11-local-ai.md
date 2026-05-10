# Local AI Insights

The **AI tab** in the left sidebar provides automated analysis of the investigation graph. This runs entirely on your device — no data leaves unless you have the Cloud AI option enabled for report export.

## Enabling Local AI

Go to **Settings → Local AI** and enable it. Vitni uses Ollama to run a local language model. Ollama must be installed and running separately.

## What the AI Analyses

**Summary** — A narrative overview of the current state of the graph: entity count, relationship density, overall complexity, and coverage.

**Leads** — Groups entities that may need work:
- *Orphaned entities* — nodes with no connections to anything else. Likely incomplete data entry or entities that don't yet have their context mapped.
- *Incomplete entities* — nodes missing required or important properties (e.g. a Person with no name, a Domain with no registrar).

**Duplicate Watch** — Flags possible duplicate entities by comparing:
- Exact email, phone, handle, or domain matches across different nodes
- Similar names (normalised)
- Shared unique identifiers (national ID, passport number)

Duplicates are shown grouped with the reason for the match. Investigate before merging — the match may be legitimate (two people sharing a phone) or an error (the same entity entered twice).
