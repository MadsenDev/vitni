import {
  FaGlobe,
  FaUserCircle,
  FaEnvelope,
  FaPhone,
  FaMobile,
  FaServer,
  FaBitcoin,
  FaNetworkWired
} from 'react-icons/fa';
import type { NodeType } from './types';

export const technologyNodeTypes: NodeType[] = [
  {
    id: 'domain',
    label: 'Domain',
    icon: FaGlobe,
    color: 'bg-sky-600',
    description: 'A registered domain name used for infrastructure, websites, or email.',
    category: 'technology',
    properties: [
      { id: 'domain', label: 'Domain Name', type: 'text', required: true, placeholder: 'example.com' },
      { id: 'registrar', label: 'Registrar', type: 'text', placeholder: 'Namecheap' },
      { id: 'registrationDate', label: 'Registration Date', type: 'date', placeholder: '2024-01-15' },
      { id: 'expirationDate', label: 'Expiration Date', type: 'date', placeholder: '2025-01-15' },
      { id: 'dnsProvider', label: 'DNS Provider', type: 'text', placeholder: 'Cloudflare' },
      { id: 'registrantName', label: 'Registrant Name', type: 'text', placeholder: 'Example AS' },
      { id: 'registrantCountry', label: 'Registrant Country', type: 'text', placeholder: 'Norway' },
      { id: 'status', label: 'Domain Status', type: 'select', options: ['Active', 'Client Hold', 'Expired', 'Parked', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'WHOIS details, passive DNS leads, registrar notes' }
    ]
  },
  {
    id: 'website',
    label: 'Website',
    icon: FaGlobe,
    color: 'bg-blue-600',
    description: 'A public-facing website or service distinct from the underlying domain registration.',
    category: 'technology',
    properties: [
      { id: 'url', label: 'URL', type: 'url', required: true, placeholder: 'https://www.example.com' },
      { id: 'title', label: 'Site Title', type: 'text', placeholder: 'Example website' },
      { id: 'websiteType', label: 'Website Type', type: 'select', options: ['Corporate', 'Blog', 'Marketplace', 'Forum', 'Social Media', 'News', 'Government', 'Other'] },
      { id: 'language', label: 'Language', type: 'text', placeholder: 'English' },
      { id: 'status', label: 'Website Status', type: 'select', options: ['Online', 'Offline', 'Defaced', 'Parked', 'Unknown'] },
      { id: 'serverBanner', label: 'Server Banner', type: 'text', placeholder: 'nginx/1.26' },
      { id: 'sslStatus', label: 'TLS / SSL Status', type: 'select', options: ['Valid', 'Expired', 'Invalid', 'None', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Observed content, hosting clues, screenshots' }
    ]
  },
  {
    id: 'online_account',
    label: 'Online Account',
    icon: FaUserCircle,
    color: 'bg-violet-600',
    description: 'A social, marketplace, messaging, or platform account.',
    category: 'technology',
    properties: [
      { id: 'platform', label: 'Platform', type: 'text', required: true, placeholder: 'Instagram, Telegram, eBay' },
      { id: 'handle', label: 'Handle / Username', type: 'text', required: true, placeholder: '@janedoe' },
      { id: 'displayName', label: 'Display Name', type: 'text', placeholder: 'Jane Doe' },
      { id: 'profileUrl', label: 'Profile URL', type: 'url', placeholder: 'https://instagram.com/janedoe' },
      { id: 'accountType', label: 'Account Type', type: 'select', options: ['Personal', 'Business', 'Bot', 'Anonymous', 'Unknown'] },
      { id: 'createdDate', label: 'Created Date', type: 'date', placeholder: '2024-01-15' },
      { id: 'lastSeen', label: 'Last Seen', type: 'date', placeholder: '2024-02-01' },
      { id: 'status', label: 'Account Status', type: 'select', options: ['Active', 'Inactive', 'Suspended', 'Deleted', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Username variants, profile clues, screenshots' }
    ]
  },
  {
    id: 'email',
    label: 'Email Address',
    icon: FaEnvelope,
    color: 'bg-purple-600',
    description: 'An email address or mailbox identity.',
    category: 'technology',
    properties: [
      { id: 'address', label: 'Email Address', type: 'email', required: true, placeholder: 'jane@example.com' },
      { id: 'provider', label: 'Provider', type: 'text', placeholder: 'Gmail, Proton, Outlook' },
      { id: 'accountType', label: 'Email Type', type: 'select', options: ['Personal', 'Business', 'Temporary', 'Disposable', 'Unknown'] },
      { id: 'createdDate', label: 'Created Date', type: 'date', placeholder: '2020-01-01' },
      { id: 'lastActive', label: 'Last Active', type: 'date', placeholder: '2024-01-15' },
      { id: 'status', label: 'Email Status', type: 'select', options: ['Active', 'Inactive', 'Suspended', 'Deleted', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Aliases, mailbox access, breach exposure' }
    ]
  },
  {
    id: 'phone',
    label: 'Phone Number',
    icon: FaPhone,
    color: 'bg-green-600',
    description: 'A phone number, line, or subscriber identity.',
    category: 'technology',
    properties: [
      { id: 'number', label: 'Phone Number', type: 'phone', required: true, placeholder: '+47 400 00 000' },
      { id: 'phoneType', label: 'Phone Type', type: 'select', options: ['Mobile', 'Landline', 'VoIP', 'Satellite', 'Unknown'] },
      { id: 'carrier', label: 'Carrier', type: 'text', placeholder: 'Telenor' },
      { id: 'countryCode', label: 'Country Code', type: 'text', placeholder: '+47' },
      { id: 'registeredDate', label: 'Registered Date', type: 'date', placeholder: '2020-01-01' },
      { id: 'lastActive', label: 'Last Active', type: 'date', placeholder: '2024-01-15' },
      { id: 'status', label: 'Line Status', type: 'select', options: ['Active', 'Inactive', 'Suspended', 'Disconnected', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Subscriber details, call pattern, SIM swaps' }
    ]
  },
  {
    id: 'device',
    label: 'Device',
    icon: FaMobile,
    color: 'bg-slate-600',
    description: 'A physical device such as a phone, laptop, tablet, router, or IoT object.',
    category: 'technology',
    properties: [
      { id: 'name', label: 'Device Name', type: 'text', required: true, placeholder: 'Samsung Galaxy S24+' },
      { id: 'deviceType', label: 'Device Type', type: 'select', options: ['Smartphone', 'Laptop', 'Desktop', 'Tablet', 'Router', 'IoT Device', 'Storage', 'Other'] },
      { id: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'Samsung' },
      { id: 'model', label: 'Model', type: 'text', placeholder: 'Galaxy S24+' },
      { id: 'serialNumber', label: 'Serial Number', type: 'text', placeholder: 'ABC123456789' },
      { id: 'imei', label: 'IMEI / MEID', type: 'text', placeholder: '123456789012345' },
      { id: 'macAddress', label: 'MAC Address', type: 'text', placeholder: '00:1B:44:11:3A:B7' },
      { id: 'ipAddress', label: 'Current IP', type: 'text', placeholder: '192.168.1.100' },
      { id: 'os', label: 'Operating System', type: 'text', placeholder: 'Android 16' },
      { id: 'status', label: 'Device Status', type: 'select', options: ['Active', 'Inactive', 'Lost', 'Stolen', 'Destroyed', 'Unknown'] },
      { id: 'purchaseDate', label: 'Purchase Date', type: 'date', placeholder: '2023-09-15' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Identifiers, seizure notes, forensic status' }
    ]
  },
  {
    id: 'ip_address',
    label: 'IP Address',
    icon: FaNetworkWired,
    color: 'bg-cyan-600',
    description: 'An IPv4 or IPv6 address used as an investigative pivot.',
    category: 'technology',
    properties: [
      { id: 'ipAddress', label: 'IP Address', type: 'text', required: true, placeholder: '203.0.113.5' },
      { id: 'ipVersion', label: 'IP Version', type: 'select', options: ['IPv4', 'IPv6', 'Unknown'] },
      { id: 'asn', label: 'ASN', type: 'text', placeholder: 'AS13335' },
      { id: 'provider', label: 'Provider', type: 'text', placeholder: 'Cloudflare' },
      { id: 'reverseDns', label: 'Reverse DNS', type: 'text', placeholder: 'example.hosting.net' },
      { id: 'country', label: 'Country', type: 'text', placeholder: 'Norway' },
      { id: 'city', label: 'City', type: 'text', placeholder: 'Oslo' },
      { id: 'status', label: 'IP Status', type: 'select', options: ['Observed', 'Allocated', 'Unreachable', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Passive DNS, blocklist matches, geolocation caveats' }
    ]
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    icon: FaServer,
    color: 'bg-indigo-600',
    description: 'A server, cloud workload, network appliance, or hosting asset.',
    category: 'technology',
    properties: [
      { id: 'hostname', label: 'Hostname', type: 'text', required: true, placeholder: 'web-server-01' },
      { id: 'infrastructureType', label: 'Infrastructure Type', type: 'select', options: ['Server', 'Cloud Instance', 'DNS', 'Mail Server', 'Database', 'CDN', 'VPN', 'Load Balancer', 'Other'] },
      { id: 'provider', label: 'Provider', type: 'text', placeholder: 'AWS, Azure, Hetzner' },
      { id: 'os', label: 'Operating System', type: 'text', placeholder: 'Ubuntu 24.04' },
      { id: 'services', label: 'Services', type: 'textarea', placeholder: 'nginx, postgres, docker' },
      { id: 'ipAddress', label: 'Primary IP', type: 'text', placeholder: '198.51.100.42' },
      { id: 'region', label: 'Region', type: 'text', placeholder: 'eu-north-1' },
      { id: 'status', label: 'Infrastructure Status', type: 'select', options: ['Online', 'Offline', 'Maintenance', 'Unknown'] },
      { id: 'lastSeen', label: 'Last Seen', type: 'date', placeholder: '2024-01-15' },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Observed ports, hosting clues, linked services' }
    ]
  },
  {
    id: 'crypto_wallet',
    label: 'Crypto Wallet',
    icon: FaBitcoin,
    color: 'bg-yellow-600',
    description: 'A cryptocurrency wallet or blockchain address.',
    category: 'technology',
    properties: [
      { id: 'address', label: 'Wallet Address', type: 'text', required: true, placeholder: 'bc1q...' },
      { id: 'assetType', label: 'Asset Type', type: 'select', options: ['Bitcoin', 'Ethereum', 'Litecoin', 'Monero', 'Solana', 'Other'] },
      { id: 'balance', label: 'Balance', type: 'text', placeholder: '0.42 BTC' },
      { id: 'walletProvider', label: 'Wallet / Exchange', type: 'text', placeholder: 'Binance, Ledger, MetaMask' },
      { id: 'status', label: 'Wallet Status', type: 'select', options: ['Active', 'Dormant', 'Watchlisted', 'Unknown'] },
      { id: 'notes', label: 'Analyst Notes', type: 'textarea', placeholder: 'Cluster analysis, attribution clues, sanctions flags' }
    ]
  }
];
