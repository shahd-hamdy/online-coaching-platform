const mongoose = require('mongoose');
const { PAYMENT_STATUSES } = require('../../../utils/constants');

const STATUS_VALUES = Object.values(PAYMENT_STATUSES);

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    paymobOrderId: { type: String, index: true, sparse: true },
    paymobTransactionId: { type: String, trim: true },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    amountEGP: { type: Number },
    currency: {
      type: String,
      default: 'EGP',
      enum: { values: ['EGP', 'USD'], message: 'Invalid currency' },
    },
    method: {
      type: String,
      enum: {
        values: ['cash', 'card', 'vodafoneCash', 'instaPay', 'fawry', 'stripe', 'paypal', 'paymob'],
        message: 'Invalid payment method',
      },
      default: 'paymob',
    },
    status: {
      type: String,
      enum: {
        values: STATUS_VALUES,
        message: 'Invalid payment status',
      },
      default: PAYMENT_STATUSES.PENDING,
    },
    iframeUrl: { type: String },
    webhookPayload: { type: mongoose.Schema.Types.Mixed },
    transactionId: { type: String, trim: true },
    receiptUrl: { type: String },
    paidAt: { type: Date },
    invoiceNumber: { type: String, unique: true, sparse: true },
    notes: { type: String, maxlength: [500, 'Notes too long'] },
    gateway: {
      name: { type: String, trim: true },
      chargeId: { type: String, trim: true },
      response: { type: mongoose.Schema.Types.Mixed },
    },
    refundedAt: { type: Date },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative'],
      validate: {
        validator: function (v) {
          return !v || v <= this.amount;
        },
        message: 'Refund amount cannot exceed original payment amount',
      },
    },
    refundReason: { type: String, maxlength: [300, 'Refund reason too long'], trim: true },
  },
  { timestamps: true }
);

paymentSchema.pre('save', async function (next) {
  if (!this.invoiceNumber && this.status === PAYMENT_STATUSES.SUCCESS) {
    const count = await this.constructor.countDocuments();
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    this.paidAt = this.paidAt || new Date();
  }
  next();
});

paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ transactionId: 1 }, { sparse: true });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
