import { Router } from 'express';
import { NotificationListQuerySchema } from '@mams/types';
import { requireAuth } from '../middleware/auth.js';
import {
  listForUser,
  markAllRead,
  markRead,
  unreadCountForUser,
} from '../services/notification.service.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const q = NotificationListQuerySchema.parse(req.query);
    const result = await listForUser(req.auth!.sub, q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const unreadCount = await unreadCountForUser(req.auth!.sub);
    res.json({ unreadCount });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    const modifiedCount = await markAllRead(req.auth!.sub);
    res.json({ ok: true, modifiedCount });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await markRead(req.auth!.sub, req.params.id ?? '');
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
