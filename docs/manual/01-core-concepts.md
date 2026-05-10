# Core Concepts

## The Knowledge Graph

A Vitni project is built around a **knowledge graph** — a network of **nodes** (entities) connected by **relationships** (edges). A node might be a person, a domain name, a bank account, or a piece of evidence. A relationship describes how two nodes are connected: a person *owns* a domain, a phone *communicated with* another phone, a suspect is *involved in* an incident.

The graph is not a diagram for presenting to others. It is your working memory for the investigation. You build it as you go, revise it as new information arrives, and interrogate it to find gaps.

## Assertions

Every piece of data about a node is an **assertion** — a claim about a property of an entity, backed by a source. When you record that a person's email is `john@example.com` based on a spreadsheet you imported, Vitni creates an assertion: *entity=John, property=email, value=john@example.com, source=the spreadsheet, confidence=unverified*.

Assertions are separate from nodes for a reason: two different sources can make conflicting claims about the same property. Vitni tracks both, flags the conflict, and lets you decide which to accept.

## Sources

A **source** is the origin of a piece of information. It might be a document you imported, a file you attached, or data returned by an automated transform. Every assertion must have a source. Sources have an optional SHA-256 hash for integrity verification.

## Review

The **Review workspace** is where you process assertions one by one, deciding what actually belongs in the case. You accept, dispute, or reject each claim. Review progress is tracked per-node so you can see which parts of the graph are solid evidence and which are still open questions.
