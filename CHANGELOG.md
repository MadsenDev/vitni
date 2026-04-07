# Changelog

All notable changes to Vitni should be documented in this file.

This project loosely follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses the version defined in `package.json`.

## [Unreleased]

## [0.5.0]

### Changed

- Expanded personalization with a larger built-in preset library, including true light themes.
- Reworked the personalization settings into a preset-first experience with clearer advanced theme controls.
- Made the graph canvas and shared shell styling respond more cleanly to light and dark theme modes.
- Updated the investigation workspace sidebars so light themes no longer leave the floating panels stuck in a dark shell.
- Retuned the welcome screen, node launcher rows, and top toolbar so light themes use first-class surface and text styling instead of dark-mode carryovers.
- Added a shared themed primitive layer and migrated major workflow surfaces like Review, Timeline, and CSV import onto theme-token-based panels, cards, inputs, and buttons.
- Continued the theme-system migration across the inspector internals, settings scaffolding, media-library shell, and welcome-screen atmosphere so more of the app now follows the active preset instead of falling back to dark-biased component styling.
- Migrated the personalization controls and the media-library filtering/upload workflow further onto shared themed inputs, cards, buttons, and sections so light mode is no longer split between a themed shell and dark-only inner controls.
- Continued the media-library migration through its result cards, list view, detail sidebar, and asset actions, and brought more of the settings shell/navigation onto theme tokens so the app’s light-mode chrome is more consistent end to end.
- Migrated the AI, advanced, and footer sections of Settings onto the shared theme primitives as well, so setup/status flows and device configuration controls now match the active preset instead of reverting to dark-only panels and buttons.
- Migrated common workflow overlays and forms like export, consent, search, filtering, creation/deletion modals, the location picker, and the add-fact form onto shared theme tokens and primitives, reducing the app’s remaining dependency on dark-only styling.

## [0.1.3]

### Added

- Dedicated `Review` workspace as a top-level mode alongside `Investigation` and `Timeline`.
- Assertion-first field workflow, including field-to-fact promotion and field-level fact controls.
- Structured CSV import into an existing case.
- OpenStreetMap-based location preview and map picker for location nodes.
- Artifact-specific inspector treatment for media, documents, and identity documents.
- Node-specific remote tools for domain, website, and IP investigation lookups.
- Personalization controls for colors, canvas background, background images, blur, and icon packs.
- Local AI model tiers, self-test flow, and optional cloud AI report generation.
- Packaged Linux and Windows builds, including AppImage and Windows portable outputs.

### Changed

- Repositioned Vitni as a local-first investigation workspace with PI-focused workflows.
- Reworked the graph workspace so sidebars float as overlays instead of resizing the canvas.
- Redesigned the node launcher/sidebar and aligned the inspector structure with it.
- Improved graph layout quality using stronger layout engines and smarter edge decluttering.
- Reworked review from an inspector/sidebar add-on into a dedicated workflow surface.
- Rewrote the project README as a product-style front page for Vitni.
- Cleaned up lint/type issues across the codebase and added orientation comments to major modules.

### Fixed

- Packaged-app startup issues around renderer path resolution, file-based asset loading, and local database key handling.
- Local AI setup behavior around runtime detection, installer fallbacks, model detection, and noisy error states.
- Titlebar and overlay stacking issues in the floating workspace layout.
- Filter usability by adding an explicit `Show all` action.

## [0.1.2]

### Changed

- Version bump helper scripts were added for patch, minor, and major releases.

## [0.1.1]

### Changed

- Packaged Linux and Windows artifacts were rebuilt after packaging and startup fixes.
- Canvas personalization gained separate background-image blur control.

## [0.1.0]

### Added

- Initial packaged Vitni desktop release.
