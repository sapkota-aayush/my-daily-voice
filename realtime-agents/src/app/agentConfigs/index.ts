import type { RealtimeAgent } from '@openai/agents/realtime';
import { journalScenario } from './journalAgent';

export const allAgentSets: Record<string, RealtimeAgent[]> = {
  journal: journalScenario,
};

export const defaultAgentSetKey = 'journal';
