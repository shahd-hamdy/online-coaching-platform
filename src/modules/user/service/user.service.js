const User = require('../model/user.model');
const ApiFeatures = require('../../../utils/apiFeatures');
const cloudinaryService = require('../../../integrations/cloudinary.service');
const ApiError = require('../../../utils/ApiError');
const logger = require('../../../utils/logger');

const getProfile = async (userId) => {
  const user = await User.findById(userId).populate(
    'favoriteExercises',
    'name muscle level image'
  );
  if (!user) throw new ApiError(404, 'User not found.');
  return user;
};

const updateProfile = async (userId, updates) => {
  if (updates.name && !updates.fullName) updates.fullName = updates.name;
  delete updates.name;

  const allowed = ['fullName', 'phone', 'goal', 'level', 'address'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );
  const user = await User.findByIdAndUpdate(userId, filtered, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new ApiError(404, 'User not found.');
  logger.info(`User profile updated: ${userId}`);
  return user;
};

const updateAvatar = async (userId, file) => {
  if (!file) throw new ApiError(400, 'No file provided.');
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');

  if (user.profileImage?.publicId) {
    await cloudinaryService.deleteAsset(user.profileImage.publicId, 'image');
  }

  user.profileImage = {
    url: file.path,
    publicId: file.filename || cloudinaryService.extractPublicId(file.path),
  };
  await user.save();
  logger.info(`Avatar updated for user: ${userId}`);
  return user;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new ApiError(404, 'User not found.');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(400, 'Current password is incorrect.');

  user.password = newPassword;
  await user.save();
  logger.info(`Password changed for user: ${userId}`);
};

const addFavoriteExercise = async (userId, exerciseId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { favoriteExercises: exerciseId } },
    { new: true }
  ).populate('favoriteExercises', 'name muscle level image');
  if (!user) throw new ApiError(404, 'User not found.');
  return user;
};

const removeFavoriteExercise = async (userId, exerciseId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { favoriteExercises: exerciseId } },
    { new: true }
  ).populate('favoriteExercises', 'name muscle level image');
  if (!user) throw new ApiError(404, 'User not found.');
  return user;
};

const getAllUsers = async (queryString) => {
  const features = new ApiFeatures(User.find(), queryString)
    .filter()
    .search(['fullName', 'email'])
    .sort()
    .limitFields()
    .paginate();

  const [users, total] = await Promise.all([features.query, features.count()]);

  return { total, ...features.meta, users };
};

const getUserById = async (id) => {
  const user = await User.findById(id).populate('favoriteExercises', 'name muscle level');
  if (!user) throw new ApiError(404, 'User not found.');
  return user;
};

const deactivateUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: false },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found.');
  logger.warn(`User deactivated: ${userId}`);
  return user;
};

const activateUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: true },
    { new: true }
  );
  if (!user) throw new ApiError(404, 'User not found.');
  logger.info(`User activated: ${userId}`);
  return user;
};

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  changePassword,
  addFavoriteExercise,
  removeFavoriteExercise,
  getAllUsers,
  getUserById,
  deactivateUser,
  activateUser,
};
