import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Project } from '@archon/shared';

interface ProjectStore {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;

  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set) => ({
      projects:      [],
      activeProject: null,
      isLoading:     false,
      error:         null,

      setProjects:      (projects) => set({ projects }),
      setActiveProject: (project) => set({ activeProject: project }),

      addProject: (project) =>
        set((state) => ({ projects: [project, ...state.projects] })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p),
          activeProject: state.activeProject?.id === id
            ? { ...state.activeProject, ...updates }
            : state.activeProject,
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter(p => p.id !== id),
          activeProject: state.activeProject?.id === id ? null : state.activeProject,
        })),

      setLoading: (isLoading) => set({ isLoading }),
      setError:   (error)     => set({ error }),
    }),
    { name: 'ProjectStore' }
  )
);
