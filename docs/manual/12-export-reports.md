# Export Reports

Open the export dialog from **File → Export Report** or via the Command Palette.

## Report Templates

| Template | Contents |
|---|---|
| **Full Report** | All entities, all relationships, all accepted assertions, timeline of dated events, and a narrative summary |
| **Selection** | Only the currently selected nodes and their immediate connections |
| **Timeline** | Chronological list of events, communications, and transactions |
| **Person Profile** | Deep profile of one person — all their connections, assertions, and evidence |

## AI Narrative

Enable **Use AI narrative** to have the report's prose summary written by a language model. Two options:

- **Local (Ollama)** — Stays on device. Requires Ollama to be running with a suitable model.
- **Cloud (OpenAI)** — Sends the relevant case data to OpenAI's API for this export only. Data is not stored by Vitni after export.

## Attachments

Enable **Include attachments** to bundle all source files into the export package.
