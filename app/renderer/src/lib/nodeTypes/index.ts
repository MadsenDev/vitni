import { peopleNodeTypes } from './people';
import { organizationNodeTypes } from './organizations';
import { technologyNodeTypes } from './technology';
import { evidenceNodeTypes } from './evidence';

export type { NodeType, NodeProperty, NodeCategory } from './types';

export const nodeTypes = [
  ...peopleNodeTypes,
  ...organizationNodeTypes,
  ...technologyNodeTypes,
  ...evidenceNodeTypes
];
