import { Router } from 'express';
import { downloadZip } from '../../controllers/export.controller';

const router = Router();
router.get('/zip/:projectId', downloadZip);

export default router;
