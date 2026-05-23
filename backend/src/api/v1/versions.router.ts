/**
 * Versions API Router — Project snapshots and rollback.
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as versionsService from '../../services/versions/versions.service';

const router = Router();

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// GET /api/v1/projects/:projectId/snapshots — List all snapshots
router.get('/projects/:projectId/snapshots', wrap(async (req, res) => {
  const snapshots = await versionsService.listSnapshots(req.params.projectId);
  res.json({ success: true, data: snapshots });
}));

// GET /api/v1/snapshots/:id — Get snapshot details
router.get('/snapshots/:id', wrap(async (req, res) => {
  const snapshot = await versionsService.getSnapshot(req.params.id);
  if (!snapshot) {
    res.status(404).json({ success: false, error: 'Snapshot not found' });
    return;
  }
  res.json({ success: true, data: snapshot });
}));

// POST /api/v1/projects/:projectId/snapshots — Create manual snapshot
router.post('/projects/:projectId/snapshots', wrap(async (req, res) => {
  const { label, description } = req.body;
  const snapshot = await versionsService.createSnapshot({
    projectId: req.params.projectId,
    label,
    description,
    trigger: 'manual',
  });
  res.status(201).json({ success: true, data: snapshot });
}));

// POST /api/v1/projects/:projectId/restore/:snapshotId — Restore snapshot
router.post('/projects/:projectId/restore/:snapshotId', wrap(async (req, res) => {
  const result = await versionsService.restoreSnapshot(
    req.params.projectId,
    req.params.snapshotId
  );
  res.json({ success: true, data: result });
}));

// GET /api/v1/projects/:projectId/compare — Compare two versions
router.get('/projects/:projectId/compare', wrap(async (req, res) => {
  const from = parseInt(req.query.from as string);
  const to = parseInt(req.query.to as string);
  if (isNaN(from) || isNaN(to)) {
    res.status(400).json({ success: false, error: 'from and to version numbers required' });
    return;
  }
  const comparison = await versionsService.compareSnapshots(req.params.projectId, from, to);
  res.json({ success: true, data: comparison });
}));

export default router;
