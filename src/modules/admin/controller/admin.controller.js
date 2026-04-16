const adminService = require('../service/admin.service');
const catchAsync = require('../../../utils/catchAsync');
const ApiResponse = require('../../../utils/ApiResponse');
const { HTTP } = require('../../../utils/constants');

const getDashboard = catchAsync(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, stats));
});

const getAllUsers = catchAsync(async (req, res) => {
  const { users, total, page, limit } = await adminService.getAllUsers(req.query);
  res.status(HTTP.OK).json(
    new ApiResponse(HTTP.OK, { users }, 'Users retrieved.', { page, limit, total })
  );
});

const getUserById = catchAsync(async (req, res) => {
  const user = await adminService.getUserById(req.params.id);
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, user));
});

const updateUser = catchAsync(async (req, res) => {
  const user = await adminService.updateUser(req.params.id, req.body);
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, user, 'User updated successfully.'));
});

const deleteUser = catchAsync(async (req, res) => {
  await adminService.deleteUser(req.params.id);
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, null, 'User deleted.'));
});

const getAllAttendance = catchAsync(async (req, res) => {
  const { records, total, page, limit } = await adminService.getAllAttendance(req.query);
  res.status(HTTP.OK).json(
    new ApiResponse(HTTP.OK, { records }, 'Attendance retrieved.', { page, limit, total })
  );
});

const getAllSubscriptions = catchAsync(async (req, res) => {
  const { subscriptions, total, page, limit } = await adminService.getAllSubscriptions(
    req.query
  );
  res.status(HTTP.OK).json(
    new ApiResponse(HTTP.OK, { subscriptions }, 'Subscriptions retrieved.', {
      page,
      limit,
      total,
    })
  );
});

module.exports = {
  getDashboard,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllAttendance,
  getAllSubscriptions,
};
