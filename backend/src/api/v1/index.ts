import { Router } from 'express';
import projectsRouter   from './projects.router';
import chatRouter       from './chat.router';
import artifactsRouter  from './artifacts.router';
import exportRouter     from './export.router';
import filesRouter      from './files.router';
import versionsRouter   from './versions.router';
import authRouter       from './auth.router';
import deployRouter     from './deploy.router';
import { APP_VERSION }  from '../../config/constants';

const router = Router();

// Auth routes (no auth middleware on register/login)
router.use('/auth',      authRouter);

// Resource routes
router.use('/',          filesRouter);      // /files, /folders, /projects/:id/files, /projects/:id/tree
router.use('/',          versionsRouter);   // /projects/:id/snapshots, /snapshots/:id
router.use('/projects',  projectsRouter);
router.use('/chat',      chatRouter);
router.use('/artifacts', artifactsRouter);
router.use('/export',    exportRouter);
router.use('/deploy',    deployRouter);

router.get('/stats', (_req, res) => {
  res.json({ success: true, data: { version: APP_VERSION, uptime: process.uptime() } });
});

export default router;
