import { Router } from 'express';
import * as ctrl from '../../controllers/chat.controller';

const router = Router();

router.post('/session',              ctrl.createSession);
router.get('/session/:id',           ctrl.getSession);
router.get('/history/:sessionId',    ctrl.getHistory);
router.post('/message',              ctrl.sendMessage);

export default router;
