import type { AppStateSnapshot, NodeCreationModalState } from '@renderer/types/app';

export type StepActions = {
  setNodeCreationModal: (s: NodeCreationModalState) => void;
  createTutorialProject: () => void;
};

export type TooltipSide = 'center' | 'bottom-center' | 'bottom' | 'top' | 'right' | 'left';

export type TutorialStepDef = {
  id: string;
  title: string;
  body: string;
  targetId?: string;
  tooltipSide: TooltipSide;
  completionCheck?: (snap: AppStateSnapshot) => boolean;
  onEnter?: (actions: StepActions) => void;
  nextLabel?: string;
};

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 'intro',
    title: 'Welcome to Vitni',
    body: "Let's build your first investigation together. We'll trace a fictional fraud suspect — Marcus Webb — from a name to a network of linked entities. Follows along in about 3 minutes.",
    tooltipSide: 'center',
    nextLabel: "Let's go →",
  },
  {
    id: 'create-project',
    title: 'Creating your case file…',
    body: 'Setting up a temporary tutorial project called "Operation Glass Harbor". No file picker needed — this one lives in your system temp folder and won\'t clutter your projects.',
    tooltipSide: 'center',
    completionCheck: (s) => !s.showWelcome && s.graphLoaded,
    onEnter: ({ createTutorialProject }) => createTutorialProject(),
  },
  {
    id: 'workspace',
    title: 'Your investigation workspace',
    body: 'Three panels: the node palette on the left, the canvas in the centre, the Inspector on the right. The Inspector shows details for whatever you select. You\'ll spend most of your time here.',
    tooltipSide: 'center',
    nextLabel: 'Got it →',
  },
  {
    id: 'add-person',
    title: 'Add your suspect',
    body: 'A creation form just opened. Enter "Marcus" as first name and "Webb" as last name, then click Add. The node will appear on the canvas.',
    tooltipSide: 'bottom-center',
    completionCheck: (s) => s.graph.nodes.some((n) => n.type === 'person'),
    onEnter: ({ setNodeCreationModal }) =>
      setNodeCreationModal({ isOpen: true, nodeTypeId: 'person', position: null }),
  },
  {
    id: 'add-domain',
    title: "Add Marcus's domain",
    body: 'Good. Now add a Domain node. Enter "marcuswebb.net" in the domain name field and click Add.',
    tooltipSide: 'bottom-center',
    completionCheck: (s) => s.graph.nodes.some((n) => n.type === 'domain'),
    onEnter: ({ setNodeCreationModal }) =>
      setNodeCreationModal({ isOpen: true, nodeTypeId: 'domain', position: null }),
  },
  {
    id: 'add-relationship',
    title: 'Link them together',
    body: 'Click the Relationship tool button (chain link icon) in the toolbar. Then drag from Marcus Webb to the domain node on the canvas to create a connection.',
    targetId: 'toolbar-relationship-tool',
    tooltipSide: 'bottom',
    completionCheck: (s) => s.graph.edges.length > 0,
  },
  {
    id: 'switch-review',
    title: 'Review your evidence',
    body: 'Click "Review" in the workspace switcher at the top of the screen. Every piece of information in Vitni passes through Review before it\'s considered part of the case.',
    targetId: 'toolbar-review-tab',
    tooltipSide: 'bottom',
    completionCheck: (s) => s.view === 'review',
  },
  {
    id: 'done',
    title: "You're ready.",
    body: 'You created a graph, linked entities, and navigated the review workflow. Real investigations work exactly the same way — just with real data. Close this and start building.',
    tooltipSide: 'center',
    nextLabel: 'Close tutorial',
  },
];
