const paymentService = require('../service/payment.service');
const catchAsync = require('../../../utils/catchAsync');
const ApiResponse = require('../../../utils/ApiResponse');
const { HTTP } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

const initiatePayment = catchAsync(async (req, res) => {
  const { subscriptionId } = req.body;
  const result = await paymentService.initiatePayment(req.user._id, subscriptionId);
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, result, 'Payment initiated.'));
});

const getMyPayments = catchAsync(async (req, res) => {
  const { payments, total, page, limit } = await paymentService.getMyPayments(
    req.user._id,
    req.query
  );
  res.status(HTTP.OK).json(
    new ApiResponse(HTTP.OK, { payments }, 'Payments retrieved.', { page, limit, total })
  );
});

const getAllPayments = catchAsync(async (req, res) => {
  const { payments, total, page, limit } = await paymentService.getAllPayments(req.query);
  res.status(HTTP.OK).json(
    new ApiResponse(HTTP.OK, { payments }, 'Payments retrieved.', { page, limit, total })
  );
});

/**
 * Paymob sends POST /api/v1/payments/webhook?hmac=<value>
 * Body arrives as Buffer (raw) because of the special middleware in app.js.
 * Always respond 200 so Paymob does not retry indefinitely; log failures internally.
 */
const webhook = async (req, res) => {
  const hmac = req.query.hmac;
  logger.info(`Paymob webhook received — HMAC: ${hmac ? 'present' : 'MISSING'}`);

  try {
    await paymentService.handleWebhook(req.body, hmac);
  } catch (err) {
    logger.error('Paymob webhook processing error', {
      message: err.message,
      stack:   err.stack,
    });
  }

  res.status(HTTP.OK).json({ received: true });
};

module.exports = { initiatePayment, getMyPayments, getAllPayments, webhook };
