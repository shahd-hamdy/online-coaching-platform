const User = require('../../user/model/user.model');
const authService = require('../service/auth.service');
const catchAsync = require('../../../utils/catchAsync');
const ApiResponse = require('../../../utils/ApiResponse');
const ApiError = require('../../../utils/ApiError');
const { HTTP, ERROR_CODES } = require('../../../utils/constants');

const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(HTTP.CREATED).json(new ApiResponse(HTTP.CREATED, result, 'Registration successful.'));
});

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, result, 'Login successful.'));
});

const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    'favoriteExercises',
    'name muscle level image'
  );
  if (!user) throw new ApiError(404, 'User not found.', ERROR_CODES.NOT_FOUND);
  res.status(HTTP.OK).json(new ApiResponse(HTTP.OK, user, 'Authenticated user.'));
});

module.exports = { register, login, getMe };
