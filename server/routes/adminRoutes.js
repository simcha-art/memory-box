import { Router } from 'express';
import { list, remove, update } from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/users', list);
router.patch('/users/:id', update);
router.delete('/users/:id', remove);

export default router;