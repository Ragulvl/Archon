import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProjectStore } from '../store/project.store';
import { useUIStore } from '../store/ui.store';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { projectsApi } from '../services/projects.api';
import ChatPanel from '../components/chat/ChatPanel';
import ArtifactTabs from '../components/editor/ArtifactTabs';
import AgentStatusPanel from '../components/agent/AgentStatusPanel';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { activeProject, setActiveProject } = useProjectStore();
  const { activeTab } = useUIStore();
  const chat = useChat(id!);

  // Connect Socket.IO events for this session
  useSocket(chat.activeSession?.id ?? null);

  // Load project details
  useEffect(() => {
    if (!id) return;
    projectsApi.get(id)
      .then(setActiveProject)
      .catch(console.error);
    return () => setActiveProject(null);
  }, [id, setActiveProject]);

  if (!id) return null;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left: Chat Panel */}
      <div className="w-[360px] flex-shrink-0 border-r border-border/20 flex flex-col">
        <ChatPanel
          projectName={activeProject?.name ?? 'Loading…'}
          messages={chat.messages}
          streamingContent={chat.streamingContent}
          isStreaming={chat.isStreaming}
          isLoading={chat.isLoading}
          agentStates={chat.agentStates}
          onSend={chat.sendMessage}
        />
      </div>

      {/* Center: Code + Architecture + Preview tabs */}
      <div className="flex-1 flex flex-col min-w-0">
        <ArtifactTabs />
      </div>
    </div>
  );
}
