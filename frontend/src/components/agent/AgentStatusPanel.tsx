import { motion } from 'framer-motion';
import type { AgentState } from '@archon/shared';
import { AGENT_DISPLAY_NAMES } from '@archon/shared';

interface Props { agentStates: AgentState[]; }

const STATUS_COLOR: Record<AgentState['status'], string> = {
  idle:    'text-muted-foreground/30',
  running: 'text-violet',
  done:    'text-green',
  error:   'text-red',
  skipped: 'text-muted-foreground/20',
};

export default function AgentStatusPanel({ agentStates }: Props) {
  return (
    <div className="px-4 py-2.5 space-y-1.5 bg-surface-1/20">
      <p className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-wider mb-2">
        Agent Pipeline
      </p>
      {agentStates.map((state) => (
        <div key={state.agent} className="flex items-center gap-2">
          <div className={`text-[10px] font-medium ${STATUS_COLOR[state.status]}`}>
            {AGENT_DISPLAY_NAMES[state.agent]}
          </div>
          {state.status === 'running' && (
            <motion.div
              className="flex gap-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full bg-violet/60"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                />
              ))}
            </motion.div>
          )}
          {state.status === 'done' && (
            <span className="text-[9px] text-green/60 font-mono">✓</span>
          )}
          {state.status === 'error' && (
            <span className="text-[9px] text-red/60 font-mono">✗</span>
          )}
        </div>
      ))}
    </div>
  );
}
