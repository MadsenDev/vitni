# Vitni

Vitni is a local-first investigation workspace for private investigators and serious casework.

It helps you map people, organizations, accounts, devices, events, locations, evidence, and claims in one place, while keeping facts tied to sources, reviewable as assertions, and ready to export into a usable report.

`(screenshot coming soon)`

## Why Vitni

Most investigation tools are good at pivots and graphs, but weak at disciplined casework.

Vitni is built around a different idea:

- Keep the case local by default.
- Treat assertions as evidence-backed facts, not just loose notes on nodes.
- Give investigators dedicated workspaces for mapping, chronology, and review.
- Make reporting and source tracking part of the product, not an afterthought.
- Keep AI optional and subordinate to structured facts.

Vitni is not trying to be a transform-count arms race. It is trying to be a practical, defensible, evidence-first investigation environment.

## Who It’s For

Vitni is aimed first at:

- private investigators
- researchers doing case-driven investigative work
- small teams who need a local-first case file rather than a cloud SaaS workflow
- investigators who want graphing, review, timeline, and reporting in the same desktop app

## What Vitni Does

Vitni currently includes:

- **Investigation workspace**
  - A full graph workspace for building and navigating case structure.
- **Timeline workspace**
  - A dedicated chronology view for event-driven investigation work.
- **Review workspace**
  - A full-page review mode for working through assertions with evidence context.
- **Source-backed assertions**
  - Facts can be attached to sources, reviewed, disputed, rejected, or accepted.
- **Assertion-led field workflow**
  - Important node fields can be promoted into facts and synced back from stronger evidence.
- **Artifacts and media**
  - Documents, identity documents, and media get richer inspector treatment than generic fields.
- **Remote tools**
  - Node-specific tools such as WHOIS, DNS, and IP lookup.
- **CSV import**
  - Bring structured records into an existing case instead of building everything manually.
- **Reports**
  - Export the case into usable report output.
- **Optional AI**
  - Local and cloud AI options are available, but always as optional helpers.
- **Packaging**
  - Linux and Windows builds can be packaged from this repo.

`(screenshot coming soon)`

## Core Workflow

Vitni is designed around three main workspaces:

### Investigation

Use the graph to map the structure of the case:

- people
- organizations
- accounts
- devices
- locations
- transactions
- evidence
- events

The graph is for understanding how the case fits together, not just for drawing links.

### Timeline

Use the timeline to organize chronology and sequence:

- incidents
- communications
- movement
- financial activity
- evidence in time

This helps turn a graph into a narrative.

### Review

Use Review to process assertions directly:

- what still needs review
- what is weakly supported
- what is disputed
- what has no source support

This is where Vitni starts to feel more like a casework tool than a link chart.

## Get Started

The primary path is to run a packaged desktop build.

### Build packaged apps

From the repository root:

```bash
npm install
npm run package:linux
npm run package:win
```

This produces packaged outputs under [`release/`](./release), including:

- Linux AppImage
- Linux tarball
- Windows portable `.exe`
- Windows `.zip`

If you are just trying Vitni, start there before worrying about development mode.

## Open the Sample Case

The fastest way to see what Vitni is for is to open the shipped example case:

[`samples/operation-glass-harbor.vitni`](./samples/operation-glass-harbor.vitni)

Open it through:

- `File -> Open Project`

The sample is meant to show a richer, more realistic investigation with:

- people, organizations, devices, domains, accounts, and transactions
- source-backed assertions
- evidence and media
- saved investigation views
- cyber and financial relationships

If the sample SQLite database has not been generated yet, initialize it locally first:

```bash
cd samples/operation-glass-harbor.vitni
sqlite3 db/case.sqlite < db/case.sqlite.sql
```

Then return to the repo root and open the sample project in the app.

## Build From Source

If you want to run Vitni in development mode:

```bash
npm install
npm run dev
```

Vitni will:

- watch and compile the Electron main process
- watch and compile the preload script
- run the Vite renderer dev server
- launch Electron once everything is ready

### Development notes

- Development mode still supports `PI_DB_KEY` if you want to set it explicitly.
- Packaged builds now handle local database-key generation for normal app usage.
- The main desktop app entrypoint is Electron, with:
  - React in the renderer
  - a context-isolated preload bridge
  - a local SQLite-backed project store

## Useful Commands

```bash
# development
npm run dev

# checks
npm run lint
npm run test:renderer

# builds
npm run build
npm run build:main
npm run build:preload
npm run build:renderer

# packaged apps
npm run package:linux
npm run package:win

# version bump helpers
npm run version:patch
npm run version:minor
npm run version:major
```

## Project Structure

```text
app/
  main/        Electron main process, IPC, persistence, services
  preload/     Context-isolated bridge for the renderer
  renderer/    React UI, workspaces, modals, graph, review, timeline
db/
  migrations/  SQLite schema migrations
shared/        Shared TypeScript types
transforms/    Remote/local tool manifests
samples/       Example Vitni investigation packages
```

## Privacy and Data Model

Vitni is designed to keep investigation work grounded and local-first:

- case data lives locally
- remote tools are explicit actions, not silent background enrichment
- assertions can carry confidence and review state
- AI is optional
- reports can be generated from structured case data, not just ad hoc notes

## Project Status

Vitni is under active development, but it is already a usable desktop application rather than a mockup or concept repo.

Current strengths:

- local-first case handling
- graph + timeline + review in one app
- source-backed assertions
- packaged Linux and Windows builds
- PI-oriented workflow direction

Still evolving:

- deeper import and extraction flows
- more investigation tools
- richer reporting
- continued UX and architecture refinement

`(screenshot coming soon)`

## License

MIT
