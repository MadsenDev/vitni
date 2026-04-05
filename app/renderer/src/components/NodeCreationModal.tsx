import { useState, useEffect } from 'react';
import type { NodeProperty, NodeType } from '../lib/nodeTypes/index';
import { resolveNodeTypeIcon } from '@renderer/features/personalization/iconPacks';
import type { IconPackId } from '@renderer/features/personalization/theme';
import { fetchWebsiteMetadata } from '../lib/fetchWebsiteMetadata';

interface NodeCreationModalProps {
  isOpen: boolean;
  nodeType: NodeType | null;
  iconPack: IconPackId;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onCreate: (data: { label: string; properties: Record<string, unknown> }) => void;
}

export function NodeCreationModal({
  isOpen,
  nodeType,
  iconPack,
  position,
  onClose,
  onCreate
}: NodeCreationModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

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
    } else if (nodeType.id === 'domain') {
      label = (formData.domain as string) || 'Unknown Domain';
    } else if (nodeType.id === 'website') {
      label = (formData.url as string) || 'Unknown Website';
    } else if (nodeType.id === 'online_account') {
      label = (formData.handle as string) || (formData.displayName as string) || 'Unknown Account';
    } else if (nodeType.id === 'email') {
      label = (formData.address as string) || 'Unknown Email';
    } else if (nodeType.id === 'phone') {
      label = (formData.number as string) || 'Unknown Phone';
    } else if (nodeType.id === 'device') {
      label = (formData.name as string) || (formData.model as string) || 'Unknown Device';
    } else if (nodeType.id === 'ip_address') {
      label = (formData.ipAddress as string) || 'Unknown IP';
    } else if (nodeType.id === 'infrastructure') {
      label = (formData.hostname as string) || 'Unknown Infrastructure';
    } else if (nodeType.id === 'crypto_wallet') {
      label = (formData.address as string) || 'Unknown Wallet';
    } else if (nodeType.id === 'location') {
      label = (formData.name as string) || 'Unknown Location';
    } else if (nodeType.id === 'event') {
      label = (formData.title as string) || 'Unknown Event';
    } else if (nodeType.id === 'incident') {
      label = (formData.title as string) || 'Unknown Incident';
    } else if (nodeType.id === 'document') {
      label = (formData.title as string) || 'Unknown Document';
    } else if (nodeType.id === 'identity_document') {
      label = (formData.documentNumber as string) || 'Unknown Identity Document';
    } else if (nodeType.id === 'communication') {
      const from = formData.from as string || '';
      const to = formData.to as string || '';
      label = `${from} → ${to}`.trim() || 'Unknown Communication';
    } else if (nodeType.id === 'media') {
      label = (formData.filename as string) || 'Unknown Media';
    } else if (nodeType.id === 'financial_account') {
      const type = formData.accountType as string || '';
      const institution = formData.institutionName as string || '';
      label = `${type}${institution ? ` • ${institution}` : ''}`.trim() || 'Unknown Financial Account';
    } else if (nodeType.id === 'financial_transaction') {
      const type = formData.transactionType as string || '';
      const amount = formData.amount as string || '';
      label = amount ? `${type} - ${amount}` : type || 'Unknown Transaction';
    } else if (nodeType.id === 'evidence') {
      label = (formData.title as string) || 'Unknown Evidence';
    } else if (nodeType.id === 'case') {
      label = (formData.title as string) || (formData.caseNumber as string) || 'Unknown Case';
    } else if (nodeType.id === 'vehicle') {
      label = [formData.make as string || '', formData.model as string || ''].join(' ').trim() || 'Unknown Vehicle';
    } else if (nodeType.id === 'aircraft') {
      label = (formData.registration as string) || 'Unknown Aircraft';
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

  const renderInput = (property: NodeProperty) => {
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
      
      case 'url': {
        // Add fetch button for website nodes
        const isWebsiteNode = nodeType?.id === 'website';
        const isUrlProperty = property.id === 'url';
        
        const handleFetchMetadata = async () => {
          const url = (value as string || '').trim();
          if (!url) return;
          
          setFetchingMetadata(true);
          try {
            const metadata = await fetchWebsiteMetadata(url);
            
                    // Auto-populate available fields
                    if (metadata.domain) {
                      const domainProp = nodeType?.properties.find(p => p.id === 'domain');
                      if (domainProp) {
                        handleInputChange('domain', metadata.domain);
                      }
                    }
                    
                    // IP address
                    if (metadata.ipAddress) {
                      const ipProp = nodeType?.properties.find(p => p.id === 'ipAddress');
                      if (ipProp) {
                        handleInputChange('ipAddress', metadata.ipAddress);
                      }
                    }
                    
                    // Hosting provider
                    if (metadata.hosting) {
                      const hostingProp = nodeType?.properties.find(p => p.id === 'hosting');
                      if (hostingProp) {
                        handleInputChange('hosting', metadata.hosting);
                      }
                    }
                    
                    // Domain registration info (if available from WHOIS)
                    if (metadata.registrar) {
                      const registrarProp = nodeType?.properties.find(p => p.id === 'registrar');
                      if (registrarProp) {
                        handleInputChange('registrar', metadata.registrar);
                      }
                    }
                    
                    if (metadata.registrationDate) {
                      const regDateProp = nodeType?.properties.find(p => p.id === 'registrationDate');
                      if (regDateProp) {
                        const date = new Date(metadata.registrationDate);
                        if (!isNaN(date.getTime())) {
                          handleInputChange('registrationDate', date.toISOString().split('T')[0]);
                        }
                      }
                    }
                    
                    if (metadata.expirationDate) {
                      const expDateProp = nodeType?.properties.find(p => p.id === 'expirationDate');
                      if (expDateProp) {
                        const date = new Date(metadata.expirationDate);
                        if (!isNaN(date.getTime())) {
                          handleInputChange('expirationDate', date.toISOString().split('T')[0]);
                        }
                      }
                    }
          } catch (error) {
            console.warn('[NodeCreationModal] Failed to fetch website metadata:', error);
          } finally {
            setFetchingMetadata(false);
          }
        };
        
        return (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <input
                type="url"
                value={value as string}
                onChange={(e) => handleInputChange(property.id, e.target.value)}
                placeholder={property.placeholder}
                className={`flex-1 min-w-0 px-3 py-2 bg-slate-800 border rounded-md text-white ${
                  error ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {isWebsiteNode && isUrlProperty && (
                <button
                  type="button"
                  onClick={handleFetchMetadata}
                  disabled={fetchingMetadata || !(value as string || '').trim()}
                  className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs rounded-md transition-colors whitespace-nowrap shrink-0"
                  title="Look up domain registration information (WHOIS)"
                >
                  {fetchingMetadata ? '...' : 'Fetch'}
                </button>
              )}
            </div>
            {isWebsiteNode && isUrlProperty && fetchingMetadata && (
              <p className="text-xs text-slate-400">Looking up domain registration information...</p>
            )}
          </div>
        );
      }
      
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
  const Icon = resolveNodeTypeIcon(nodeType, iconPack);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center space-x-3 mb-6">
          <div className={`w-10 h-10 rounded-full ${nodeType.color} flex items-center justify-center text-white text-lg`}>
            <Icon className="w-5 h-5" />
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
