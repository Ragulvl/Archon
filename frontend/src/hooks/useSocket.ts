import { useEffect } from 'react';
import { getSocket, WS_EVENTS, joinSession } from '../services/socket.client';
import { useChatStore } from '../store/chat.store';
import { useUIStore } from '../store/ui.store';
import { useFilesStore } from '../store/files.store';
import { filesApi } from '../services/files.api';
import type { AgentState, ArtifactPayload, ChatMessage, AgentType } from '@archon/shared';

export function useSocket(sessionId: string | null, projectId: string | null) {
  const { appendToken, commitStreamedMessage, setAgentState, resetAgentStates, setStreaming, setAgentPipeline } = useChatStore();
  const { setCurrentArtifactData, setActiveTab } = useUIStore();

  useEffect(() => {
    if (!sessionId) return;

    const socket = getSocket();
    joinSession(sessionId);

    const onFilesChanged = () => {
      if (!projectId) return;
      const { setFileTree, setFiles } = useFilesStore.getState();
      filesApi.tree(projectId).then(setFileTree).catch(console.error);
      filesApi.list(projectId).then(setFiles).catch(console.error);
    };

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

    const onAgentPipeline = ({ agents }: { agents: AgentType[] }) => {
      setAgentPipeline(agents);
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
    socket.on(WS_EVENTS.AGENT_PIPELINE,  onAgentPipeline);
    socket.on(WS_EVENTS.CHAT_ERROR,      onError);
    socket.on('files:created',           onFilesChanged);
    socket.on('files:updated',           onFilesChanged);

    return () => {
      socket.off(WS_EVENTS.CHAT_TOKEN,      onToken);
      socket.off(WS_EVENTS.CHAT_DONE,       onDone);
      socket.off(WS_EVENTS.ARTIFACT_UPDATE, onArtifactUpdate);
      socket.off(WS_EVENTS.AGENT_STATUS,    onAgentStatus);
      socket.off(WS_EVENTS.AGENT_PIPELINE,  onAgentPipeline);
      socket.off(WS_EVENTS.CHAT_ERROR,      onError);
      socket.off('files:created',           onFilesChanged);
      socket.off('files:updated',           onFilesChanged);
    };
  }, [sessionId, projectId, appendToken, commitStreamedMessage, setAgentState, resetAgentStates, setCurrentArtifactData, setActiveTab]);
}
