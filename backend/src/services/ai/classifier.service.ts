import { callAI, LLMMessage } from './router.service';
import type { IntentType } from '@archon/shared';

const CLASSIFIER_SYSTEM = `You are an intent classifier for an AI software engineering platform.
Classify the user message into exactly ONE of these intent types:
- new_build: user wants to create a completely new application
- modify_ui: user wants to change only the frontend/UI
- modify_api: user wants to change only the API/backend
- modify_db: user wants to change only the database schema
- fix_bug: user wants to fix an existing bug
- add_feature: user wants to add a new feature to existing app
- explain: user wants an explanation without code generation
- regenerate: user wants to regenerate the entire project

Return ONLY a JSON object: { "intent": "<type>", "confidence": 0.0-1.0, "reasoning": "..." }`;

export interface ClassificationResult {
  intent: IntentType;
  confidence: number;
  reasoning: string;
}

export async function classifyIntent(
  userMessage: string,
  projectContext?: string
): Promise<ClassificationResult> {
  const messages: LLMMessage[] = [
    { role: 'system', content: CLASSIFIER_SYSTEM },
    {
      role: 'user',
      content: projectContext
        ? `Project context: ${projectContext.slice(0, 500)}\n\nUser message: "${userMessage}"`
        : `User message: "${userMessage}"`,
    },
  ];

  try {
    const result = await callAI(messages, {
      maxTokens: 200,
      temperature: 0.1,
      responseFormat: 'json_object',
    });

    const parsed = JSON.parse(result.content) as ClassificationResult;
    // Validate intent
    const validIntents: IntentType[] = [
      'new_build', 'modify_ui', 'modify_api', 'modify_db',
      'fix_bug', 'add_feature', 'explain', 'regenerate',
    ];
    if (!validIntents.includes(parsed.intent)) {
      parsed.intent = 'new_build'; // safe default
    }
    return parsed;
  } catch {
    // Fallback: simple keyword matching
    return heuristicClassify(userMessage);
  }
}

function heuristicClassify(message: string): ClassificationResult {
  const m = message.toLowerCase();

  if (m.includes('fix') || m.includes('bug') || m.includes('error') || m.includes('broken'))
    return { intent: 'fix_bug', confidence: 0.7, reasoning: 'keyword: fix/bug/error' };
  if (m.includes('change') && (m.includes('ui') || m.includes('design') || m.includes('style') || m.includes('frontend')))
    return { intent: 'modify_ui', confidence: 0.7, reasoning: 'keyword: change + ui/design' };
  if (m.includes('add') && !m.includes('build') && !m.includes('create'))
    return { intent: 'add_feature', confidence: 0.65, reasoning: 'keyword: add feature' };
  if (m.includes('explain') || m.includes('what is') || m.includes('how does'))
    return { intent: 'explain', confidence: 0.8, reasoning: 'keyword: explain/what/how' };

  return { intent: 'new_build', confidence: 0.5, reasoning: 'default fallback' };
}
