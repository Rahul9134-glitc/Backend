import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware';
import {
  updateComment,
  getVideoComment,
  deleteComment,
  addComment,
} from '../controllers/comment.controller';

const router = Router();

router.use(verifyJWT);
router.route('/:videoId').get(getVideoComment).post(addComment);
router.route('/c/:commentId').delete(deleteComment).patch(updateComment);

export default router;
