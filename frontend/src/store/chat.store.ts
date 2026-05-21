import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatSession, ChatMessage, AgentState } from '@archon/shared';

interface ChatStore {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  agentStates: AgentState[];
  isLoading: boolean;
  error: string | null;

  setSessions: (sessions: ChatSession[]) => void;
  setActiveSession: (session: ChatSession | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  appendToken: (token: string) => void;
  commitStreamedMessage: (message: ChatMessage) => void;
  setAgentState: (state: AgentState) => void;
  resetAgentStates: () => void;
  setStreaming: (streaming: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatStore>()(
  devtools(
    (set) => ({
      sessions:         [],
      activeSession:    null,
      messages:         [],
      streamingContent: '',
      isStreaming:      false,
      agentStates:      [],
      isLoading:        false,
      error:            null,

      setSessions:      (sessions) => set({ sessions }),
      setActiveSession: (session) => set({ activeSession: session, messages: [], streamingContent: '' }),
      setMessages:      (messages) => set({ messages }),
      addMessage:       (message) => set((state) => ({ messages: [...state.messages, message] })),

      appendToken: (token) =>
        set((state) => ({
          isStreaming:      true,
          streamingContent: state.streamingContent + token,
        })),

      commitStreamedMessage: (message) =>
        set((state) => ({
          messages:         [...state.messages, message],
          streamingContent: '',
          isStreaming:      false,
        })),

      setAgentState: (agentState) =>
        set((state) => ({
          agentStates: state.agentStates.some(a => a.agent === agentState.agent)
            ? state.agentStates.map(a => a.agent === agentState.agent ? { ...a, ...agentState } : a)
            : [...state.agentStates, agentState],
        })),

      resetAgentStates: () => set({ agentStates: [], streamingContent: '', isStreaming: false }),

      setStreaming: (isStreaming) => set({ isStreaming }),
      setLoading:  (isLoading)   => set({ isLoading }),
      setError:    (error)        => set({ error }),
    }),
    { name: 'ChatStore' }
  )
);
