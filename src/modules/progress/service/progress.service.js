const { Progress } = require('../model/progress.model');
const Exercise = require('../../exercise/model/exercise.model');
const WorkoutPlan = require('../../workoutPlan/model/workoutPlan.model');
const ApiFeatures = require('../../../utils/apiFeatures');
const ApiError = require('../../../utils/ApiError');
const logger = require('../../../utils/logger');
const subscriptionService = require('../../subscription/service/subscription.service');

const assertWorkoutPlanForUser = async (userId, workoutPlanId) => {
  if (!workoutPlanId) return;
  const plan = await WorkoutPlan.findById(workoutPlanId);
  if (!plan) throw new ApiError(404, 'Workout plan not found.');
  const u = String(userId);
  const allowed =
    String(plan.createdBy) === u ||
    (plan.assignedTo && String(plan.assignedTo) === u) ||
    plan.isPublic === true;
  if (!allowed) {
    throw new ApiError(403, 'You cannot link progress to this workout plan.');
  }
};

const logProgress = async (userId, data) => {
  await subscriptionService.assertUserHasValidSubscription(userId);

  const exercise = await Exercise.findById(data.exercise);
  if (!exercise || !exercise.isActive) throw new ApiError(404, 'Exercise not found.');

  const payload = { ...data };
  if (payload.workoutPlan === '') payload.workoutPlan = null;
  await assertWorkoutPlanForUser(userId, payload.workoutPlan);

  const log = await Progress.create({ user: userId, ...payload });
  await log.populate('exercise', 'name muscle level image');
  logger.info(`Progress logged: user ${userId}, exercise ${payload.exercise}`);
  return log;
};

const getProgressById = async (id, userId) => {
  await subscriptionService.assertUserHasValidSubscription(userId);

  const log = await Progress.findOne({ _id: id, user: userId }).populate(
    'exercise',
    'name muscle level image'
  );
  if (!log) throw new ApiError(404, 'Progress log not found.');
  return log;
};

const updateProgress = async (id, userId, updates) => {
  await subscriptionService.assertUserHasValidSubscription(userId);

  const allowed = ['date', 'sets', 'notes', 'workoutPlan'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  if (filtered.workoutPlan === '') filtered.workoutPlan = null;
  if (Object.keys(filtered).length === 0) {
    throw new ApiError(400, 'No valid fields to update.');
  }

  const log = await Progress.findOne({ _id: id, user: userId });
  if (!log) throw new ApiError(404, 'Progress log not found.');

  if (filtered.workoutPlan !== undefined) {
    await assertWorkoutPlanForUser(userId, filtered.workoutPlan);
  }

  Object.assign(log, filtered);
  await log.save();
  await log.populate('exercise', 'name muscle level image');
  logger.info(`Progress updated: ${id} by user ${userId}`);
  return log;
};

const getUserProgress = async (userId, queryString) => {
  await subscriptionService.assertUserHasValidSubscription(userId);

  const features = new ApiFeatures(
    Progress.find({ user: userId }).populate('exercise', 'name muscle level image'),
    queryString
  )
    .filter()
    .sort()
    .paginate();

  const [logs, total] = await Promise.all([features.query, features.count()]);

  return { total, ...features.meta, logs };
};

const getProgressStats = async (userId, exerciseId) => {
  await subscriptionService.assertUserHasValidSubscription(userId);

  const match = { user: userId };
  if (exerciseId) match.exercise = exerciseId;

  const exerciseStats = await Progress.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$exercise',
        totalSessions: { $sum: 1 },
        totalVolume: { $sum: '$totalVolume' },
        avgVolume: { $avg: '$totalVolume' },
        maxVolume: { $max: '$totalVolume' },
        lastSession: { $max: '$date' },
        firstSession: { $min: '$date' },
      },
    },
    {
      $lookup: {
        from: 'exercises',
        localField: '_id',
        foreignField: '_id',
        as: 'exercise',
      },
    },
    { $unwind: { path: '$exercise', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        totalSessions: 1,
        totalVolume: 1,
        avgVolume: 1,
        maxVolume: 1,
        lastSession: 1,
        firstSession: 1,
        'exercise.name': 1,
        'exercise.muscle': 1,
        'exercise.level': 1,
      },
    },
    { $sort: { totalVolume: -1 } },
  ]);

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const weeklyProgress = await Progress.aggregate([
    { $match: { ...match, date: { $gte: eightWeeksAgo } } },
    {
      $group: {
        _id: { year: { $year: '$date' }, week: { $isoWeek: '$date' } },
        sessions: { $sum: 1 },
        totalVolume: { $sum: '$totalVolume' },
      },
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } },
  ]);

  const [summary] = await Progress.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalVolume: { $sum: '$totalVolume' },
        uniqueExercises: { $addToSet: '$exercise' },
      },
    },
    {
      $project: {
        _id: 0,
        totalSessions: 1,
        totalVolume: 1,
        uniqueExercisesCount: { $size: '$uniqueExercises' },
      },
    },
  ]);

  return {
    summary: summary || { totalSessions: 0, totalVolume: 0, uniqueExercisesCount: 0 },
    exerciseStats,
    weeklyProgress,
  };
};

const deleteProgress = async (id, userId) => {
  await subscriptionService.assertUserHasValidSubscription(userId);

  const log = await Progress.findOneAndDelete({ _id: id, user: userId });
  if (!log) throw new ApiError(404, 'Progress log not found.');
  logger.info(`Progress log deleted: ${id} by user ${userId}`);
};

module.exports = {
  logProgress,
  getProgressById,
  updateProgress,
  getUserProgress,
  getProgressStats,
  deleteProgress,
};
