const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/newsController');

const hrAdmin  = authorize('admin','hr');
const allRoles = authorize('admin','hr','supervisor','employee');

router.get ('/',           authenticate, allRoles, ctrl.getNews);
router.get ('/:id/stats',  authenticate, hrAdmin,  ctrl.getNewsStats);
router.get ('/:id',        authenticate, allRoles, ctrl.getNewsDetail);
router.post('/',           authenticate, hrAdmin,  ctrl.createNews);
router.put ('/:id',        authenticate, hrAdmin,  ctrl.updateNews);
router.delete('/:id',      authenticate, hrAdmin,  ctrl.deleteNews);
router.post('/:id/like',   authenticate, allRoles, ctrl.toggleLike);

module.exports = router;
