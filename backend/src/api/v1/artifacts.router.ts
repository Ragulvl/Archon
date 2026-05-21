import { Router } from 'express';
import * as ctrl from '../../controllers/artifacts.controller';

const router = Router();

router.get('/:projectId',          ctrl.getArtifacts);
router.get('/:projectId/latest',   ctrl.getLatestArtifact);
router.get('/:id/files',           ctrl.getArtifactFiles);

export default router;
