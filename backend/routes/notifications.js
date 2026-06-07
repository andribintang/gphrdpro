const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.use(authenticate);

router.get('/',             ctrl.getMyNotifs);
router.get('/count',        ctrl.getUnreadCount);
router.patch('/read-all',   ctrl.markAllRead);
router.delete('/clear-all', ctrl.clearAll);
router.patch('/:id/read',   ctrl.markRead);
router.delete('/:id',       ctrl.deleteNotif);
router.post('/announce',    ctrl.announce);
router.post('/check-triggers', ctrl.checkTriggers);

module.exports = router;
