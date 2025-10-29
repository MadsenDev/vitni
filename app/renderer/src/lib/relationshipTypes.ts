import {
  FaLink,
  FaBriefcase,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaFileAlt,
  FaComments,
  FaDollarSign,
  FaSearch,
  FaUser,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaShieldAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import type React from 'react';

export interface RelationshipType {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  bidirectional: boolean;
  subtypes?: Array<{ id: string; label: string; description?: string }>;
}

export const relationshipTypes: RelationshipType[] = [
  {
    id: 'related_to',
    label: 'Related To',
    icon: FaLink,
    color: 'text-slate-400',
    description: 'General relationship between entities',
    bidirectional: true,
    subtypes: [
      { id: 'parent_of', label: 'Parent Of' },
      { id: 'child_of', label: 'Child Of' },
      { id: 'sibling_of', label: 'Sibling Of' },
      { id: 'spouse_of', label: 'Spouse Of' },
      { id: 'associate_of', label: 'Associate Of' }
    ]
  },
  {
    id: 'works_for',
    label: 'Works For',
    icon: FaBriefcase,
    color: 'text-blue-400',
    description: 'Employment or organizational relationship',
    bidirectional: false,
    subtypes: [
      { id: 'employee_of', label: 'Employee Of' },
      { id: 'contractor_for', label: 'Contractor For' },
      { id: 'volunteer_for', label: 'Volunteer For' },
      { id: 'founder_of', label: 'Founder Of' },
      { id: 'executive_at', label: 'Executive At' }
    ]
  },
  {
    id: 'located_at',
    label: 'Located At',
    icon: FaMapMarkerAlt,
    color: 'text-red-400',
    description: 'Physical or geographical location',
    bidirectional: false,
    subtypes: [
      { id: 'resides_at', label: 'Resides At' },
      { id: 'registered_at', label: 'Registered At' },
      { id: 'headquartered_at', label: 'Headquartered At' }
    ]
  },
  {
    id: 'attended',
    label: 'Attended',
    icon: FaCalendarAlt,
    color: 'text-purple-400',
    description: 'Event attendance or participation',
    bidirectional: false,
    subtypes: [
      { id: 'attended', label: 'Attended' },
      { id: 'organized', label: 'Organized' },
      { id: 'spoke_at', label: 'Spoke At' }
    ]
  },
  {
    id: 'mentioned_in',
    label: 'Mentioned In',
    icon: FaFileAlt,
    color: 'text-yellow-400',
    description: 'Reference in document or file',
    bidirectional: false,
    subtypes: [
      { id: 'cited_in', label: 'Cited In' },
      { id: 'named_in', label: 'Named In' }
    ]
  },
  {
    id: 'communicated_with',
    label: 'Communicated With',
    icon: FaComments,
    color: 'text-indigo-400',
    description: 'Communication or conversation',
    bidirectional: true,
    subtypes: [
      { id: 'called', label: 'Called' },
      { id: 'emailed', label: 'Emailed' },
      { id: 'messaged', label: 'Messaged' },
      { id: 'met_with', label: 'Met With' }
    ]
  },
  {
    id: 'paid',
    label: 'Paid',
    icon: FaDollarSign,
    color: 'text-emerald-400',
    description: 'Financial transaction or payment',
    bidirectional: false,
    subtypes: [
      { id: 'paid', label: 'Paid' },
      { id: 'received_from', label: 'Received From' },
      { id: 'donated_to', label: 'Donated To' }
    ]
  },
  {
    id: 'investigated',
    label: 'Investigated',
    icon: FaSearch,
    color: 'text-orange-400',
    description: 'Investigation or research relationship',
    bidirectional: false,
    subtypes: [
      { id: 'researched', label: 'Researched' },
      { id: 'audited', label: 'Audited' }
    ]
  },
  {
    id: 'knows',
    label: 'Knows',
    icon: FaUser,
    color: 'text-cyan-400',
    description: 'Personal acquaintance or knowledge',
    bidirectional: true,
    subtypes: [
      { id: 'friend_of', label: 'Friend Of' },
      { id: 'colleague_of', label: 'Colleague Of' },
      { id: 'neighbor_of', label: 'Neighbor Of' }
    ]
  },
  {
    id: 'member_of',
    label: 'Member Of',
    icon: FaBuilding,
    color: 'text-green-400',
    description: 'Membership in organization or group',
    bidirectional: false,
    subtypes: [
      { id: 'member_of', label: 'Member Of' },
      { id: 'affiliate_of', label: 'Affiliate Of' }
    ]
  },
  {
    id: 'called',
    label: 'Called',
    icon: FaPhone,
    color: 'text-pink-400',
    description: 'Phone call or contact',
    bidirectional: false
  },
  {
    id: 'emailed',
    label: 'Emailed',
    icon: FaEnvelope,
    color: 'text-violet-400',
    description: 'Email communication',
    bidirectional: false
  },
  {
    id: 'visited',
    label: 'Visited',
    icon: FaGlobe,
    color: 'text-teal-400',
    description: 'Website or location visit',
    bidirectional: false
  },
  {
    id: 'protected',
    label: 'Protected',
    icon: FaShieldAlt,
    color: 'text-lime-400',
    description: 'Security or protection relationship',
    bidirectional: false
  },
  {
    id: 'threatened',
    label: 'Threatened',
    icon: FaExclamationTriangle,
    color: 'text-red-500',
    description: 'Threat or warning relationship',
    bidirectional: false
  }
];
