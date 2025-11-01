import type React from 'react';

export interface NodeProperty {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'url' | 'textarea' | 'select' | 'image';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  description?: string;
}

export interface NodeType {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  category: string;
  properties: NodeProperty[];
}

export interface NodeCategory {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}
