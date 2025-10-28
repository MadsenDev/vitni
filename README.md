# Private Investigation Graph Tool

A local-first Electron application for secure private investigations. The tool keeps every assertion tied to a verifiable source, encrypts data on disk with SQLCipher-compatible pragmas, and requires explicit consent for any network transforms.

## Features

- 🔐 **Encrypted local database** via SQLCipher-compatible `better-sqlite3` connection and migration runner.
- 🧭 **Graph canvas** built with Cytoscape.js for mapping entities and relationships.
- 📑 **Source-backed assertions** enforced through the UI when creating new entities.
- 🔌 **Secure IPC layer** exposing audited database operations to the renderer.
- 🔁 **Transform registry** that distinguishes between local and remote actions with consent prompts.
- 🧠 **AI integration hooks** ready for future local LLM workflows (see `ai/`).

## Getting Started

```bash
npm install
npm run dev
```

The dev script compiles the main/preload processes, launches Vite for the renderer, and starts Electron once builds are ready. For production builds run:

```bash
npm run build
npm start
```

## Project Structure

```
app/
  main/        # Electron main process + IPC + persistence
  preload/     # Context-isolated bridge exposing safe APIs
  renderer/    # React + Tailwind UI powered by Vite
ai/            # Local AI integration entry points
transforms/    # Transform manifests (local + remote)
db/migrations/ # SQL schema migrations for SQLCipher
shared/        # Shared TypeScript types
```

## Privacy Guardrails

- Every save flow requires attaching a source reference and confidence level.
- Remote transforms present a consent modal describing destination + payload.
- Speculative/unverified assertions render with dashed borders and muted colors.
- Audit log captures each manual action for future review.

## Next Steps

- Implement runtime enforcement of SQLCipher key management.
- Expand assertion/source queries with pagination and filtering.
- Wire up local AI helpers in `ai/` for dedupe + summarisation without hallucinations.
- Add unit tests and automated linting via CI.
