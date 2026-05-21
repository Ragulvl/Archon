import { useEffect, useCallback } from 'react';
import { useProjectStore } from '../store/project.store';
import { projectsApi } from '../services/projects.api';
import type { CreateProjectInput } from '@archon/shared';

export function useProjects() {
  const { projects, isLoading, error, setProjects, setLoading, setError, addProject, removeProject } = useProjectStore();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [setProjects, setLoading, setError]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (input: CreateProjectInput) => {
    const project = await projectsApi.create(input);
    addProject(project);
    return project;
  }, [addProject]);

  const remove = useCallback(async (id: string) => {
    await projectsApi.delete(id);
    removeProject(id);
  }, [removeProject]);

  return { projects, isLoading, error, create, remove, reload: load };
}
