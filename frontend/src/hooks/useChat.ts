import { useCallback, useEffect } from 'react';
import { useChatStore } from '../store/chat.store';
import { useUIStore } from '../store/ui.store';
import { chatApi } from '../services/chat.api';
import { sendChatMessage, joinSession } from '../services/socket.client';
import type { ArtifactPayload } from '@archon/shared';

export function useChat(projectId: string) {
  const {
    sessions, activeSession, messages, streamingContent,
    isStreaming, agentStates, isLoading, error,
    setSessions, setActiveSession, setMessages, addMessage, setLoading, setError, resetAgentStates,
  } = useChatStore();

  const { setCurrentArtifactData, setActiveTab } = useUIStore();

  /** Create or load a session for this project */
  const initSession = useCallback(async () => {
    setLoading(true);
    try {
      // Create a new session for this project
      const session = await chatApi.createSession({ projectId });
      setActiveSession(session);
      joinSession(session.id);

      // Load history
      const history = await chatApi.getHistory(session.id);
      setMessages(history);

      // If history has artifacts, show the last one
      const lastArtifactMsg = [...history].reverse().find(m => m.artifacts?.length);
      if (lastArtifactMsg?.artifacts?.[0]) {
        try {
          const data = JSON.parse(lastArtifactMsg.artifacts[0].content) as ArtifactPayload;
          setCurrentArtifactData(data);
        } catch { /* ignore */ }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId, setActiveSession, setMessages, setLoading, setError, setCurrentArtifactData]);

  useEffect(() => { initSession(); }, [projectId]);

  const sendMessage = useCallback((content: string) => {
    if (!activeSession || !content.trim() || isStreaming) return;

    resetAgentStates();

    // Add user message optimistically
    addMessage({
      id: `temp-${Date.now()}`,
      sessionId: activeSession.id,
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    });

    // Send via WebSocket
    sendChatMessage(activeSession.id, projectId, content);
  }, [activeSession, projectId, isStreaming, addMessage, resetAgentStates]);

  return {
    activeSession, messages, streamingContent,
    isStreaming, agentStates, isLoading, error,
    sendMessage,
  };
}
