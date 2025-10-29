import { useState, useEffect, useMemo } from 'react';
import { relationshipTypes, type RelationshipType } from '../lib/relationshipTypes';

interface RelationshipCreationModalProps {
  isOpen: boolean;
  relationshipType: RelationshipType | null;
  sourceNode: { id: string; label: string } | null;
  targetNode: { id: string; label: string } | null;
  defaultConfidence?: 'unverified' | 'asserted' | 'verified';
  onClose: () => void;
  onCreate: (data: { 
    relationshipType: string; 
    sourceId: string; 
    targetId: string; 
    properties: Record<string, unknown>;
  }) => void;
}

export function RelationshipCreationModal({
  isOpen,
  relationshipType,
  sourceNode,
  targetNode,
  defaultConfidence = 'unverified',
  onClose,
  onCreate
}: RelationshipCreationModalProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedSubtypeId, setSelectedSubtypeId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [confidence, setConfidence] = useState<'verified' | 'asserted' | 'unverified'>(defaultConfidence);
  const [strength, setStrength] = useState<'weak' | 'moderate' | 'strong'>('moderate');

  const selectedType = useMemo(() => {
    return relationshipTypes.find(t => t.id === selectedTypeId) || null;
  }, [selectedTypeId]);

  const availableSubtypes = useMemo(() => selectedType?.subtypes ?? [], [selectedType]);

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setConfidence(defaultConfidence);
      setStrength('moderate');
      // Initialize selection from prop or default to first
      setSelectedTypeId(relationshipType?.id ?? relationshipTypes[0]?.id ?? '');
      const initialType = relationshipTypes.find(t => t.id === (relationshipType?.id ?? relationshipTypes[0]?.id));
      setSelectedSubtypeId(initialType?.subtypes?.[0]?.id ?? '');
    }
  }, [isOpen, relationshipType, defaultConfidence]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId || !sourceNode || !targetNode) return;

    onCreate({
      relationshipType: selectedTypeId,
      sourceId: sourceNode.id,
      targetId: targetNode.id,
      properties: {
        notes: notes.trim() || undefined,
        confidence,
        strength,
        subtype: selectedSubtypeId || undefined,
        created_at: new Date().toISOString()
      }
    });
    
    onClose();
  };

  if (!isOpen || !sourceNode || !targetNode) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-10 h-10 rounded-full ${selectedType?.color ?? 'bg-slate-600'} flex items-center justify-center text-white text-lg`}>
            {selectedType?.icon && <selectedType.icon className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">Create Relationship</h2>
            <div className="mt-2">
              <label className="block text-sm text-slate-300 mb-1">Relationship Type</label>
              <select
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {relationshipTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            {availableSubtypes.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm text-slate-300 mb-1">Subtype</label>
                <select
                  value={selectedSubtypeId}
                  onChange={(e) => setSelectedSubtypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableSubtypes.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-md">
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-300 font-medium">{sourceNode.label}</div>
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full ${selectedType?.color ?? 'bg-slate-600'} flex items-center justify-center text-white text-xs`}>
                {selectedType?.icon && <selectedType.icon className="w-3 h-3" />}
              </div>
              {selectedType?.bidirectional && (
                <span className="text-slate-400">↔</span>
              )}
            </div>
            <div className="text-slate-300 font-medium">{targetNode.label}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="confidence" className="block text-sm font-medium text-slate-300 mb-2">
              Confidence Level
            </label>
            <select
              id="confidence"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as typeof confidence)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="unverified">Unverified</option>
              <option value="asserted">Asserted</option>
              <option value="verified">Verified</option>
            </select>
          </div>

          <div>
            <label htmlFor="strength" className="block text-sm font-medium text-slate-300 mb-2">
              Relationship Strength
            </label>
            <select
              id="strength"
              value={strength}
              onChange={(e) => setStrength(e.target.value as typeof strength)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="weak">Weak</option>
              <option value="moderate">Moderate</option>
              <option value="strong">Strong</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant details about this relationship..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              disabled={!selectedTypeId}
            >
              Create Relationship
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
