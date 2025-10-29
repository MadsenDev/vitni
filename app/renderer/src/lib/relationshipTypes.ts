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
}

export const relationshipTypes: RelationshipType[] = [
  {
    id: 'related_to',
    label: 'Related To',
    icon: FaLink,
    color: 'text-slate-400',
    description: 'General relationship between entities',
    bidirectional: true
  },
  {
    id: 'works_for',
    label: 'Works For',
    icon: FaBriefcase,
    color: 'text-blue-400',
    description: 'Employment or organizational relationship',
    bidirectional: false
  },
  {
    id: 'located_at',
    label: 'Located At',
    icon: FaMapMarkerAlt,
    color: 'text-red-400',
    description: 'Physical or geographical location',
    bidirectional: false
  },
  {
    id: 'attended',
    label: 'Attended',
    icon: FaCalendarAlt,
    color: 'text-purple-400',
    description: 'Event attendance or participation',
    bidirectional: false
  },
  {
    id: 'mentioned_in',
    label: 'Mentioned In',
    icon: FaFileAlt,
    color: 'text-yellow-400',
    description: 'Reference in document or file',
    bidirectional: false
  },
  {
    id: 'communicated_with',
    label: 'Communicated With',
    icon: FaComments,
    color: 'text-indigo-400',
    description: 'Communication or conversation',
    bidirectional: true
  },
  {
    id: 'paid',
    label: 'Paid',
    icon: FaDollarSign,
    color: 'text-emerald-400',
    description: 'Financial transaction or payment',
    bidirectional: false
  },
  {
    id: 'investigated',
    label: 'Investigated',
    icon: FaSearch,
    color: 'text-orange-400',
    description: 'Investigation or research relationship',
    bidirectional: false
  },
  {
    id: 'knows',
    label: 'Knows',
    icon: FaUser,
    color: 'text-cyan-400',
    description: 'Personal acquaintance or knowledge',
    bidirectional: true
  },
  {
    id: 'member_of',
    label: 'Member Of',
    icon: FaBuilding,
    color: 'text-green-400',
    description: 'Membership in organization or group',
    bidirectional: false
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
