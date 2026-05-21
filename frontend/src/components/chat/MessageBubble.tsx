import type { ChatMessage } from '@archon/shared';
import { Bot, User } from 'lucide-react';

interface Props { message: ChatMessage; }

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'USER';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-md bg-violet/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-violet/70" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
        isUser
          ? 'bg-violet/20 border border-violet/30 text-foreground/90 rounded-tr-sm'
          : 'bg-surface-2/40 border border-border/20 text-foreground/85 rounded-tl-sm'
      }`}>
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        <div className="text-[9px] text-muted-foreground/25 mt-1 font-mono">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div className="w-6 h-6 rounded-md bg-surface-2/50 border border-border/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
}
