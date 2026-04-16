const router = require('express').Router();
const ctrl = require('../controller/progress.controller');
const { protect } = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/validate.middleware');
const {
  createProgressSchema,
  progressIdParam,
  updateProgressSchema,
  progressStatsQuery,
} = require('../validation/progress.validation');

router.use(protect);

router.post('/', validate(createProgressSchema), ctrl.logProgress);
router.get('/stats', validate(progressStatsQuery, { source: 'query' }), ctrl.getStats);
router.get('/', ctrl.getMyProgress);
router.get(
  '/:id',
  validate(progressIdParam, { source: 'params' }),
  ctrl.getProgressById
);
router.patch(
  '/:id',
  validate(progressIdParam, { source: 'params' }),
  validate(updateProgressSchema),
  ctrl.updateProgress
);
router.delete(
  '/:id',
  validate(progressIdParam, { source: 'params' }),
  ctrl.deleteProgress
);

module.exports = router;
