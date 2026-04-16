const router         = require('express').Router();
const ctrl           = require('../controller/payment.controller');
const { protect }    = require('../../../middlewares/auth.middleware');
const { restrictToAdminPanel } = require('../../../middlewares/role.middleware');
const validate = require('../../../middlewares/validate.middleware');
const { initiatePaymentSchema } = require('../validation/payment.validation');

// ⚠️  Webhook is PUBLIC — Paymob calls it server-to-server with HMAC auth
router.post('/webhook', ctrl.webhook);

router.use(protect);

router.post('/initiate', validate(initiatePaymentSchema), ctrl.initiatePayment);
router.get('/my',        ctrl.getMyPayments);
router.get('/', restrictToAdminPanel, ctrl.getAllPayments);

module.exports = router;
