# Operation Circuit Ledger Showcase Project

This directory now contains the primary sample investigation for Vitni. It is a
larger cyber/financial case designed to showcase graph navigation, evidence
review, media previews, saved views, search, and cross-domain pivots.

The repository still does not ship a generated encrypted database, so create the
SQLite file locally before opening the project.

## Prepare the database

```bash
cd samples/operation-glass-harbor.vitni
sqlite3 db/case.sqlite < db/case.sqlite.sql
```

If you want to test SQLCipher integration, wrap the generated file afterwards
and export the same key you intend to use at runtime.

## Open the project

1. From the repository root export `PI_DB_KEY=circuit-ledger-demo`.
2. Launch Vitni and choose **File → Open Project**.
3. Select this `operation-glass-harbor.vitni` directory.
4. Explore the saved views, recent evidence, and digital/financial pivots.

## What the sample demonstrates

- A synthetic settlement-diversion case spanning people, organizations, digital
  infrastructure, financial accounts, transactions, and evidence records.
- Shipped media under the modern `media/` tree, including previewable SVG
  assets and text-based document sources.
- Source-backed assertions that drive search, evidence review, and reporting.
- Seeded project metadata and saved views so the case feels curated on first
  open instead of looking like raw database rows.

## Suggested exploration path

1. Open the saved view `Fraud Chain` to follow the money from the reserve
   account into the shell account and crypto off-ramp.
2. Open the saved view `Digital Access Trail` to inspect the domain, portal,
   burner device, IP, and VPS.
3. Turn on **Show node images** to see the seeded portrait and portal capture.
4. Use `Ctrl+F` to search for identifiers such as `CL-8831`,
   `argentpulse-payments.com`, `185.220.101.44`, or `0xBC84`.
