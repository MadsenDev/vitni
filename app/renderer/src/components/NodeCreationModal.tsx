import { useState, useEffect } from 'react';
import type { NodeType } from '../lib/nodeTypes/index';

interface NodeCreationModalProps {
  isOpen: boolean;
  nodeType: NodeType | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onCreate: (data: { label: string; properties: Record<string, unknown> }) => void;
}

export function NodeCreationModal({
  isOpen,
  nodeType,
  position,
  onClose,
  onCreate
}: NodeCreationModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (nodeType) {
      // Initialize form data with empty values for all properties
      const initialData: Record<string, unknown> = {};
      nodeType.properties.forEach(prop => {
        initialData[prop.id] = prop.type === 'select' ? (prop.options?.[0] || '') : '';
      });
      setFormData(initialData);
      setErrors({});
    }
  }, [nodeType]);

  const handleInputChange = (propertyId: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [propertyId]: value
    }));
    
    // Clear error when user starts typing
    if (errors[propertyId]) {
      setErrors(prev => ({
        ...prev,
        [propertyId]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!nodeType) return false;
    
    const newErrors: Record<string, string> = {};
    
    nodeType.properties.forEach(prop => {
      if (prop.required && (!formData[prop.id] || formData[prop.id] === '')) {
        newErrors[prop.id] = `${prop.label} is required`;
      }
    });
    
    setErrors(newErrors);
    const ok = Object.keys(newErrors).length === 0;
    if (!ok) {
      console.warn('[NodeCreationModal] Validation failed:', newErrors);
    }
    return ok;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nodeType) {
      console.warn('[NodeCreationModal] No nodeType set; aborting submit');
      return;
    }
    if (!validateForm()) return;
    
    // Create a label from the most important fields
    let label = '';
    if (nodeType.id === 'person') {
      const firstName = formData.firstName as string || '';
      const lastName = formData.lastName as string || '';
      label = `${firstName} ${lastName}`.trim() || 'Unknown Person';
    } else if (nodeType.id === 'organization') {
      label = (formData.name as string) || 'Unknown Organization';
    } else if (nodeType.id === 'location') {
      label = (formData.name as string) || 'Unknown Location';
    } else if (nodeType.id === 'event') {
      label = (formData.title as string) || 'Unknown Event';
    } else if (nodeType.id === 'document') {
      label = (formData.title as string) || 'Unknown Document';
    } else if (nodeType.id === 'communication') {
      const from = formData.from as string || '';
      const to = formData.to as string || '';
      label = `${from} → ${to}` || 'Unknown Communication';
    } else if (nodeType.id === 'financial') {
      const type = formData.type as string || '';
      const amount = formData.amount as string || '';
      label = amount ? `${type} - ${amount}` : type || 'Unknown Financial';
    } else if (nodeType.id === 'evidence') {
      label = (formData.title as string) || 'Unknown Evidence';
    } else {
      label = nodeType.label;
    }
    
    const payload = {
      label,
      properties: formData
    };
    console.debug('[NodeCreationModal] Submitting create payload:', {
      type: nodeType.id,
      position,
      ...payload
    });
    
    onCreate(payload);
    onClose();
  };

  const renderInput = (property: any) => {
    const value = formData[property.id] || '';
    const error = errors[property.id];
    
    switch (property.type) {
      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => handleInputChange(property.id, e.target.value)}
            className={`w-full px-3 py-2 bg-slate-800 border rounded-md text-white ${
              error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
            }`}
          >
            <option value="">Select {property.label}</option>
            {property.options?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'textarea':
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleInputChange(property.id, e.target.value)}
            placeholder={property.placeholder}
            rows={3}
            className={`w-full px-3 py-2 bg-slate-800 border rounded-md text-white resize-none ${
              error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
            }`}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value as string}
            onChange={(e) => handleInputChange(property.id, e.target.value)}
            placeholder={property.placeholder}
            className={`w-full px-3 py-2 bg-slate-800 border rounded-md text-white ${
              error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
            }`}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value as string}
            onChange={(e) => handleInputChange(property.id, e.target.value)}
            className={`w-full px-3 py-2 bg-slate-800 border rounded-md text-white ${
              error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
            }`}
          />
        );
      
      case 'email':
        return (
          <input
            type="email"
            value={value as string}
            onChange={(e) => handleInputChange(property.id, e.target.value)}
            placeholder={property.placeholder}
            className={`w-full px-3 py-2 bg-slate-800 border rounded-md text-white ${
              error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
            }`}
          />
        );
      
      case 'url':
        return (
          <input
            type="url"
            value={value as string}
            onChange={(e) => handleInputChange(property.id, e.target.value)}
            placeholder={property.placeholder}
            className={`w-full px-3 py-2 bg-slate-800 border rounded-md text-white ${
              error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
            }`}
          />
        );
      
      case 'phone':
        return (
          <input
            type="tel"
            value={value as string}
            onChange={(e) => handleInputChange(property.id, e.target.value)}
            placeholder={property.placeholder}
            className={`w-full px-3 py-2 bg-slate-800 border rounded-md text-white ${
              error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
            }`}
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleInputChange(property.id, e.target.value)}
            placeholder={property.placeholder}
            className={`w-full px-3 py-2 bg-slate-800 border rounded-md text-white ${
              error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
            }`}
          />
        );
    }
  };

  if (!isOpen || !nodeType) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center space-x-3 mb-6">
          <div className={`w-10 h-10 rounded-full ${nodeType.color} flex items-center justify-center text-white text-lg`}>
            {nodeType.icon && <nodeType.icon className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Create {nodeType.label}</h2>
            <p className="text-sm text-slate-400">{nodeType.description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nodeType.properties.map((property) => (
              <div key={property.id} className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">
                  {property.label}
                  {property.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {renderInput(property)}
                {errors[property.id] && (
                  <p className="text-red-400 text-xs">{errors[property.id]}</p>
                )}
              </div>
            ))}
          </div>

          {position && (
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
              Position: ({Math.round(position.x)}, {Math.round(position.y)})
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700">
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
            >
              Create {nodeType.label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}