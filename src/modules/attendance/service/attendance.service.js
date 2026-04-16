const Attendance = require('../model/attendance.model');
const ApiFeatures = require('../../../utils/apiFeatures');
const ApiError = require('../../../utils/ApiError');
const logger = require('../../../utils/logger');
const subscriptionService = require('../../subscription/service/subscription.service');

const checkIn = async (userId, { notes } = {}) => {
  const sub = await subscriptionService.assertUserHasValidSubscription(userId);

  try {
    const log = await Attendance.create({
      user: userId,
      subscription: sub._id,
      checkIn: new Date(),
      notes: notes || undefined,
    });
    logger.info(`Check-in: user ${userId} at ${log.checkIn}`);
    return log;
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(
        400,
        'You already have an open check-in session. Please check out first.'
      );
    }
    throw err;
  }
};

/**
 * Check-out always allowed when an open session exists so members are not trapped
 * if their subscription lapses before checkout.
 */
const checkOut = async (userId, { notes } = {}) => {
  const session = await Attendance.findOne({
    user: userId,
    checkOut: null,
  }).sort('-checkIn');
  if (!session) throw new ApiError(400, 'No active check-in session found.');

  session.checkOut = new Date();
  if (notes) session.notes = session.notes ? `${session.notes} | ${notes}` : notes;
  await session.save();
  logger.info(`Check-out: user ${userId}, duration: ${session.duration} min`);
  return session;
};

const getMyAttendance = async (userId, queryString) => {
  await subscriptionService.assertUserHasValidSubscription(userId);

  const features = new ApiFeatures(Attendance.find({ user: userId }), queryString)
    .filter()
    .sort()
    .paginate();

  const [logs, total] = await Promise.all([features.query, features.count()]);

  return { total, ...features.meta, logs };
};

const getAttendanceStats = async (userId) => {
  await subscriptionService.assertUserHasValidSubscription(userId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [stats] = await Attendance.aggregate([
    { $match: { user: userId, checkIn: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: null,
        totalVisits: { $sum: 1 },
        totalMinutes: { $sum: { $ifNull: ['$duration', 0] } },
        avgDuration: { $avg: { $ifNull: ['$duration', 0] } },
      },
    },
  ]);

  return stats || { totalVisits: 0, totalMinutes: 0, avgDuration: 0 };
};

const getAllAttendance = async (queryString) => {
  const features = new ApiFeatures(
    Attendance.find().populate('user', 'fullName email role'),
    queryString
  )
    .filter()
    .sort()
    .paginate();

  const [logs, total] = await Promise.all([features.query, features.count()]);

  return { total, ...features.meta, logs };
};

module.exports = { checkIn, checkOut, getMyAttendance, getAttendanceStats, getAllAttendance };
