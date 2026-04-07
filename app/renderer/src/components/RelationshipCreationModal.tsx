import { useState, useEffect, useMemo } from 'react';
import { relationshipTypes, isRelationshipAllowed, type RelationshipType } from '../lib/relationshipTypes';
import { ThemedButton, ThemedCard, ThemedInput, ThemedPanel, ThemedSelect, ThemedTextarea } from '@renderer/features/personalization/primitives';

interface RelationshipCreationModalProps {
  isOpen: boolean;
  relationshipType: RelationshipType | null;
  sourceNode: { id: string; label: string; type: string } | null;
  targetNode: { id: string; label: string; type: string } | null;
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
  const [dateStr, setDateStr] = useState<string>('');

  const availableTypes = useMemo(() => {
    return relationshipTypes.filter((type) => isRelationshipAllowed(type, sourceNode?.type, targetNode?.type));
  }, [sourceNode?.type, targetNode?.type]);

  const selectedType = useMemo(() => {
    return availableTypes.find(t => t.id === selectedTypeId) || null;
  }, [availableTypes, selectedTypeId]);

  const availableSubtypes = useMemo(() => selectedType?.subtypes ?? [], [selectedType]);

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setConfidence(defaultConfidence);
      setStrength('moderate');
      setDateStr('');
      const initialId =
        relationshipType && isRelationshipAllowed(relationshipType, sourceNode?.type, targetNode?.type)
          ? relationshipType.id
          : availableTypes[0]?.id ?? '';
      setSelectedTypeId(initialId);
      const initialType = availableTypes.find(t => t.id === initialId);
      setSelectedSubtypeId(initialType?.subtypes?.[0]?.id ?? '');
    }
  }, [availableTypes, defaultConfidence, isOpen, relationshipType, sourceNode?.type, targetNode?.type]);

  useEffect(() => {
    if (!selectedType) {
      setSelectedSubtypeId('');
      return;
    }
    if (!availableSubtypes.some((subtype) => subtype.id === selectedSubtypeId)) {
      setSelectedSubtypeId(availableSubtypes[0]?.id ?? '');
    }
  }, [availableSubtypes, selectedSubtypeId, selectedType]);

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
        created_at: new Date().toISOString(),
        date: dateStr || undefined
      }
    });
    
    onClose();
  };

  if (!isOpen || !sourceNode || !targetNode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--overlay-backdrop)' }}>
      <ThemedPanel elevated className="w-full max-w-md mx-4 rounded-[28px] p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-10 h-10 rounded-full ${selectedType?.color ?? 'bg-slate-600'} flex items-center justify-center text-white text-lg`}>
            {selectedType?.icon && <selectedType.icon className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Create Relationship</h2>
            <div className="mt-2">
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Relationship Type</label>
              <ThemedSelect
                value={selectedTypeId}
                onChange={(e) => setSelectedTypeId(e.target.value)}
                className="w-full rounded-md"
              >
                {availableTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </ThemedSelect>
            </div>
            {availableTypes.length === 0 && (
              <p className="mt-3 text-sm text-amber-300">
                No canonical relationship families are valid for {sourceNode.type} to {targetNode.type}.
              </p>
            )}
            {availableSubtypes.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Subtype</label>
                <ThemedSelect
                  value={selectedSubtypeId}
                  onChange={(e) => setSelectedSubtypeId(e.target.value)}
                  className="w-full rounded-md"
                >
                  {availableSubtypes.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </ThemedSelect>
              </div>
            )}
          </div>
        </div>

        <ThemedCard className="mb-4 rounded-2xl p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{sourceNode.label}</div>
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full ${selectedType?.color ?? 'bg-slate-600'} flex items-center justify-center text-white text-xs`}>
                {selectedType?.icon && <selectedType.icon className="w-3 h-3" />}
              </div>
              <span style={{ color: 'var(--text-dim)' }}>{selectedType?.bidirectional ? '↔' : '→'}</span>
            </div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{targetNode.label}</div>
          </div>
        </ThemedCard>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="confidence" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Confidence Level
            </label>
            <ThemedSelect
              id="confidence"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as typeof confidence)}
              className="w-full rounded-md"
            >
              <option value="unverified">Unverified</option>
              <option value="asserted">Asserted</option>
              <option value="verified">Verified</option>
            </ThemedSelect>
          </div>

          {selectedType?.supportsStrength !== false && (
          <div>
            <label htmlFor="strength" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Relationship Strength
            </label>
            <ThemedSelect
              id="strength"
              value={strength}
              onChange={(e) => setStrength(e.target.value as typeof strength)}
              className="w-full rounded-md"
            >
              <option value="weak">Weak</option>
              <option value="moderate">Moderate</option>
              <option value="strong">Strong</option>
            </ThemedSelect>
          </div>
          )}

          {selectedType?.supportsDate !== false && (
          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Date (optional)
            </label>
            <ThemedInput
              id="date"
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full rounded-md"
            />
          </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
              Notes
            </label>
            <ThemedTextarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant details about this relationship..."
              rows={3}
              className="w-full rounded-md resize-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <ThemedButton type="button" onClick={onClose} variant="quiet">
              Cancel
            </ThemedButton>
            <ThemedButton type="submit" variant="accent" disabled={!selectedTypeId || availableTypes.length === 0}>
              Create Relationship
            </ThemedButton>
          </div>
        </form>
      </ThemedPanel>
    </div>
  );
}
