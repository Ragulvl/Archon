import type { AgentType } from '../types/agent';
import type { IntentType } from '../types/chat';

/** Which agents run for each intent type */
export const INTENT_AGENT_MAP: Record<IntentType, AgentType[]> = {
  new_build:    ['PLANNER', 'ARCHITECTURE', 'DATABASE', 'BACKEND', 'FRONTEND'],
  modify_ui:    ['FRONTEND'],
  modify_api:   ['BACKEND'],
  modify_db:    ['DATABASE'],
  fix_bug:      ['REPAIR'],
  add_feature:  ['PLANNER', 'ARCHITECTURE', 'FRONTEND', 'BACKEND'],
  explain:      ['EXPLAIN'],
  regenerate:   ['PLANNER', 'ARCHITECTURE', 'DATABASE', 'BACKEND', 'FRONTEND'],
};

export const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  PLANNER:      '🗺️  Planner',
  ARCHITECTURE: '🏗️  Architecture',
  DATABASE:     '🗄️  Database',
  BACKEND:      '⚙️  Backend',
  FRONTEND:     '🎨  Frontend',
  REPAIR:       '🔧  Repair',
  EXPLAIN:      '📖  Explain',
};

/** Max tokens to use per agent call */
export const AGENT_TOKEN_BUDGETS: Record<AgentType, number> = {
  PLANNER:      1500,
  ARCHITECTURE: 4000,
  DATABASE:     3000,
  BACKEND:      6000,
  FRONTEND:     8000,
  REPAIR:       4000,
  EXPLAIN:      2000,
};

/** How many recent messages to inject as context */
export const CONTEXT_MESSAGE_WINDOW = 12;

/** Max characters of project context summary to inject */
export const MAX_CONTEXT_SUMMARY_CHARS = 2000;
