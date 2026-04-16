const progressService = require('../service/progress.service');
const catchAsync = require('../../../utils/catchAsync');
const ApiResponse = require('../../../utils/ApiResponse');
const { HTTP } = require('../../../utils/constants');

const logProgress = catchAsync(async (req, res) => {
  const log = await progressService.logProgress(req.user._id, req.body);
  res.status(HTTP.CREATED).json(new ApiResponse(HTTP.CREATED, log, 'Progress logged.'));
});

const getMyProgress = catchAsync(async (req, res) => {
  const { logs, total, page, limit } = await progressService.getUserProgress(
    req.user._id,
    req.query
  );
  res.status(HTTP.OK).json(
    new ApiResponse(HTTP.OK, { logs }, 'Progress retrieved.', { page, limit, total })
  );
});

const getProgressById = catchAsync(async (req, res) => {
  const log = await progressService.getProgressById(req.params.id, req.user._id);
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, log));
});

const updateProgress = catchAsync(async (req, res) => {
  const log = await progressService.updateProgress(req.params.id, req.user._id, req.body);
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, log, 'Progress updated.'));
});

const getStats = catchAsync(async (req, res) => {
  const stats = await progressService.getProgressStats(req.user._id, req.query.exerciseId);
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, stats));
});

const deleteProgress = catchAsync(async (req, res) => {
  await progressService.deleteProgress(req.params.id, req.user._id);
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, null, 'Progress log deleted.'));
});

module.exports = {
  logProgress,
  getMyProgress,
  getProgressById,
  updateProgress,
  getStats,
  deleteProgress,
};
