import { Router } from 'express';
const router = Router();
import { getTask, postTask, getIdTask } from '../controllers/task.jsx';
import { requireAuth } from '@/middlewares/auth.js';

router.get('/', requireAuth, getTask);
router.post('/create', requireAuth, postTask)
router.get('/:id', requireAuth, getIdTask)
// router.put('/update/:id', putUsers)

export default router;
