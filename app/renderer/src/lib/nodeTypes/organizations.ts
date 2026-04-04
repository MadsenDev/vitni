import { FaBuilding } from 'react-icons/fa';
import type { NodeType } from './types';

export const organizationNodeTypes: NodeType[] = [
  {
    id: 'organization',
    label: 'Organization',
    icon: FaBuilding,
    color: 'bg-green-600',
    description: 'A company, agency, institution, group, or other formal organization.',
    category: 'organizations',
    properties: [
      { id: 'name', label: 'Organization Name', type: 'text', required: true, placeholder: 'Acme Corporation' },
      { id: 'legalName', label: 'Legal Name', type: 'text', placeholder: 'Acme Corporation Inc.' },
      { id: 'dba', label: 'DBA / Trade Name', type: 'text', placeholder: 'Acme Logistics' },
      {
        id: 'organizationType',
        label: 'Organization Type',
        type: 'select',
        options: ['Corporation', 'LLC', 'Partnership', 'Non-profit', 'Government', 'Educational', 'Healthcare', 'Religious', 'Criminal Group', 'Other']
      },
      { id: 'sector', label: 'Sector', type: 'text', placeholder: 'Technology, public sector, healthcare' },
      { id: 'industry', label: 'Industry', type: 'text', placeholder: 'Fintech' },
      { id: 'jurisdiction', label: 'Jurisdiction', type: 'text', placeholder: 'Norway' },
      { id: 'registrationNumber', label: 'Registration Number', type: 'text', placeholder: 'REG123456' },
      { id: 'taxId', label: 'Tax ID / EIN', type: 'text', placeholder: '12-3456789' },
      { id: 'website', label: 'Website', type: 'url', placeholder: 'https://acme.example' },
      { id: 'email', label: 'Primary Email', type: 'email', placeholder: 'info@acme.example' },
      { id: 'phone', label: 'Primary Phone', type: 'phone', placeholder: '+1-555-123-4567' },
      { id: 'addressText', label: 'Address Notes', type: 'textarea', placeholder: 'Registered and operating addresses' },
      { id: 'foundedDate', label: 'Founded Date', type: 'date', placeholder: '2020-01-01' },
      { id: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Dissolved', 'Suspended', 'Unknown'] },
      { id: 'specialty', label: 'Specialty / Function', type: 'text', placeholder: 'Law enforcement, cardiology, retail banking' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Analyst summary and unresolved issues' }
    ]
  }
];
