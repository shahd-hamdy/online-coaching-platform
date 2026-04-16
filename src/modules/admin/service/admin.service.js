const User = require('../../user/model/user.model.js');
const Subscription = require('../../subscription/model/subscription.model.js');
const Attendance = require('../../attendance/model/attendance.model.js');

const ApiError = require('../../../utils/ApiError');
const ApiFeatures = require('../../../utils/apiFeatures');
const { HTTP, ROLES, SUBSCRIPTION_STATUSES } = require('../../../utils/constants');
const subscriptionService = require('../../subscription/service/subscription.service');

// ─────────────────────────────────────────────
// A) Dashboard
// ─────────────────────────────────────────────

const getDashboardStats = async () => {
  await subscriptionService.expireStaleActiveSubscriptions();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const now = new Date();

  const [
    totalUsers,
    totalTrainers,
    totalActiveSubscriptions,
    todayAttendanceCount,
  ] = await Promise.all([
    User.countDocuments({ role: ROLES.USER, isActive: true }),
    User.countDocuments({ role: ROLES.TRAINER, isActive: true }),
    Subscription.countDocuments({
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      endDate: { $gt: now },
    }),
    Attendance.countDocuments({
      checkIn: { $gte: todayStart, $lte: todayEnd },
    }),
  ]);

  return {
    totalUsers,
    totalTrainers,
    totalActiveSubscriptions,
    todayAttendanceCount,
  };
};

// ─────────────────────────────────────────────
// B) User Management
// ─────────────────────────────────────────────

const getAllUsers = async (query) => {
  const features = new ApiFeatures(
    User.find().select('-password -__v'),
    query
  )
    .filter()
    .search(['fullName', 'email'])
    .sort()
    .paginate();

  const [users, total] = await Promise.all([features.query, features.count()]);

  return {
    total,
    ...features.meta,
    results: users.length,
    users,
  };
};

const getUserById = async (id) => {
  const user = await User.findById(id).select('-password -__v');

  if (!user) {
    throw new ApiError(HTTP.NOT_FOUND, 'User not found.');
  }

  return user;
};

const updateUser = async (id, body) => {
  const FORBIDDEN = [
    'password',
    'passwordConfirm',
    'passwordChangedAt',
    'emailVerificationToken',
    'refreshToken',
  ];
  FORBIDDEN.forEach((f) => delete body[f]);

  if (body.name && !body.fullName) body.fullName = body.name;
  delete body.name;

  const user = await User.findByIdAndUpdate(
    id,
    { $set: body },
    { new: true, runValidators: true }
  ).select('-password -__v');

  if (!user) {
    throw new ApiError(HTTP.NOT_FOUND, 'User not found.');
  }

  return user;
};

const deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);

  if (!user) {
    throw new ApiError(HTTP.NOT_FOUND, 'User not found.');
  }

  return user;
};

// ─────────────────────────────────────────────
// C) Attendance
// ─────────────────────────────────────────────

const getAllAttendance = async (query) => {
  const baseFilter = {};

  if (query.userId) baseFilter.user = query.userId;

  if (query.date) {
    const day = new Date(query.date);
    day.setHours(0, 0, 0, 0);

    const next = new Date(day);
    next.setDate(next.getDate() + 1);

    baseFilter.checkIn = { $gte: day, $lt: next };
  } else if (query.from || query.to) {
    baseFilter.checkIn = {};
    if (query.from) baseFilter.checkIn.$gte = new Date(query.from);
    if (query.to) baseFilter.checkIn.$lte = new Date(query.to);
  }

  const cleanQuery = { ...query };
  ['userId', 'date', 'from', 'to'].forEach((k) => delete cleanQuery[k]);

  const features = new ApiFeatures(
    Attendance.find(baseFilter).populate('user', 'fullName email role'),
    cleanQuery
  )
    .sort()
    .paginate();

  const [records, total] = await Promise.all([
    features.query,
    Attendance.countDocuments(baseFilter),
  ]);

  return {
    total,
    ...features.meta,
    results: records.length,
    records,
  };
};

// ─────────────────────────────────────────────
// D) Subscriptions
// ─────────────────────────────────────────────

const getAllSubscriptions = async (query) => {
  const baseFilter = {};

  if (query.status) baseFilter.status = query.status;
  if (query.userId) baseFilter.user = query.userId;

  const cleanQuery = { ...query };
  ['status', 'userId'].forEach((k) => delete cleanQuery[k]);

  const features = new ApiFeatures(
    Subscription.find(baseFilter).populate('user', 'fullName email role'),
    cleanQuery
  )
    .sort()
    .paginate();

  const [subscriptions, total] = await Promise.all([
    features.query,
    Subscription.countDocuments(baseFilter),
  ]);

  return {
    total,
    ...features.meta,
    results: subscriptions.length,
    subscriptions,
  };
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllAttendance,
  getAllSubscriptions,
};