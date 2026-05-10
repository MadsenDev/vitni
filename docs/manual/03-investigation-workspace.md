# Investigation Workspace

The Investigation workspace is the main graph canvas. It is the default view when a project opens.

## Layout

The screen is divided into three areas:

- **Left sidebar** — node palette and AI insights tab. Drag node types from here onto the canvas to create new nodes.
- **Canvas** — the graph itself. Nodes are draggable. Relationships appear as edges between them.
- **Right sidebar (Inspector)** — shows details about whatever is selected: node properties, assertions, sources, transforms.

Collapse either sidebar with the arrow buttons on their edges. Drag the divider to resize.

## Adding Nodes

**Drag from the palette** — Drag a node type from the left sidebar onto the canvas.

**Command palette** — Press `⌘K`, type the node type name (e.g. "person"), and select **Add Person**.

**Context menu** — Right-click the canvas.

When a node creation form opens, fill in the fields and confirm. Required fields are marked. Any field value you enter creates an assertion backed by an "import" source.

## Adding Relationships

**Relationship tool** — Activate it from the toolbar or press `⌘K` → *Relationship tool*. Then drag from one node to another on the canvas. A form opens to specify the relationship type and optional properties.

**Direct drag** — With the relationship tool active, dragging from any node's edge initiates a connection.

## Selecting Nodes

- Click a node to select it. The Inspector opens on the right.
- Hold `Shift` and click to add to a selection.
- **Box select** — Enable from the toolbar, then click and drag to draw a selection box.
- **Invert selection** — Selects everything currently unselected.

## Canvas Controls

| Action | How |
|---|---|
| Pan | Click and drag on empty canvas |
| Zoom | Scroll wheel |
| Fit all nodes | `Ctrl+Shift+F` or Command Palette → *Fit to screen* |
| Zoom to selection | `Ctrl+Shift+Z` |
| Center selection | `Ctrl+Shift+C` |
| Align selected left | Toolbar → align left |
| Align selected top | Toolbar → align top |

## Layout Presets

The **Layout** button in the toolbar runs an automatic arrangement algorithm:

| Preset | Description |
|---|---|
| Readable map | Force-directed with overlap prevention. Good general purpose layout. |
| Chain / flow | Directed acyclic graph. Good for showing flows and hierarchies. |
| Focus rings | Concentric rings. Useful for showing centrality around a key entity. |
| Tidy grid | Uniform grid. Good for large flat sets of entities. |

Layouts can run on the full graph or on the current selection only.

## Filters

Click the **Filter** button in the toolbar to open the filter panel. Filter by node type to hide or show specific categories. The *Sources only* toggle narrows the graph to nodes that have at least one attached source.
