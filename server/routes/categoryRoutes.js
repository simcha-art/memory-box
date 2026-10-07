import { Router } from 'express';
import { create, get, list, remove, update } from '../controllers/categoryController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.post('/', create);
router.get('/:id', get);
router.put('/:id', update);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
