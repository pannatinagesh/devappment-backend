import { Router } from 'express';
import { requireAuth } from '@/middlewares/auth.js';
import { getChat, postChat } from '../controllers/chat.jsx';

const router = Router();

router.get('/', requireAuth, getChat);
router.post('/', requireAuth, postChat);

export default router;
