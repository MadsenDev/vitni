# Operation Glass Harbor Demo Project

This directory contains a ready-to-open investigation bundle that exercises the
new project-folder layout, manifest metadata, and hashed media workflow.
Because the repository cannot ship binary payloads, regenerate the database and
image attachment locally before launching Vitni.

## Prepare the database

```bash
cd samples/operation-glass-harbor.vitni
sqlite3 db/case.sqlite < db/case.sqlite.sql
```

If you want to test SQLCipher integration, wrap the generated database with
your own key afterwards and export `PI_DB_KEY` to the chosen value.

## Restore the hashed PNG attachment

```bash
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=' \
  | base64 -d > attachments/52/8d/528d4f1e1e4be74f18d29cea6837e8559215577e913dcca6d8b1e38a80e27c1d.png
```

This command recreates the `Dockside surveillance still` referenced by the
`src-surveillance` record in `db/case.sqlite.sql` and aligns the file digest with
the manifest entry.

## Open the project

1. From the repository root export `PI_DB_KEY=glass-harbor-demo`.
2. Launch the Vitni app and choose **File → Open Project**.
3. Select this `operation-glass-harbor.vitni` directory.
4. Explore the seeded entities, relationships, assertions, and media assets.

Included media:

- `Harbor Freight Logistics - Invoice NW-2291` (text attachment hashed as
  `a8722cae02b4646c8c90dcf2ffa28f49107e5ac710e1af5fb18ef4c0c91a5599`)
- `Dockside surveillance still` (regenerate from the Base64 snippet above to
  match hash `528d4f1e1e4be74f18d29cea6837e8559215577e913dcca6d8b1e38a80e27c1d`)
- Redacted board strategy transcript stored under `sources/board-strategy-thread.txt`

The directory also ships with empty placeholders for exports, snapshots,
transform logs, cache, and temporary files so the on-disk layout matches
projects created by the application.
