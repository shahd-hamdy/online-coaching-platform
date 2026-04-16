const Subscription = require('../model/subscription.model');
const ApiFeatures = require('../../../utils/apiFeatures');
const {
  ROLES,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_ACCESS_MESSAGE,
  ERROR_CODES,
} = require('../../../utils/constants');
const ApiError = require('../../../utils/ApiError');
const logger = require('../../../utils/logger');

// ── Plan catalogue ────────────────────────────────────────────────────────
const PLAN_CATALOGUE = {
  [SUBSCRIPTION_PLANS.BASIC]: {
    pricePerMonth: 199,
    features: [
      'Access to all workout plans',
      'Progress tracking',
      'Exercise library access',
    ],
  },
  [SUBSCRIPTION_PLANS.STANDARD]: {
    pricePerMonth: 399,
    features: [
      'All Basic features',
      'Trainer assignment',
      'Nutrition tips',
      'Priority support',
    ],
  },
  [SUBSCRIPTION_PLANS.PREMIUM]: {
    pricePerMonth: 699,
    features: [
      'All Standard features',
      'Personal trainer sessions',
      'Custom workout plans',
      'Dedicated support channel',
    ],
  },
};

/**
 * Marks ACTIVE subscriptions past `endDate` as EXPIRED (lazy expiry).
 * @param {import('mongoose').Types.ObjectId|string|null} userId - scope to one user, or all if null/undefined
 */
const expireStaleActiveSubscriptions = async (userId = null) => {
  const now = new Date();
  const filter = {
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    endDate: { $lte: now },
  };
  if (userId != null) filter.user = userId;

  const result = await Subscription.updateMany(filter, { status: SUBSCRIPTION_STATUSES.EXPIRED });
  if (result.modifiedCount > 0) {
    logger.info(
      `Expired ${result.modifiedCount} stale active subscription(s)` +
        (userId != null ? ` for user ${userId}` : '')
    );
  }
  return result.modifiedCount;
};

const createSubscription = async (userId, { plan, durationMonths = 1 }) => {
  const catalogue = PLAN_CATALOGUE[plan];
  if (!catalogue) throw new ApiError(400, `Unknown plan: ${plan}`);

  await expireStaleActiveSubscriptions(userId);

  // Cancel any existing active subscriptions
  const cancelled = await Subscription.updateMany(
    { user: userId, status: SUBSCRIPTION_STATUSES.ACTIVE },
    { status: SUBSCRIPTION_STATUSES.CANCELLED }
  );
  if (cancelled.modifiedCount > 0) {
    logger.info(`Cancelled ${cancelled.modifiedCount} active subscription(s) for user ${userId}`);
  }

  const price = catalogue.pricePerMonth * durationMonths;
  // Provisional end date for pending rows; replaced on activation from paid `startDate`.
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + durationMonths);

  const sub = await Subscription.create({
    user:           userId,
    plan,
    price,
    currency:       'EGP',
    durationMonths,
    endDate,
    features:       catalogue.features,
    status:         SUBSCRIPTION_STATUSES.PENDING,
  });

  logger.info(`Subscription created: ${sub._id} (${plan}, ${durationMonths} month(s))`);
  return sub;
};

/**
 * Pure rule: gym access requires a row that is **active** (not pending/expired/cancelled)
 * and **endDate strictly in the future**. Single source of truth for attendance & progress gates.
 */
const subscriptionAllowsGymAccess = (sub, now = new Date()) => {
  if (!sub) return false;
  if (sub.status !== SUBSCRIPTION_STATUSES.ACTIVE) return false;
  const end = sub.endDate ? new Date(sub.endDate) : null;
  if (!end || Number.isNaN(end.getTime())) return false;
  return end.getTime() > now.getTime();
};

/**
 * Returns the user's subscription document if and only if it passes {@link subscriptionAllowsGymAccess}.
 */
const getValidActiveSubscription = async (userId) => {
  if (userId == null) return null;

  await expireStaleActiveSubscriptions(userId);
  const now = new Date();

  const sub = await Subscription.findOne({
    user: userId,
    status: SUBSCRIPTION_STATUSES.ACTIVE,
    endDate: { $gt: now },
  }).sort('-createdAt');

  if (!subscriptionAllowsGymAccess(sub, now)) return null;
  return sub;
};

/** Reuse everywhere gym features must be blocked without paid, non-expired **active** membership. */
const assertUserHasValidSubscription = async (userId) => {
  const sub = await getValidActiveSubscription(userId);
  if (!sub) {
    throw new ApiError(
      403,
      SUBSCRIPTION_ACCESS_MESSAGE,
      ERROR_CODES.SUBSCRIPTION_REQUIRED
    );
  }
  return sub;
};

const getMySubscription = async (userId) => {
  const sub = await getValidActiveSubscription(userId);
  if (!sub) return null;
  await sub.populate('paymentRef', 'status paidAt amountEGP amount');
  return sub;
};

const getSubscriptionById = async (subscriptionId, requesterId, requesterRole) => {
  let sub = await Subscription.findById(subscriptionId)
    .populate('user', 'fullName email role')
    .populate('paymentRef', 'status paidAt amountEGP amount');
  if (!sub) throw new ApiError(404, 'Subscription not found.');

  await expireStaleActiveSubscriptions(sub.user?._id || sub.user);

  sub = await Subscription.findById(subscriptionId)
    .populate('user', 'fullName email role')
    .populate('paymentRef', 'status paidAt amountEGP amount');
  if (!sub) throw new ApiError(404, 'Subscription not found.');

  const ownerId = sub.user?._id ? String(sub.user._id) : String(sub.user);
  const isElevated =
    requesterRole === ROLES.ADMIN || requesterRole === ROLES.SUPER_ADMIN;
  if (!isElevated && ownerId !== String(requesterId)) {
    throw new ApiError(403, 'You cannot access this subscription.');
  }
  return sub;
};

const getAllSubscriptions = async (queryString) => {
  const features = new ApiFeatures(
    Subscription.find().populate('user', 'fullName email role'),
    queryString
  )
    .filter()
    .sort()
    .paginate();

  const [subscriptions, total] = await Promise.all([
    features.query,
    features.count(),
  ]);

  return { total, ...features.meta, subscriptions };
};

const activateSubscription = async (subscriptionId, paymentId) => {
  const sub = await Subscription.findById(subscriptionId);
  if (!sub) throw new ApiError(404, 'Subscription not found.');

  if (sub.status === SUBSCRIPTION_STATUSES.ACTIVE) {
    logger.info(`Subscription ${subscriptionId} already active — skipping re-activation`);
    return sub;
  }

  const durationMonths = sub.durationMonths || 1;
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  sub.status = SUBSCRIPTION_STATUSES.ACTIVE;
  sub.paymentRef = paymentId;
  sub.startDate = startDate;
  sub.endDate = endDate;
  await sub.save();

  logger.info(`Subscription activated: ${subscriptionId} until ${endDate.toISOString()}`);
  return sub;
};

const cancelSubscription = async (subscriptionId, userId) => {
  await expireStaleActiveSubscriptions(userId);
  const sub = await Subscription.findOne({ _id: subscriptionId, user: userId });
  if (!sub) throw new ApiError(404, 'Subscription not found.');
  if (sub.status === SUBSCRIPTION_STATUSES.CANCELLED) {
    throw new ApiError(400, 'Subscription is already cancelled.');
  }
  if (sub.status === SUBSCRIPTION_STATUSES.EXPIRED) {
    throw new ApiError(400, 'Cannot cancel an expired subscription.');
  }

  sub.status = SUBSCRIPTION_STATUSES.CANCELLED;
  await sub.save();
  logger.info(`Subscription cancelled: ${subscriptionId} by user ${userId}`);
  return sub;
};

const getPlanCatalogue = () => PLAN_CATALOGUE;

module.exports = {
  createSubscription,
  expireStaleActiveSubscriptions,
  subscriptionAllowsGymAccess,
  getValidActiveSubscription,
  assertUserHasValidSubscription,
  getMySubscription,
  getSubscriptionById,
  getAllSubscriptions,
  activateSubscription,
  cancelSubscription,
  getPlanCatalogue,
};
