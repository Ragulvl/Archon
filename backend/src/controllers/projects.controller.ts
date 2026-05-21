import { Request, Response, NextFunction } from 'express';
import * as projectsService from '../services/projects/projects.service';
import { ensureGuestUser } from '../services/projects/projects.service';

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    await ensureGuestUser();
    const projects = await projectsService.listProjects(req.auth.userId);
    res.json({ success: true, data: projects });
  } catch (err) { next(err); }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.getProject(req.params.id, req.auth.userId);
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    await ensureGuestUser();
    const project = await projectsService.createProject(req.auth.userId, req.body);
    res.status(201).json({ success: true, data: project });
  } catch (err) { next(err); }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.updateProject(req.params.id, req.auth.userId, req.body);
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    await projectsService.deleteProject(req.params.id, req.auth.userId);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
}
