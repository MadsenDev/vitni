import { FaUser } from 'react-icons/fa';
import type { NodeType } from './types';

export const peopleNodeTypes: NodeType[] = [
  {
    id: 'person',
    label: 'Person',
    icon: FaUser,
    color: 'bg-blue-600',
    description: 'A real-world individual with identifiers, demographics, and analyst notes.',
    category: 'people',
    properties: [
      { id: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'Jane' },
      { id: 'middleName', label: 'Middle Name', type: 'text', placeholder: 'Alexandra' },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Doe' },
      { id: 'alias', label: 'Aliases', type: 'textarea', placeholder: 'Jane Roe, JD, @jdoe' },
      { id: 'birthDate', label: 'Birth Date', type: 'date', placeholder: '1990-01-15' },
      { id: 'birthPlace', label: 'Birth Place', type: 'text', placeholder: 'Oslo, Norway' },
      { id: 'nationality', label: 'Nationality', type: 'text', placeholder: 'Norwegian' },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male', 'Non-binary', 'Other', 'Unknown'] },
      { id: 'email', label: 'Primary Email', type: 'email', placeholder: 'jane@example.com' },
      { id: 'phone', label: 'Primary Phone', type: 'phone', placeholder: '+47 400 00 000' },
      { id: 'occupation', label: 'Occupation', type: 'text', placeholder: 'Accountant' },
      { id: 'nationalId', label: 'National ID', type: 'text', placeholder: 'National identity number' },
      { id: 'passport', label: 'Passport Number', type: 'text', placeholder: 'A1234567' },
      { id: 'driversLicense', label: 'Driver License', type: 'text', placeholder: 'D123456789' },
      { id: 'addressText', label: 'Address Notes', type: 'textarea', placeholder: 'Known addresses or address history' },
      { id: 'investigativeRole', label: 'General Role', type: 'select', options: ['Unknown', 'Subject', 'Person of Interest', 'Witness', 'Victim', 'Associate', 'Investigator'] },
      { id: 'photo', label: 'Photo', type: 'image', placeholder: 'Attach a reference image' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Analyst summary, caveats, and unresolved questions' }
    ]
  }
];
