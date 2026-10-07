import { Router } from 'express';
import { create, get, list, remove, upcoming, update } from '../controllers/reminderController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/upcoming', upcoming);
router.get('/', list);
router.post('/', create);
router.get('/:id', get);
router.patch('/:id', update);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
