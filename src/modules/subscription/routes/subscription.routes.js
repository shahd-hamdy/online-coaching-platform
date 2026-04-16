const router         = require('express').Router();
const ctrl           = require('../controller/subscription.controller');
const { protect }    = require('../../../middlewares/auth.middleware');
const { restrictToAdminPanel } = require('../../../middlewares/role.middleware');
const validate       = require('../../../middlewares/validate.middleware');
const {
  createSubscriptionSchema,
  subscriptionIdParam,
} = require('../validation/subscription.validation');

// Public: plan catalogue
router.get('/plans', ctrl.getPlanCatalogue);

router.use(protect);

router.post('/', validate(createSubscriptionSchema), ctrl.createSubscription);
router.get('/my', ctrl.getMySubscription);
router.get(
  '/:id',
  validate(subscriptionIdParam, { source: 'params' }),
  ctrl.getSubscriptionById
);
router.patch(
  '/:id/cancel',
  validate(subscriptionIdParam, { source: 'params' }),
  ctrl.cancelSubscription
);
router.get('/', restrictToAdminPanel, ctrl.getAllSubscriptions);

module.exports = router;
