import { Router } from 'express';
import { create, download, get, list, related, remove, search, update } from '../controllers/itemController.js';
import { authenticate } from '../middleware/authenticate.js';
import { uploadSingleFile } from '../middleware/upload.js';

const router = Router();
router.use(authenticate);

router.get('/search', search);
router.get('/:id/related', related);
router.get('/:id/file', download);
router.get('/', list);
router.post('/', uploadSingleFile, create);
router.get('/:id', get);
router.put('/:id', uploadSingleFile, update);
router.patch('/:id', uploadSingleFile, update);
router.delete('/:id', remove);

export default router;
