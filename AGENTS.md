# AGENTS.md

This repository expects agents and automation to keep project-facing documentation current.

## Required workflow notes

- If you make a user-visible change, update [`CHANGELOG.md`](./CHANGELOG.md) in the same task.
- Add new entries under `## [Unreleased]` unless you are explicitly cutting a release version.
- When a version is bumped for release, move the relevant `Unreleased` entries into the new version section.
- Do not leave major feature work undocumented.

## Changelog expectations

Use short, high-signal bullets grouped under standard headings when relevant:

- `Added`
- `Changed`
- `Fixed`
- `Removed`

Keep entries user-facing. Prefer describing behavior and capability changes over internal refactors unless the refactor materially affects contributors or packaging.

## Documentation expectations

- Keep [`README.md`](./README.md) aligned with the current product, not an earlier prototype state.
- If you change packaging, startup, onboarding, or primary workflows, review the README and changelog together.
