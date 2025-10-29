import { 
  FaBuilding, 
  FaLandmark, 
  FaUniversity, 
  FaHospital 
} from 'react-icons/fa';
import type { NodeType } from './types';

export const organizationNodeTypes: NodeType[] = [
  {
    id: 'organization',
    label: 'Organization',
    icon: FaBuilding,
    color: 'bg-green-600',
    description: 'Companies, agencies, institutions, or groups',
    category: 'organizations',
    properties: [
      { id: 'name', label: 'Organization Name', type: 'text', required: true, placeholder: 'Acme Corporation' },
      { id: 'legalName', label: 'Legal Name', type: 'text', placeholder: 'Acme Corporation Inc.' },
      { id: 'dba', label: 'DBA (Doing Business As)', type: 'text', placeholder: 'Acme Corp' },
      { id: 'type', label: 'Organization Type', type: 'select', options: ['Corporation', 'LLC', 'Partnership', 'Non-profit', 'Government', 'Educational', 'Religious', 'Other'] },
      { id: 'industry', label: 'Industry', type: 'text', placeholder: 'Technology' },
      { id: 'ein', label: 'EIN/Tax ID', type: 'text', placeholder: '12-3456789' },
      { id: 'registrationNumber', label: 'Registration Number', type: 'text', placeholder: 'REG123456' },
      { id: 'website', label: 'Website', type: 'url', placeholder: 'https://www.acme.com' },
      { id: 'email', label: 'Email', type: 'email', placeholder: 'info@acme.com' },
      { id: 'phone', label: 'Phone', type: 'phone', placeholder: '+1-555-123-4567' },
      { id: 'address', label: 'Address', type: 'textarea', placeholder: '123 Business Ave, City, ST 12345' },
      { id: 'founded', label: 'Founded Date', type: 'date', placeholder: '2020-01-01' },
      { id: 'ceo', label: 'CEO/President', type: 'text', placeholder: 'Jane Doe' },
      { id: 'employees', label: 'Number of Employees', type: 'number', placeholder: '150' },
      { id: 'revenue', label: 'Annual Revenue', type: 'text', placeholder: '$10M' },
      { id: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Dissolved', 'Suspended', 'Unknown'] },
      { id: 'parentCompany', label: 'Parent Company', type: 'text', placeholder: 'Mega Corp' },
      { id: 'subsidiaries', label: 'Subsidiaries', type: 'textarea', placeholder: 'Sub Corp 1, Sub Corp 2' },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  },
  {
    id: 'government',
    label: 'Government Agency',
    icon: FaLandmark,
    color: 'bg-indigo-600',
    description: 'Government departments, agencies, or official institutions',
    category: 'organizations',
    properties: [
      { id: 'name', label: 'Agency Name', type: 'text', required: true, placeholder: 'FBI' },
      { id: 'type', label: 'Agency Type', type: 'select', options: ['Federal', 'State', 'Local', 'International', 'Military', 'Intelligence', 'Law Enforcement', 'Other'] },
      { id: 'jurisdiction', label: 'Jurisdiction', type: 'text', placeholder: 'United States' },
      { id: 'department', label: 'Department', type: 'text', placeholder: 'Department of Justice' },
      { id: 'website', label: 'Website', type: 'url', placeholder: 'https://www.fbi.gov' },
      { id: 'phone', label: 'Phone', type: 'phone', placeholder: '+1-202-324-3000' },
      { id: 'address', label: 'Address', type: 'textarea', placeholder: '935 Pennsylvania Avenue NW, Washington, DC' },
      { id: 'director', label: 'Director/Head', type: 'text', placeholder: 'Christopher Wray' },
      { id: 'budget', label: 'Annual Budget', type: 'text', placeholder: '$10.3 billion' },
      { id: 'employees', label: 'Number of Employees', type: 'number', placeholder: '38000' },
      { id: 'established', label: 'Established', type: 'date', placeholder: '1908-07-26' },
      { id: 'mission', label: 'Mission Statement', type: 'textarea', placeholder: 'Protect and defend the United States...' },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  },
  {
    id: 'educational',
    label: 'Educational Institution',
    icon: FaUniversity,
    color: 'bg-blue-600',
    description: 'Schools, universities, colleges, or educational organizations',
    category: 'organizations',
    properties: [
      { id: 'name', label: 'Institution Name', type: 'text', required: true, placeholder: 'Harvard University' },
      { id: 'type', label: 'Institution Type', type: 'select', options: ['University', 'College', 'High School', 'Elementary School', 'Trade School', 'Online', 'Other'] },
      { id: 'level', label: 'Education Level', type: 'select', options: ['Elementary', 'Middle School', 'High School', 'Undergraduate', 'Graduate', 'Doctorate', 'Professional', 'Other'] },
      { id: 'website', label: 'Website', type: 'url', placeholder: 'https://www.harvard.edu' },
      { id: 'email', label: 'Email', type: 'email', placeholder: 'admissions@harvard.edu' },
      { id: 'phone', label: 'Phone', type: 'phone', placeholder: '+1-617-495-1000' },
      { id: 'address', label: 'Address', type: 'textarea', placeholder: 'Cambridge, MA 02138' },
      { id: 'president', label: 'President/Principal', type: 'text', placeholder: 'Lawrence Bacow' },
      { id: 'students', label: 'Number of Students', type: 'number', placeholder: '23000' },
      { id: 'faculty', label: 'Number of Faculty', type: 'number', placeholder: '2400' },
      { id: 'founded', label: 'Founded', type: 'date', placeholder: '1636-09-08' },
      { id: 'accreditation', label: 'Accreditation', type: 'text', placeholder: 'New England Commission of Higher Education' },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  },
  {
    id: 'healthcare',
    label: 'Healthcare Facility',
    icon: FaHospital,
    color: 'bg-red-600',
    description: 'Hospitals, clinics, medical centers, or healthcare providers',
    category: 'organizations',
    properties: [
      { id: 'name', label: 'Facility Name', type: 'text', required: true, placeholder: 'Mayo Clinic' },
      { id: 'type', label: 'Facility Type', type: 'select', options: ['Hospital', 'Clinic', 'Medical Center', 'Urgent Care', 'Specialty Center', 'Mental Health', 'Rehabilitation', 'Other'] },
      { id: 'specialty', label: 'Specialty', type: 'text', placeholder: 'Cardiology, Oncology, etc.' },
      { id: 'website', label: 'Website', type: 'url', placeholder: 'https://www.mayoclinic.org' },
      { id: 'phone', label: 'Phone', type: 'phone', placeholder: '+1-507-284-2511' },
      { id: 'address', label: 'Address', type: 'textarea', placeholder: '200 First St SW, Rochester, MN 55905' },
      { id: 'director', label: 'Medical Director', type: 'text', placeholder: 'Dr. John Smith' },
      { id: 'beds', label: 'Number of Beds', type: 'number', placeholder: '1200' },
      { id: 'staff', label: 'Number of Staff', type: 'number', placeholder: '65000' },
      { id: 'established', label: 'Established', type: 'date', placeholder: '1889-01-01' },
      { id: 'accreditation', label: 'Accreditation', type: 'text', placeholder: 'Joint Commission' },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  }
];
