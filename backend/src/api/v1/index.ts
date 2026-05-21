import { Router } from 'express';
import projectsRouter   from './projects.router';
import chatRouter       from './chat.router';
import artifactsRouter  from './artifacts.router';
import exportRouter     from './export.router';
import { APP_VERSION }  from '../../config/constants';

const router = Router();

router.use('/projects',  projectsRouter);
router.use('/chat',      chatRouter);
router.use('/artifacts', artifactsRouter);
router.use('/export',    exportRouter);

router.get('/stats', (_req, res) => {
  res.json({ success: true, data: { version: APP_VERSION, uptime: process.uptime() } });
});

export default router;
