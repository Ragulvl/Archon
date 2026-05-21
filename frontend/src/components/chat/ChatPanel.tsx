import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Loader2 } from 'lucide-react';
import type { ChatMessage, AgentState } from '@archon/shared';
import MessageBubble from './MessageBubble';
import StreamingMessage from './StreamingMessage';
import AgentStatusPanel from '../agent/AgentStatusPanel';

interface ChatPanelProps {
  projectName: string;
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  isLoading: boolean;
  agentStates: AgentState[];
  onSend: (content: string) => void;
}

export default function ChatPanel({
  projectName, messages, streamingContent, isStreaming, isLoading, agentStates, onSend,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isStreaming, onSend]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/20 bg-surface-1/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-violet/20 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-violet/70" />
          </div>
          <div>
            <p className="text-xs font-semibold line-clamp-1">{projectName}</p>
            <p className="text-[10px] text-muted-foreground/40">AI Engineering Session</p>
          </div>
        </div>
      </div>

      {/* Agent status bar */}
      {agentStates.length > 0 && (
        <div className="flex-shrink-0 border-b border-border/20">
          <AgentStatusPanel agentStates={agentStates} />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/30" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <EmptyChatState />
        )}

        <AnimatePresence initial={false}>
          {messages.filter(Boolean).map((msg) => (
            <motion.div
              key={msg.id ?? msg.createdAt}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageBubble message={msg} />
            </motion.div>
          ))}
        </AnimatePresence>

        {isStreaming && streamingContent && (
          <StreamingMessage content={streamingContent} />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-border/20 bg-surface-1/20">
        <div className={`flex items-end gap-2 bg-surface-2/40 border rounded-xl px-3 py-2.5 transition-all duration-200 ${
          isStreaming ? 'border-border/20 opacity-60' : 'border-border/30 focus-within:border-violet/40 focus-within:ring-1 focus-within:ring-violet/10'
        }`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); adjustHeight(); }}
            onKeyDown={handleKey}
            disabled={isStreaming}
            placeholder={isStreaming ? 'Generating…' : 'Describe what to build or change…'}
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground/90 placeholder:text-muted-foreground/30 resize-none outline-none leading-relaxed"
            style={{ minHeight: '20px', maxHeight: '180px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-violet/20 hover:bg-violet/30 border border-violet/30 text-violet disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isStreaming
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/25 mt-1.5 text-center">
          ↵ send · shift+↵ newline
        </p>
      </div>
    </div>
  );
}

function EmptyChatState() {
  const suggestions = [
    'Build a Zomato food delivery clone',
    'Create a Spotify music streaming app',
    'Build a project management tool like Jira',
    'Create an e-commerce store like Amazon',
  ];

  return (
    <div className="py-8 space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet/10 border border-violet/20 flex items-center justify-center mx-auto mb-3">
          <Bot className="w-6 h-6 text-violet/50" />
        </div>
        <h3 className="text-sm font-semibold mb-1">Ready to build</h3>
        <p className="text-xs text-muted-foreground/40">Describe your application below</p>
      </div>
      <div className="space-y-1.5">
        {suggestions.map(s => (
          <div key={s} className="text-xs text-muted-foreground/40 px-3 py-2 rounded-lg border border-border/15 bg-surface-2/20 font-mono truncate">
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
