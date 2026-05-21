import { Request, Response, NextFunction } from 'express';
import * as artifactsService from '../services/artifacts/artifacts.service';

export async function getArtifacts(req: Request, res: Response, next: NextFunction) {
  try {
    const artifacts = await artifactsService.getProjectArtifacts(req.params.projectId);
    res.json({ success: true, data: artifacts });
  } catch (err) { next(err); }
}

export async function getArtifactFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const files = await artifactsService.getArtifactFiles(req.params.id);
    res.json({ success: true, data: files });
  } catch (err) { next(err); }
}

export async function getLatestArtifact(req: Request, res: Response, next: NextFunction) {
  try {
    const artifact = await artifactsService.getLatestArtifact(req.params.projectId);
    res.json({ success: true, data: artifact });
  } catch (err) { next(err); }
}
