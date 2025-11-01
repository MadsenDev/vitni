import { 
  FaUser, 
  FaUserSecret, 
  FaEye, 
  FaUserShield 
} from 'react-icons/fa';
import type { NodeType } from './types';

export const peopleNodeTypes: NodeType[] = [
  {
    id: 'person',
    label: 'Person',
    icon: FaUser,
    color: 'bg-blue-600',
    description: 'Individual people, suspects, witnesses, or contacts',
    category: 'people',
    properties: [
      { id: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'John' },
      { id: 'middleName', label: 'Middle Name', type: 'text', placeholder: 'Michael' },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Smith' },
      { id: 'alias', label: 'Alias/Nickname', type: 'text', placeholder: 'Johnny' },
      { id: 'birthDate', label: 'Birth Date', type: 'date', placeholder: '1990-01-15' },
      { id: 'birthPlace', label: 'Birth Place', type: 'text', placeholder: 'New York, NY' },
      { id: 'nationality', label: 'Nationality', type: 'text', placeholder: 'American' },
      { id: 'ssn', label: 'SSN', type: 'text', placeholder: '123-45-6789' },
      { id: 'passport', label: 'Passport Number', type: 'text', placeholder: 'A1234567' },
      { id: 'driversLicense', label: 'Driver\'s License', type: 'text', placeholder: 'D123456789' },
      { id: 'email', label: 'Email', type: 'email', placeholder: 'john.smith@email.com' },
      { id: 'phone', label: 'Phone', type: 'phone', placeholder: '+1-555-123-4567' },
      { id: 'address', label: 'Address', type: 'textarea', placeholder: '123 Main St, Anytown, ST 12345' },
      { id: 'occupation', label: 'Occupation', type: 'text', placeholder: 'Software Engineer' },
      { id: 'employer', label: 'Employer', type: 'text', placeholder: 'Tech Corp' },
      { id: 'maritalStatus', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed', 'Unknown'] },
      { id: 'height', label: 'Height', type: 'text', placeholder: '5\'10"' },
      { id: 'weight', label: 'Weight', type: 'text', placeholder: '180 lbs' },
      { id: 'eyeColor', label: 'Eye Color', type: 'select', options: ['Brown', 'Blue', 'Green', 'Hazel', 'Gray', 'Unknown'] },
      { id: 'hairColor', label: 'Hair Color', type: 'select', options: ['Black', 'Brown', 'Blonde', 'Red', 'Gray', 'White', 'Unknown'] },
      { id: 'race', label: 'Race/Ethnicity', type: 'text', placeholder: 'Caucasian' },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Non-binary', 'Unknown'] },
      { id: 'photo', label: 'Photo', type: 'image', placeholder: 'Upload a photo of this person' },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  },
  {
    id: 'suspect',
    label: 'Suspect',
    icon: FaUserSecret,
    color: 'bg-red-600',
    description: 'Person suspected of involvement in a crime or incident',
    category: 'people',
    properties: [
      { id: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'John' },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Doe' },
      { id: 'alias', label: 'Alias/Nickname', type: 'text', placeholder: 'Johnny' },
      { id: 'suspectType', label: 'Suspect Type', type: 'select', options: ['Primary', 'Secondary', 'Person of Interest', 'Witness', 'Unknown'] },
      { id: 'crimeType', label: 'Crime Type', type: 'text', placeholder: 'Theft, Fraud, etc.' },
      { id: 'evidenceLevel', label: 'Evidence Level', type: 'select', options: ['Strong', 'Moderate', 'Weak', 'Circumstantial', 'None'] },
      { id: 'lastSeen', label: 'Last Seen', type: 'date', placeholder: '2024-01-15' },
      { id: 'lastLocation', label: 'Last Known Location', type: 'text', placeholder: '123 Main St' },
      { id: 'description', label: 'Physical Description', type: 'textarea', placeholder: 'Height, weight, distinguishing features...' },
      { id: 'criminalHistory', label: 'Criminal History', type: 'textarea', placeholder: 'Previous convictions, arrests...' },
      { id: 'associates', label: 'Known Associates', type: 'textarea', placeholder: 'Names of known associates...' },
      { id: 'notes', label: 'Investigation Notes', type: 'textarea', placeholder: 'Additional investigation details...' }
    ]
  },
  {
    id: 'witness',
    label: 'Witness',
    icon: FaEye,
    color: 'bg-green-600',
    description: 'Person who witnessed an event or has relevant information',
    category: 'people',
    properties: [
      { id: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'Jane' },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Smith' },
      { id: 'witnessType', label: 'Witness Type', type: 'select', options: ['Eyewitness', 'Expert', 'Character', 'Hostile', 'Unknown'] },
      { id: 'eventDate', label: 'Event Date', type: 'date', placeholder: '2024-01-15' },
      { id: 'eventLocation', label: 'Event Location', type: 'text', placeholder: 'Crime scene address' },
      { id: 'statement', label: 'Statement', type: 'textarea', placeholder: 'What they witnessed...' },
      { id: 'credibility', label: 'Credibility', type: 'select', options: ['High', 'Medium', 'Low', 'Unknown'] },
      { id: 'contactInfo', label: 'Contact Information', type: 'textarea', placeholder: 'Phone, email, address...' },
      { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional witness information...' }
    ]
  },
  {
    id: 'victim',
    label: 'Victim',
    icon: FaUserShield,
    color: 'bg-purple-600',
    description: 'Person who was harmed or affected by a crime or incident',
    category: 'people',
    properties: [
      { id: 'firstName', label: 'First Name', type: 'text', required: true, placeholder: 'John' },
      { id: 'lastName', label: 'Last Name', type: 'text', required: true, placeholder: 'Doe' },
      { id: 'victimType', label: 'Victim Type', type: 'select', options: ['Primary', 'Secondary', 'Indirect', 'Unknown'] },
      { id: 'crimeType', label: 'Crime Type', type: 'text', placeholder: 'Assault, Theft, etc.' },
      { id: 'incidentDate', label: 'Incident Date', type: 'date', placeholder: '2024-01-15' },
      { id: 'incidentLocation', label: 'Incident Location', type: 'text', placeholder: 'Where the crime occurred' },
      { id: 'injuries', label: 'Injuries', type: 'textarea', placeholder: 'Description of injuries sustained...' },
      { id: 'medicalTreatment', label: 'Medical Treatment', type: 'textarea', placeholder: 'Hospital, doctor visits...' },
      { id: 'impact', label: 'Impact', type: 'textarea', placeholder: 'Physical, emotional, financial impact...' },
      { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional victim information...' }
    ]
  }
];
