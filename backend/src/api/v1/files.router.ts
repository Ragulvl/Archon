/**
 * Files API Router — Full CRUD for project files.
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as filesService from '../../services/files/files.service';

const router = Router();

// Wrap async handlers
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// GET /api/v1/projects/:projectId/files — List project files (flat)
router.get('/projects/:projectId/files', wrap(async (req, res) => {
  const files = await filesService.listFiles(req.params.projectId);
  res.json({ success: true, data: files });
}));

// GET /api/v1/projects/:projectId/tree — Get file tree
router.get('/projects/:projectId/tree', wrap(async (req, res) => {
  const tree = await filesService.getFileTree(req.params.projectId);
  res.json({ success: true, data: tree });
}));

// GET /api/v1/files/:id — Read file
router.get('/files/:id', wrap(async (req, res) => {
  const file = await filesService.readFile(req.params.id);
  res.json({ success: true, data: file });
}));

// GET /api/v1/files/:id/versions — Get file version history
router.get('/files/:id/versions', wrap(async (req, res) => {
  const versions = await filesService.getFileVersions(req.params.id);
  res.json({ success: true, data: versions });
}));

// POST /api/v1/files — Create file
router.post('/files', wrap(async (req, res) => {
  const { projectId, path, content, language } = req.body;
  if (!projectId || !path) {
    res.status(400).json({ success: false, error: 'projectId and path are required' });
    return;
  }
  const file = await filesService.createFile({ projectId, path, content: content ?? '', language });
  res.status(201).json({ success: true, data: file });
}));

// PATCH /api/v1/files/:id — Update file content
router.patch('/files/:id', wrap(async (req, res) => {
  const { content } = req.body;
  if (content === undefined) {
    res.status(400).json({ success: false, error: 'content is required' });
    return;
  }
  const file = await filesService.updateFile(req.params.id, { content });
  res.json({ success: true, data: file });
}));

// DELETE /api/v1/files/:id — Delete file
router.delete('/files/:id', wrap(async (req, res) => {
  await filesService.deleteFile(req.params.id);
  res.json({ success: true, data: { deleted: true } });
}));

// POST /api/v1/files/move — Move/rename file
router.post('/files/move', wrap(async (req, res) => {
  const { fileId, newPath } = req.body;
  if (!fileId || !newPath) {
    res.status(400).json({ success: false, error: 'fileId and newPath are required' });
    return;
  }
  const file = await filesService.moveFile(fileId, { newPath });
  res.json({ success: true, data: file });
}));

// POST /api/v1/folders — Create folder
router.post('/folders', wrap(async (req, res) => {
  const { projectId, path } = req.body;
  if (!projectId || !path) {
    res.status(400).json({ success: false, error: 'projectId and path are required' });
    return;
  }
  const folder = await filesService.createFolder(projectId, path);
  res.status(201).json({ success: true, data: folder });
}));

// POST /api/v1/files/:id/restore — Restore file to specific version
router.post('/files/:id/restore', wrap(async (req, res) => {
  const { versionId } = req.body;
  if (!versionId) {
    res.status(400).json({ success: false, error: 'versionId is required' });
    return;
  }
  const file = await filesService.restoreFileVersion(req.params.id, versionId);
  res.json({ success: true, data: file });
}));

export default router;
