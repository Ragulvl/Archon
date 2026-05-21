import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, Trash2, Clock, Layers, Zap, ArrowRight } from 'lucide-react';
import { useProjects } from '../hooks/useProject';
import type { Project } from '@archon/shared';

export default function HomePage() {
  const { projects, isLoading, error, create, remove } = useProjects();
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName]     = useState('');
  const [creating, setCreating]   = useState(false);
  const navigate = useNavigate();

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const project = await create({ name: newName.trim() });
      setShowModal(false);
      setNewName('');
      navigate(`/projects/${project.id}`);
    } finally {
      setCreating(false);
    }
  }, [newName, create, navigate]);

  return (
    <div className="h-full flex flex-col overflow-auto bg-background">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-border/20 bg-surface-1/30">
        <div className="absolute inset-0 bg-gradient-to-br from-violet/5 via-transparent to-purple/5" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet/5 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet/20 border border-violet/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-violet" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Archon Platform</h1>
              <p className="text-sm text-muted-foreground/50">AI-powered software engineering</p>
            </div>
          </div>
          <p className="text-muted-foreground/60 text-sm max-w-lg leading-relaxed">
            Describe your application. Archon generates the full architecture, database schema, API, and working React frontend — with persistent memory for continuous iteration.
          </p>
        </div>
      </div>

      {/* Projects grid */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-foreground/70">
            Your Projects
            {projects.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground/40 font-normal">({projects.length})</span>
            )}
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-violet/20 hover:bg-violet/30 border border-violet/30 rounded-lg text-xs font-medium text-violet transition-all duration-200 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 rounded-xl bg-surface-1/50 border border-border/20 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red/20 bg-red/5 p-4 text-sm text-red/70 font-mono">
            {error}
          </div>
        )}

        {!isLoading && projects.length === 0 && (
          <EmptyState onNew={() => setShowModal(true)} />
        )}

        {!isLoading && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {projects.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={i}
                  onOpen={() => navigate(`/projects/${project.id}`)}
                  onDelete={() => remove(project.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-surface-1 border border-border/30 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-base font-semibold mb-1">New Project</h3>
              <p className="text-xs text-muted-foreground/50 mb-4">Give your project a name to get started.</p>

              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Zomato Clone, E-commerce App…"
                className="w-full bg-surface-2/50 border border-border/30 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-violet/50 focus:ring-1 focus:ring-violet/20 placeholder:text-muted-foreground/30 transition-all"
              />

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setShowModal(false); setNewName(''); }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm text-muted-foreground/60 hover:text-muted-foreground/80 hover:bg-surface-2/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet/20 hover:bg-violet/30 border border-violet/30 text-violet disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {creating ? 'Creating…' : (
                    <><Plus className="w-3.5 h-3.5" /> Create</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectCard({ project, index, onOpen, onDelete }: {
  project: Project; index: number; onOpen: () => void; onDelete: () => void;
}) {
  const [hovering, setHovering] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group relative bg-surface-1/50 border border-border/20 rounded-xl p-5 cursor-pointer hover:border-violet/30 hover:bg-surface-1/70 transition-all duration-300 hover:shadow-[0_4px_30px_rgba(139,92,246,0.08)]"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-violet/10 border border-violet/20 flex items-center justify-center flex-shrink-0">
          <Layers className="w-4 h-4 text-violet/70" />
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red/10 hover:text-red/70 text-muted-foreground/30 transition-all duration-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <h3 className="font-semibold text-sm mb-1 line-clamp-1">{project.name}</h3>
      {project.description && (
        <p className="text-xs text-muted-foreground/50 mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/30 font-mono">
          <Clock className="w-3 h-3" />
          {new Date(project.updatedAt).toLocaleDateString()}
        </div>
        <motion.div
          animate={{ x: hovering ? 0 : 4, opacity: hovering ? 1 : 0 }}
          className="flex items-center gap-1 text-[11px] text-violet/70 font-medium"
        >
          Open <ArrowRight className="w-3 h-3" />
        </motion.div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-violet/10 border border-violet/20 flex items-center justify-center">
          <FolderOpen className="w-8 h-8 text-violet/40" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-surface-2 border border-border/30 flex items-center justify-center">
          <Plus className="w-4 h-4 text-violet/60" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-base mb-1">No projects yet</h3>
        <p className="text-sm text-muted-foreground/50 max-w-xs">Create your first project and start building with AI.</p>
      </div>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-5 py-2.5 bg-violet/20 hover:bg-violet/30 border border-violet/30 rounded-xl text-sm font-medium text-violet transition-all duration-200 hover:shadow-[0_0_25px_rgba(139,92,246,0.2)]"
      >
        <Plus className="w-4 h-4" /> Create Project
      </button>
    </div>
  );
}
