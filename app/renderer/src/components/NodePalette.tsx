import { useState } from 'react';
import { nodeTypes, type NodeType, type NodeCategory } from '../lib/nodeTypes/index';
import { 
  FaUser, 
  FaBuilding, 
  FaGlobe, 
  FaSearch, 
  FaChevronDown, 
  FaChevronRight 
} from 'react-icons/fa';

// Define categories
const categories: NodeCategory[] = [
  {
    id: 'people',
    label: 'People & Roles',
    description: 'Individuals, suspects, witnesses, victims',
    icon: FaUser,
    color: 'text-blue-400'
  },
  {
    id: 'organizations',
    label: 'Organizations',
    description: 'Companies, agencies, institutions',
    icon: FaBuilding,
    color: 'text-green-400'
  },
  {
    id: 'technology',
    label: 'Technology',
    description: 'Digital devices, accounts, platforms',
    icon: FaGlobe,
    color: 'text-purple-400'
  },
  {
    id: 'evidence',
    label: 'Evidence & Investigation',
    description: 'Documents, communications, locations, cases',
    icon: FaSearch,
    color: 'text-orange-400'
  }
];

interface NodePaletteProps {
  onNodeDragStart: (nodeType: NodeType, event: React.DragEvent) => void;
}

export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['people']));

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleDragStart = (nodeType: NodeType, event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      nodeTypeId: nodeType.id,
      position: { x: event.clientX, y: event.clientY }
    }));
    event.dataTransfer.effectAllowed = 'copy';
    onNodeDragStart(nodeType, event);
  };

  const getNodesByCategory = (categoryId: string) => {
    return nodeTypes.filter(node => node.category === categoryId);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-900 border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white mb-2">Node Types</h2>
        <p className="text-sm text-slate-400">
          Drag nodes to the graph to create entities
        </p>
      </div>

      <div className="space-y-1 p-2">
        {categories.map((category) => {
          const nodes = getNodesByCategory(category.id);
          const isExpanded = expandedCategories.has(category.id);
          
          return (
            <div key={category.id} className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <category.icon className={`w-4 h-4 ${category.color}`} />
                  <div className="text-left">
                    <div className="text-sm font-medium text-white">
                      {category.label}
                    </div>
                    <div className="text-xs text-slate-400">
                      {nodes.length} types
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <FaChevronDown className="w-3 h-3 text-slate-400" />
                ) : (
                  <FaChevronRight className="w-3 h-3 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-700 bg-slate-900">
                  {nodes.map((nodeType) => (
                    <div
                      key={nodeType.id}
                      draggable
                      onDragStart={(e) => handleDragStart(nodeType, e)}
                      className="flex items-center space-x-3 p-3 hover:bg-slate-800 cursor-grab active:cursor-grabbing transition-colors border-b border-slate-800 last:border-b-0"
                    >
                      <div className={`w-8 h-8 rounded-full ${nodeType.color} flex items-center justify-center text-white text-sm flex-shrink-0`}>
                        <nodeType.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {nodeType.label}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {nodeType.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}