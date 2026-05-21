import { Request, Response, NextFunction } from 'express';
import { streamProjectZip } from '../services/export/zip.service';

export async function downloadZip(req: Request, res: Response, next: NextFunction) {
  try {
    await streamProjectZip(req.params.projectId, res);
  } catch (err) { next(err); }
}
