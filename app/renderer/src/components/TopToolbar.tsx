import { FaLink, FaVectorSquare, FaThLarge, FaBullseye, FaProjectDiagram, FaAlignLeft, FaAlignJustify, FaRetweet } from 'react-icons/fa';

interface TopToolbarProps {
  relationshipTool: {
    isActive: boolean;
    selectedType: any | null; // kept for compatibility but unused
    sourceNode: { id: string; label: string } | null;
    targetNode: { id: string; label: string } | null;
  };
  onRelationshipToolActivate: () => void;
  onRelationshipToolDeactivate: () => void;
  onToggleBoxSelect: () => void;
  onLayoutGrid: () => void;
  onLayoutConcentric: () => void;
  onLayoutCose: () => void;
  onAlignLeft: () => void;
  onAlignTop: () => void;
  onInvertSelection: () => void;
}

export function TopToolbar({
  relationshipTool,
  onRelationshipToolActivate,
  onRelationshipToolDeactivate,
  onToggleBoxSelect,
  onLayoutGrid,
  onLayoutConcentric,
  onLayoutCose,
  onAlignLeft,
  onAlignTop,
  onInvertSelection
}: TopToolbarProps) {
  const toggleRelationshipMode = () => {
    if (relationshipTool.isActive) onRelationshipToolDeactivate();
    else onRelationshipToolActivate();
  };

  return (
    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-3">
      <div className="flex items-center space-x-6">
        <h1 className="text-lg font-semibold text-white">Investigation Workspace</h1>
        <div className="h-6 w-px bg-slate-700"></div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-400 mr-1">Tools:</span>
          <button
            onClick={toggleRelationshipMode}
            className={`p-2 rounded-md transition-all duration-200 ${relationshipTool.isActive ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'}`}
            title="Relationship tool (drag from one node to another)"
          >
            <FaLink className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleBoxSelect}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title="Toggle box selection"
          >
            <FaVectorSquare className="w-4 h-4" />
          </button>
          <div className="h-5 w-px bg-slate-700 mx-1"></div>
          <button
            onClick={onLayoutGrid}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title="Grid layout"
          >
            <FaThLarge className="w-4 h-4" />
          </button>
          <button
            onClick={onLayoutConcentric}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title="Concentric layout"
          >
            <FaBullseye className="w-4 h-4" />
          </button>
          <button
            onClick={onLayoutCose}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title="COSE layout"
          >
            <FaProjectDiagram className="w-4 h-4" />
          </button>
          <div className="h-5 w-px bg-slate-700 mx-1"></div>
          <button
            onClick={onAlignLeft}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title="Align left (selected)"
          >
            <FaAlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onAlignTop}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title="Align top (selected)"
          >
            <FaAlignJustify className="w-4 h-4 transform rotate-90" />
          </button>
          <div className="h-5 w-px bg-slate-700 mx-1"></div>
          <button
            onClick={onInvertSelection}
            className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title="Invert selection"
          >
            <FaRetweet className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {relationshipTool.isActive && (
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-slate-400">Relationship mode</span>
            {relationshipTool.sourceNode && (
              <>
                <span className="text-slate-500">from</span>
                <span className="text-green-400">{relationshipTool.sourceNode.label}</span>
              </>
            )}
            {relationshipTool.targetNode && (
              <>
                <span className="text-slate-500">to</span>
                <span className="text-green-400">{relationshipTool.targetNode.label}</span>
              </>
            )}
          </div>
        )}
        <div className="text-sm text-slate-400">Drag nodes • Relationship: drag A → B • Select to inspect</div>
      </div>
    </div>
  );
}
