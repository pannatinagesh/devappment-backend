import { Router } from 'express';
const router = Router();
import { getUsers, putUsers, refreshToken, signin, signup } from '../controllers/user.jsx';
import { requireAuth } from '../middlewares/auth.jsx';

router.post('/signin', signin);
router.post('/signup', signup);
router.post('/refresh-token', refreshToken);

// Protected routes: require a valid access token (401 otherwise).
router.get('/', requireAuth, getUsers);
router.put('/update/:id', requireAuth, putUsers);

export default router;