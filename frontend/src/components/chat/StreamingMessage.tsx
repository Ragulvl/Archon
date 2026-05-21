import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

interface Props { content: string; }

export default function StreamingMessage({ content }: Props) {
  return (
    <div className="flex gap-2.5">
      <div className="w-6 h-6 rounded-md bg-violet/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-violet/70" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 bg-surface-2/40 border border-border/20 text-xs text-foreground/85 leading-relaxed">
        <div className="whitespace-pre-wrap break-words">
          {content}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
            className="inline-block w-0.5 h-3.5 bg-violet/60 ml-0.5 align-text-bottom"
          />
        </div>
      </div>
    </div>
  );
}
