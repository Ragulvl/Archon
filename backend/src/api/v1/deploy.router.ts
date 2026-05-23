/**
 * Deploy API Router — Deployment management endpoints.
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as deployService from '../../services/deploy/deploy.service';

const router = Router();

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// POST /api/v1/deploy — Deploy a project
router.post('/', wrap(async (req, res) => {
  const { projectId, provider, apiToken, teamId, projectName, envVars } = req.body;
  if (!projectId || !provider) {
    res.status(400).json({ success: false, error: 'projectId and provider are required' });
    return;
  }

  const result = await deployService.deployProject({
    projectId,
    userId: req.auth.userId,
    provider,
    apiToken,
    teamId,
    projectName,
    envVars,
  });

  res.status(201).json({ success: true, data: result });
}));

// GET /api/v1/deploy/:id — Get deployment status
router.get('/:id', wrap(async (req, res) => {
  const deployment = await deployService.getDeploymentStatus(req.params.id);
  if (!deployment) {
    res.status(404).json({ success: false, error: 'Deployment not found' });
    return;
  }
  res.json({ success: true, data: deployment });
}));

// GET /api/v1/deploy/project/:projectId — List project deployments
router.get('/project/:projectId', wrap(async (req, res) => {
  const deployments = await deployService.listDeployments(req.params.projectId);
  res.json({ success: true, data: deployments });
}));

export default router;
