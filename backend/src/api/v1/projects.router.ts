import { Router } from 'express';
import * as ctrl from '../../controllers/projects.controller';

const router = Router();

router.get('/',          ctrl.listProjects);
router.post('/',         ctrl.createProject);
router.get('/:id',       ctrl.getProject);
router.patch('/:id',     ctrl.updateProject);
router.delete('/:id',    ctrl.deleteProject);

export default router;
