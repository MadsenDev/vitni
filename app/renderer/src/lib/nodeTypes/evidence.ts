import {
  FaSearch,
  FaFileAlt,
  FaComments,
  FaVideo,
  FaDollarSign,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaCar,
  FaPlane,
  FaBriefcase,
  FaIdCard,
  FaExchangeAlt
} from 'react-icons/fa';
import type { NodeType } from './types';

export const evidenceNodeTypes: NodeType[] = [
  {
    id: 'evidence',
    label: 'Evidence Item',
    icon: FaSearch,
    color: 'bg-orange-600',
    description: 'A collected or referenced evidence item with chain-of-custody context.',
    category: 'evidence',
    properties: [
      { id: 'evidenceType', label: 'Evidence Type', type: 'select', options: ['Physical', 'Digital', 'Documentary', 'Testimonial', 'DNA', 'Fingerprint', 'Photo', 'Video', 'Audio', 'Other'], required: true },
      { id: 'title', label: 'Evidence Title', type: 'text', required: true, placeholder: 'Recovered SIM card' },
      { id: 'description', label: 'Description', type: 'textarea', placeholder: 'Where it came from and why it matters' },
      { id: 'dateFound', label: 'Date Found', type: 'date', placeholder: '2024-01-15' },
      { id: 'locationFound', label: 'Location Found', type: 'text', placeholder: 'Apartment 2B' },
      { id: 'foundBy', label: 'Found By', type: 'text', placeholder: 'Detective Smith' },
      { id: 'chainOfCustody', label: 'Chain of Custody', type: 'textarea', placeholder: 'Collector -> lab -> evidence storage' },
      { id: 'status', label: 'Evidence Status', type: 'select', options: ['Collected', 'In Analysis', 'Stored', 'Returned', 'Destroyed'] },
      { id: 'hash', label: 'File Hash', type: 'text', placeholder: 'SHA-256 or other integrity hash' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Interpretation, caveats, and next steps' }
    ]
  },
  {
    id: 'document',
    label: 'Document',
    icon: FaFileAlt,
    color: 'bg-yellow-600',
    description: 'A report, email, receipt, contract, or other document record.',
    category: 'evidence',
    properties: [
      { id: 'title', label: 'Document Title', type: 'text', required: true, placeholder: 'Q4 Financial Report' },
      { id: 'documentType', label: 'Document Type', type: 'select', options: ['Email', 'Report', 'Contract', 'Invoice', 'Receipt', 'Certificate', 'Log', 'Other'] },
      { id: 'author', label: 'Author', type: 'text', placeholder: 'Jane Doe' },
      { id: 'recipient', label: 'Recipient', type: 'text', placeholder: 'Board of Directors' },
      { id: 'createdDate', label: 'Created Date', type: 'date', placeholder: '2024-01-15' },
      { id: 'modifiedDate', label: 'Modified Date', type: 'date', placeholder: '2024-01-16' },
      { id: 'url', label: 'URL', type: 'url', placeholder: 'https://example.com/file.pdf' },
      { id: 'filePath', label: 'File Path', type: 'text', placeholder: '/documents/report.pdf' },
      { id: 'hash', label: 'File Hash', type: 'text', placeholder: 'a1b2c3...' },
      { id: 'confidentiality', label: 'Confidentiality', type: 'select', options: ['Public', 'Internal', 'Confidential', 'Secret', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Summary, provenance, relevance' }
    ]
  },
  {
    id: 'identity_document',
    label: 'Identity Document',
    icon: FaIdCard,
    color: 'bg-amber-600',
    description: 'A passport, driver license, national ID card, or similar identity credential.',
    category: 'evidence',
    properties: [
      { id: 'documentType', label: 'Document Type', type: 'select', options: ['Passport', 'Driver License', 'National ID', 'Residence Permit', 'Other'], required: true },
      { id: 'documentNumber', label: 'Document Number', type: 'text', required: true, placeholder: 'A1234567' },
      { id: 'issuingCountry', label: 'Issuing Country', type: 'text', placeholder: 'Norway' },
      { id: 'issuingAuthority', label: 'Issuing Authority', type: 'text', placeholder: 'National Police Directorate' },
      { id: 'issueDate', label: 'Issue Date', type: 'date', placeholder: '2022-01-01' },
      { id: 'expiryDate', label: 'Expiry Date', type: 'date', placeholder: '2032-01-01' },
      { id: 'holderName', label: 'Holder Name', type: 'text', placeholder: 'Jane Doe' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Authenticity notes, MRZ, seizure details' }
    ]
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: FaComments,
    color: 'bg-indigo-600',
    description: 'A specific communication event or record.',
    category: 'evidence',
    properties: [
      { id: 'communicationType', label: 'Communication Type', type: 'select', options: ['Phone Call', 'Email', 'SMS', 'WhatsApp', 'Telegram', 'Signal', 'Meeting', 'Other'], required: true },
      { id: 'from', label: 'From', type: 'text', required: true, placeholder: 'Jane Doe' },
      { id: 'to', label: 'To', type: 'text', required: true, placeholder: 'John Doe' },
      { id: 'date', label: 'Date', type: 'date', required: true, placeholder: '2024-01-15' },
      { id: 'subject', label: 'Subject', type: 'text', placeholder: 'Transfer confirmation' },
      { id: 'content', label: 'Content Summary', type: 'textarea', placeholder: 'Short summary of the message or call' },
      { id: 'duration', label: 'Duration', type: 'text', placeholder: '12 minutes' },
      { id: 'direction', label: 'Direction', type: 'select', options: ['Outgoing', 'Incoming', 'Bidirectional'] },
      { id: 'location', label: 'Location', type: 'text', placeholder: 'Oslo' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Transcript details, key phrases, call context' }
    ]
  },
  {
    id: 'media',
    label: 'Media File',
    icon: FaVideo,
    color: 'bg-pink-600',
    description: 'A photo, video, audio file, or capture artifact.',
    category: 'evidence',
    properties: [
      { id: 'filename', label: 'Filename', type: 'text', required: true, placeholder: 'img_001.jpg' },
      { id: 'mediaType', label: 'Media Type', type: 'select', options: ['Photo', 'Video', 'Audio', 'Screen Capture', 'Other'] },
      { id: 'format', label: 'Format', type: 'text', placeholder: 'JPEG, MP4, WAV' },
      { id: 'createdDate', label: 'Created Date', type: 'date', placeholder: '2024-01-15' },
      { id: 'duration', label: 'Duration', type: 'text', placeholder: '00:03:25' },
      { id: 'resolution', label: 'Resolution', type: 'text', placeholder: '1920x1080' },
      { id: 'hash', label: 'File Hash', type: 'text', placeholder: 'a1b2c3...' },
      { id: 'location', label: 'Capture Location', type: 'text', placeholder: 'Oslo Central Station' },
      { id: 'metadata', label: 'Metadata Summary', type: 'textarea', placeholder: 'EXIF, device info, GPS, codec' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Visual observations and integrity notes' }
    ]
  },
  {
    id: 'financial_account',
    label: 'Financial Account',
    icon: FaDollarSign,
    color: 'bg-emerald-600',
    description: 'A bank account, card, policy, loan, or financial instrument.',
    category: 'evidence',
    properties: [
      { id: 'accountType', label: 'Account Type', type: 'select', options: ['Bank Account', 'Credit Card', 'Loan', 'Insurance', 'Brokerage', 'Payroll', 'Other'], required: true },
      { id: 'accountNumber', label: 'Account Number', type: 'text', placeholder: '1234567890' },
      { id: 'institutionName', label: 'Institution Name', type: 'text', placeholder: 'DNB' },
      { id: 'routingNumber', label: 'Routing / Sort Code', type: 'text', placeholder: '021000021' },
      { id: 'currency', label: 'Currency', type: 'select', options: ['NOK', 'USD', 'EUR', 'GBP', 'Other'] },
      { id: 'balance', label: 'Balance', type: 'text', placeholder: 'NOK 54,320' },
      { id: 'status', label: 'Account Status', type: 'select', options: ['Active', 'Closed', 'Frozen', 'Suspended', 'Unknown'] },
      { id: 'openedDate', label: 'Opened Date', type: 'date', placeholder: '2020-01-01' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'KYC info, linked cards, ownership clues' }
    ]
  },
  {
    id: 'financial_transaction',
    label: 'Financial Transaction',
    icon: FaExchangeAlt,
    color: 'bg-lime-600',
    description: 'A discrete transfer, purchase, payment, or withdrawal event.',
    category: 'evidence',
    properties: [
      { id: 'transactionReference', label: 'Transaction Reference', type: 'text', required: true, placeholder: 'TX-2024-0001' },
      { id: 'transactionType', label: 'Transaction Type', type: 'select', options: ['Transfer', 'Card Purchase', 'Cash Withdrawal', 'Deposit', 'Crypto Transfer', 'Other'], required: true },
      { id: 'transactionDate', label: 'Transaction Date', type: 'date', required: true, placeholder: '2024-01-15' },
      { id: 'amount', label: 'Amount', type: 'text', placeholder: 'NOK 2,500' },
      { id: 'currency', label: 'Currency', type: 'select', options: ['NOK', 'USD', 'EUR', 'GBP', 'Other'] },
      { id: 'merchant', label: 'Merchant / Counterparty', type: 'text', placeholder: 'Example Store' },
      { id: 'description', label: 'Description', type: 'textarea', placeholder: 'Transfer memo or bank description' },
      { id: 'status', label: 'Transaction Status', type: 'select', options: ['Pending', 'Completed', 'Failed', 'Reversed', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Structuring pattern, linked entities, anomalies' }
    ]
  },
  {
    id: 'event',
    label: 'Event',
    icon: FaCalendarAlt,
    color: 'bg-purple-600',
    description: 'A scheduled or observed event that matters in the investigation.',
    category: 'evidence',
    properties: [
      { id: 'title', label: 'Event Title', type: 'text', required: true, placeholder: 'Meeting at warehouse' },
      { id: 'eventType', label: 'Event Type', type: 'select', options: ['Meeting', 'Travel', 'Call', 'Delivery', 'Court Hearing', 'Interview', 'Other'] },
      { id: 'startDate', label: 'Start Date', type: 'date', required: true, placeholder: '2024-01-15' },
      { id: 'endDate', label: 'End Date', type: 'date', placeholder: '2024-01-15' },
      { id: 'location', label: 'Location', type: 'text', placeholder: 'Warehouse 14' },
      { id: 'outcome', label: 'Outcome', type: 'textarea', placeholder: 'What happened and why it matters' },
      { id: 'status', label: 'Event Status', type: 'select', options: ['Scheduled', 'Observed', 'Completed', 'Cancelled', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Time uncertainty, supporting evidence, participants' }
    ]
  },
  {
    id: 'incident',
    label: 'Incident',
    icon: FaExclamationTriangle,
    color: 'bg-red-600',
    description: 'A crime, breach, fraud, accident, or other investigated incident.',
    category: 'evidence',
    properties: [
      { id: 'title', label: 'Incident Title', type: 'text', required: true, placeholder: 'Credential theft incident' },
      { id: 'incidentType', label: 'Incident Type', type: 'select', options: ['Crime', 'Fraud', 'Security Breach', 'Accident', 'Assault', 'Theft', 'Other'] },
      { id: 'date', label: 'Incident Date', type: 'date', required: true, placeholder: '2024-01-15' },
      { id: 'location', label: 'Location', type: 'text', placeholder: 'Oslo' },
      { id: 'description', label: 'Description', type: 'textarea', placeholder: 'What happened and what is known so far' },
      { id: 'status', label: 'Incident Status', type: 'select', options: ['Open', 'Under Investigation', 'Contained', 'Closed', 'Unknown'] },
      { id: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
      { id: 'caseNumber', label: 'Case Number', type: 'text', placeholder: 'CASE-2024-001' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Theories, contradictions, pending evidence' }
    ]
  },
  {
    id: 'location',
    label: 'Location',
    icon: FaMapMarkerAlt,
    color: 'bg-red-500',
    description: 'A physical place, address, property, venue, or point of interest.',
    category: 'evidence',
    properties: [
      { id: 'name', label: 'Location Name', type: 'text', required: true, placeholder: 'Warehouse 14' },
      { id: 'locationType', label: 'Location Type', type: 'select', options: ['Residence', 'Business', 'Public Space', 'Government Building', 'Storage', 'Transit Hub', 'Venue', 'Other'] },
      { id: 'address', label: 'Address', type: 'text', placeholder: 'Example Street 14' },
      { id: 'city', label: 'City', type: 'text', placeholder: 'Oslo' },
      { id: 'state', label: 'State / Province', type: 'text', placeholder: 'Oslo' },
      { id: 'zipCode', label: 'ZIP / Postal Code', type: 'text', placeholder: '0001' },
      { id: 'country', label: 'Country', type: 'text', placeholder: 'Norway' },
      { id: 'latitude', label: 'Latitude', type: 'number', placeholder: '59.9139' },
      { id: 'longitude', label: 'Longitude', type: 'number', placeholder: '10.7522' },
      { id: 'accessLevel', label: 'Access Level', type: 'select', options: ['Public', 'Private', 'Restricted', 'Secure', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Ownership clues, CCTV coverage, observation notes' }
    ]
  },
  {
    id: 'vehicle',
    label: 'Vehicle',
    icon: FaCar,
    color: 'bg-slate-600',
    description: 'A road vehicle used as an investigative asset or identifier.',
    category: 'evidence',
    properties: [
      { id: 'make', label: 'Make', type: 'text', required: true, placeholder: 'Toyota' },
      { id: 'model', label: 'Model', type: 'text', required: true, placeholder: 'Camry' },
      { id: 'year', label: 'Year', type: 'number', placeholder: '2020' },
      { id: 'vin', label: 'VIN', type: 'text', placeholder: '1HGBH41JXMN109186' },
      { id: 'licensePlate', label: 'License Plate', type: 'text', placeholder: 'AB12345' },
      { id: 'registrationCountry', label: 'Registration Country / State', type: 'text', placeholder: 'NO' },
      { id: 'vehicleType', label: 'Vehicle Type', type: 'select', options: ['Sedan', 'SUV', 'Truck', 'Motorcycle', 'Van', 'Bus', 'Other'] },
      { id: 'color', label: 'Color', type: 'text', placeholder: 'Silver' },
      { id: 'status', label: 'Vehicle Status', type: 'select', options: ['Active', 'Stolen', 'Recovered', 'Destroyed', 'Unknown'] },
      { id: 'lastSeen', label: 'Last Seen', type: 'date', placeholder: '2024-01-15' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'ANPR hits, ownership clues, damage, sightings' }
    ]
  },
  {
    id: 'aircraft',
    label: 'Aircraft',
    icon: FaPlane,
    color: 'bg-blue-600',
    description: 'An aircraft or flight asset relevant to the investigation.',
    category: 'evidence',
    properties: [
      { id: 'registration', label: 'Registration', type: 'text', required: true, placeholder: 'LN-ABC' },
      { id: 'aircraftType', label: 'Aircraft Type', type: 'select', options: ['Commercial', 'Private Jet', 'Helicopter', 'Cargo', 'Military', 'Other'] },
      { id: 'make', label: 'Make', type: 'text', placeholder: 'Boeing' },
      { id: 'model', label: 'Model', type: 'text', placeholder: '737' },
      { id: 'operator', label: 'Operator', type: 'text', placeholder: 'SAS' },
      { id: 'ownerName', label: 'Owner', type: 'text', placeholder: 'Example Aviation AS' },
      { id: 'departure', label: 'Departure', type: 'text', placeholder: 'OSL' },
      { id: 'arrival', label: 'Arrival', type: 'text', placeholder: 'LHR' },
      { id: 'flightDate', label: 'Flight Date', type: 'date', placeholder: '2024-01-15' },
      { id: 'status', label: 'Aircraft Status', type: 'select', options: ['Active', 'Maintenance', 'Retired', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Flight history, operator context, passenger leads' }
    ]
  },
  {
    id: 'case',
    label: 'Case',
    icon: FaBriefcase,
    color: 'bg-slate-700',
    description: 'An investigative or legal case container used as a graph object.',
    category: 'evidence',
    properties: [
      { id: 'caseNumber', label: 'Case Number', type: 'text', required: true, placeholder: 'CASE-2024-001' },
      { id: 'title', label: 'Case Title', type: 'text', required: true, placeholder: 'Internal fraud inquiry' },
      { id: 'caseType', label: 'Case Type', type: 'select', options: ['Criminal', 'Civil', 'Internal', 'Compliance', 'Intelligence', 'Other'] },
      { id: 'status', label: 'Case Status', type: 'select', options: ['Open', 'Active', 'Paused', 'Closed', 'Unknown'] },
      { id: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
      { id: 'assignedTo', label: 'Assigned To', type: 'text', placeholder: 'Investigator name' },
      { id: 'openedDate', label: 'Opened Date', type: 'date', placeholder: '2024-01-15' },
      { id: 'closedDate', label: 'Closed Date', type: 'date', placeholder: '2024-02-15' },
      { id: 'description', label: 'Description', type: 'textarea', placeholder: 'Summary of mandate, allegations, and scope' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Status notes, dependencies, reporting context' }
    ]
  }
];
