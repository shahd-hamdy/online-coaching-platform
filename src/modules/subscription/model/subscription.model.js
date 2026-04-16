const mongoose = require('mongoose');
const { SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUSES } = require('../../../utils/constants');

/**
 * User subscription — aligns with subscription + payment services (Paymob flow).
 * `plan` is a string key (basic | standard | premium), not a separate Plan collection.
 */
const userSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    plan: {
      type: String,
      required: [true, 'Plan is required'],
      enum: {
        values: Object.values(SUBSCRIPTION_PLANS),
        message: 'Invalid subscription plan',
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'EGP',
      enum: ['EGP', 'USD'],
    },
    startDate: { type: Date, default: Date.now },
    /** Billing period length; `endDate` is recomputed from this when the subscription is activated. */
    durationMonths: {
      type: Number,
      default: 1,
      enum: {
        values: [1, 3, 6, 12],
        message: 'Duration must be 1, 3, 6, or 12 months',
      },
    },
    endDate: { type: Date, required: [true, 'End date is required'] },
    features: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(SUBSCRIPTION_STATUSES),
        message: 'Invalid subscription status',
      },
      default: SUBSCRIPTION_STATUSES.PENDING,
    },
    paymentRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSubscriptionSchema.index({ user: 1, status: 1 });
userSubscriptionSchema.index({ endDate: 1, status: 1 });

module.exports = mongoose.model('Subscription', userSubscriptionSchema);
