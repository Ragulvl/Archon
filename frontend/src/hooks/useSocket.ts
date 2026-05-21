import { useEffect } from 'react';
import { getSocket, WS_EVENTS, joinSession } from '../services/socket.client';
import { useChatStore } from '../store/chat.store';
import { useUIStore } from '../store/ui.store';
import type { AgentState, ArtifactPayload, ChatMessage } from '@archon/shared';

export function useSocket(sessionId: string | null) {
  const { appendToken, commitStreamedMessage, setAgentState, resetAgentStates, setStreaming } = useChatStore();
  const { setCurrentArtifactData, setActiveTab } = useUIStore();

  useEffect(() => {
    if (!sessionId) return;

    const socket = getSocket();
    joinSession(sessionId);

    const onToken = ({ token }: { token: string }) => {
      appendToken(token);
    };

    // Server emits: { messageId, content, artifactIds }
    // We build the ChatMessage locally so the messages array always has valid objects
    const onDone = ({
      messageId,
      content,
      artifactIds,
    }: {
      messageId: string;
      content: string;
      artifactIds: string[];
    }) => {
      const message: ChatMessage = {
        id:        messageId ?? `msg-${Date.now()}`,
        sessionId: sessionId,
        role:      'ASSISTANT' as ChatMessage['role'],
        content:   content ?? '',
        createdAt: new Date().toISOString(),
      };
      commitStreamedMessage(message);
      resetAgentStates();
    };

    const onArtifactUpdate = ({ data }: { data: ArtifactPayload }) => {
      if (data) {
        setCurrentArtifactData(data);
        setActiveTab('architecture');
      }
    };

    const onAgentStatus = (state: AgentState) => {
      setAgentState(state);
    };

    const onError = ({ error }: { error: string }) => {
      useChatStore.getState().setError(error);
      useChatStore.getState().setStreaming(false);
      resetAgentStates();
    };

    socket.on(WS_EVENTS.CHAT_TOKEN,      onToken);
    socket.on(WS_EVENTS.CHAT_DONE,       onDone);
    socket.on(WS_EVENTS.ARTIFACT_UPDATE, onArtifactUpdate);
    socket.on(WS_EVENTS.AGENT_STATUS,    onAgentStatus);
    socket.on(WS_EVENTS.CHAT_ERROR,      onError);

    return () => {
      socket.off(WS_EVENTS.CHAT_TOKEN,      onToken);
      socket.off(WS_EVENTS.CHAT_DONE,       onDone);
      socket.off(WS_EVENTS.ARTIFACT_UPDATE, onArtifactUpdate);
      socket.off(WS_EVENTS.AGENT_STATUS,    onAgentStatus);
      socket.off(WS_EVENTS.CHAT_ERROR,      onError);
    };
  }, [sessionId, appendToken, commitStreamedMessage, setAgentState, resetAgentStates, setCurrentArtifactData, setActiveTab]);
}
