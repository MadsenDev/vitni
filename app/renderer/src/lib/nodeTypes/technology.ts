import { 
  FaGlobe, 
  FaEnvelope, 
  FaPhone, 
  FaMobile, 
  FaServer, 
  FaBitcoin 
} from 'react-icons/fa';
import type { NodeType } from './types';

export const technologyNodeTypes: NodeType[] = [
  {
    id: 'website',
    label: 'Website',
    icon: FaGlobe,
    color: 'bg-blue-600',
    description: 'Websites, domains, or online platforms',
    category: 'technology',
    properties: [
      { id: 'url', label: 'URL', type: 'url', required: true, placeholder: 'https://www.example.com' },
      { id: 'domain', label: 'Domain', type: 'text', placeholder: 'example.com' },
      { id: 'title', label: 'Site Title', type: 'text', placeholder: 'Example Website' },
      { id: 'type', label: 'Website Type', type: 'select', options: ['Corporate', 'E-commerce', 'Social Media', 'News', 'Blog', 'Forum', 'Government', 'Educational', 'Other'] },
      { id: 'owner', label: 'Owner', type: 'text', placeholder: 'John Smith' },
      { id: 'hosting', label: 'Hosting Provider', type: 'text', placeholder: 'AWS, GoDaddy, etc.' },
      { id: 'registrar', label: 'Domain Registrar', type: 'text', placeholder: 'Namecheap' },
      { id: 'registrationDate', label: 'Registration Date', type: 'date', placeholder: '2020-01-01' },
      { id: 'expirationDate', label: 'Expiration Date', type: 'date', placeholder: '2025-01-01' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', placeholder: '192.168.1.1' },
      { id: 'server', label: 'Server Info', type: 'text', placeholder: 'Apache/2.4.41' },
      { id: 'ssl', label: 'SSL Certificate', type: 'select', options: ['Valid', 'Invalid', 'Expired', 'None'] },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  },
  {
    id: 'email',
    label: 'Email Address',
    icon: FaEnvelope,
    color: 'bg-purple-600',
    description: 'Email addresses or email accounts',
    category: 'technology',
    properties: [
      { id: 'address', label: 'Email Address', type: 'email', required: true, placeholder: 'john@example.com' },
      { id: 'provider', label: 'Email Provider', type: 'text', placeholder: 'Gmail, Outlook, etc.' },
      { id: 'owner', label: 'Owner', type: 'text', placeholder: 'John Smith' },
      { id: 'type', label: 'Email Type', type: 'select', options: ['Personal', 'Business', 'Temporary', 'Disposable', 'Unknown'] },
      { id: 'created', label: 'Created Date', type: 'date', placeholder: '2020-01-01' },
      { id: 'lastActive', label: 'Last Active', type: 'date', placeholder: '2024-01-15' },
      { id: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Suspended', 'Deleted', 'Unknown'] },
      { id: 'associatedAccounts', label: 'Associated Accounts', type: 'textarea', placeholder: 'Linked social media, services...' },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  },
  {
    id: 'phone',
    label: 'Phone Number',
    icon: FaPhone,
    color: 'bg-green-600',
    description: 'Phone numbers or telecommunications devices',
    category: 'technology',
    properties: [
      { id: 'number', label: 'Phone Number', type: 'phone', required: true, placeholder: '+1-555-123-4567' },
      { id: 'type', label: 'Phone Type', type: 'select', options: ['Mobile', 'Landline', 'VoIP', 'Satellite', 'Unknown'] },
      { id: 'carrier', label: 'Carrier', type: 'text', placeholder: 'Verizon, AT&T, etc.' },
      { id: 'owner', label: 'Owner', type: 'text', placeholder: 'John Smith' },
      { id: 'registered', label: 'Registered Date', type: 'date', placeholder: '2020-01-01' },
      { id: 'lastActive', label: 'Last Active', type: 'date', placeholder: '2024-01-15' },
      { id: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Suspended', 'Disconnected', 'Unknown'] },
      { id: 'location', label: 'Location', type: 'text', placeholder: 'New York, NY' },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  },
  {
    id: 'device',
    label: 'Device',
    icon: FaMobile,
    color: 'bg-gray-600',
    description: 'Computers, phones, tablets, or other electronic devices',
    category: 'technology',
    properties: [
      { id: 'name', label: 'Device Name', type: 'text', required: true, placeholder: 'iPhone 15 Pro' },
      { id: 'type', label: 'Device Type', type: 'select', options: ['Smartphone', 'Laptop', 'Desktop', 'Tablet', 'Server', 'Router', 'IoT Device', 'Other'] },
      { id: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'Apple' },
      { id: 'model', label: 'Model', type: 'text', placeholder: 'iPhone 15 Pro' },
      { id: 'serialNumber', label: 'Serial Number', type: 'text', placeholder: 'ABC123456789' },
      { id: 'imei', label: 'IMEI/MEID', type: 'text', placeholder: '123456789012345' },
      { id: 'macAddress', label: 'MAC Address', type: 'text', placeholder: '00:1B:44:11:3A:B7' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', placeholder: '192.168.1.100' },
      { id: 'os', label: 'Operating System', type: 'text', placeholder: 'iOS 17.2' },
      { id: 'owner', label: 'Owner', type: 'text', placeholder: 'John Smith' },
      { id: 'purchased', label: 'Purchase Date', type: 'date', placeholder: '2023-09-15' },
      { id: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Lost', 'Stolen', 'Destroyed', 'Unknown'] },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  },
  {
    id: 'server',
    label: 'Server',
    icon: FaServer,
    color: 'bg-indigo-600',
    description: 'Computer servers, hosting systems, or network infrastructure',
    category: 'technology',
    properties: [
      { id: 'hostname', label: 'Hostname', type: 'text', required: true, placeholder: 'web-server-01' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', placeholder: '192.168.1.10' },
      { id: 'type', label: 'Server Type', type: 'select', options: ['Web Server', 'Database Server', 'Mail Server', 'DNS Server', 'File Server', 'Application Server', 'Other'] },
      { id: 'os', label: 'Operating System', type: 'text', placeholder: 'Ubuntu 22.04 LTS' },
      { id: 'provider', label: 'Hosting Provider', type: 'text', placeholder: 'AWS, DigitalOcean, etc.' },
      { id: 'location', label: 'Physical Location', type: 'text', placeholder: 'Data Center, City' },
      { id: 'owner', label: 'Owner', type: 'text', placeholder: 'Company Name' },
      { id: 'purpose', label: 'Purpose', type: 'textarea', placeholder: 'What this server is used for...' },
      { id: 'services', label: 'Running Services', type: 'textarea', placeholder: 'Apache, MySQL, etc.' },
      { id: 'lastSeen', label: 'Last Seen', type: 'date', placeholder: '2024-01-15' },
      { id: 'status', label: 'Status', type: 'select', options: ['Online', 'Offline', 'Maintenance', 'Unknown'] },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  },
  {
    id: 'cryptocurrency',
    label: 'Cryptocurrency',
    icon: FaBitcoin,
    color: 'bg-yellow-600',
    description: 'Bitcoin, Ethereum, or other cryptocurrency addresses and transactions',
    category: 'technology',
    properties: [
      { id: 'address', label: 'Wallet Address', type: 'text', required: true, placeholder: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
      { id: 'type', label: 'Cryptocurrency Type', type: 'select', options: ['Bitcoin', 'Ethereum', 'Litecoin', 'Ripple', 'Monero', 'Other'] },
      { id: 'owner', label: 'Owner', type: 'text', placeholder: 'John Smith' },
      { id: 'balance', label: 'Balance', type: 'text', placeholder: '0.5 BTC' },
      { id: 'transactionHash', label: 'Transaction Hash', type: 'text', placeholder: 'abc123...' },
      { id: 'transactionDate', label: 'Transaction Date', type: 'date', placeholder: '2024-01-15' },
      { id: 'amount', label: 'Amount', type: 'text', placeholder: '0.1 BTC' },
      { id: 'fromAddress', label: 'From Address', type: 'text', placeholder: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2' },
      { id: 'toAddress', label: 'To Address', type: 'text', placeholder: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
      { id: 'exchange', label: 'Exchange', type: 'text', placeholder: 'Coinbase, Binance, etc.' },
      { id: 'status', label: 'Status', type: 'select', options: ['Confirmed', 'Pending', 'Failed', 'Unknown'] },
      { id: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'Any additional information...' }
    ]
  }
];
