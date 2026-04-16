const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
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
    checkIn: {
      type: Date,
      required: [true, 'Check-in time is required'],
      default: Date.now,
    },
    checkOut: {
      type: Date,
      validate: {
        validator: function (v) {
          return !v || v > this.checkIn;
        },
        message: 'Check-out must be after check-in',
      },
    },
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
    },
    method: {
      type: String,
      enum: {
        values: ['qrCode', 'fingerprint', 'manual', 'rfid', 'faceId'],
        message: 'Invalid check-in method',
      },
      default: 'manual',
    },
    notes: { type: String, maxlength: [300, 'Notes too long'], trim: true },
  },
  { timestamps: true }
);

attendanceSchema.pre('save', function (next) {
  if (this.checkOut && this.checkIn) {
    this.duration = Math.round((this.checkOut - this.checkIn) / (1000 * 60));
  }
  next();
});

attendanceSchema.index({ user: 1, checkOut: 1 });
attendanceSchema.index({ checkIn: -1 });
// At most one open session per user (duplicate check-in race protection)
attendanceSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { checkOut: null } }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
