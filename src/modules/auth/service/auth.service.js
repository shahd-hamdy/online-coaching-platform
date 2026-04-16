const User = require('../../../modules/user/model/user.model');
const { generateAccessToken } = require('../../../utils/generateToken');
const { ROLES, ERROR_CODES } = require('../../../utils/constants');
const ApiError = require('../../../utils/ApiError');
const logger = require('../../../utils/logger');

const toPublicUser = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  name: user.fullName,
  email: user.email,
  role: user.role,
});

/**
 * Register a new user account.
 */
const register = async ({
  fullName,
  name,
  email,
  password,
  role,
  phone,
  gender,
  dateOfBirth,
  
}) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(
      409,
      'An account with this email already exists.',
      ERROR_CODES.EMAIL_TAKEN
    );
  }

//
const safeRole = ROLES.USER;
//
  const resolvedName = (fullName || name || '').trim();
  if (!resolvedName) throw new ApiError(400, 'Full name is required.');

  let user;
  try {
    user = await User.create({
      fullName: resolvedName,
      email,
      password,
      role: safeRole,
      phone,
      gender,
      dateOfBirth,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(
        409,
        'An account with this email already exists.',
        ERROR_CODES.EMAIL_TAKEN
      );
    }
    throw err;
  }

  const token = generateAccessToken({ id: user._id, role: user.role });

  logger.info(`New user registered: ${user.email} (${user.role})`);

  return { token, user: toPublicUser(user) };
};

/**
 * Authenticate with email & password → return JWT.
 */
const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!user) {
    throw new ApiError(
      401,
      'Invalid email or password.',
      ERROR_CODES.INVALID_CREDENTIALS
    );
  }

  if (user.isLocked) {
    throw new ApiError(
      403,
      'Too many failed login attempts. Your account is temporarily locked. Please try again later.',
      ERROR_CODES.FORBIDDEN
    );
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    throw new ApiError(
      401,
      'Invalid email or password.',
      ERROR_CODES.INVALID_CREDENTIALS
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      403,
      'Your account has been deactivated. Please contact support.',
      ERROR_CODES.ACCOUNT_INACTIVE
    );
  }

  await user.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });

  const token = generateAccessToken({ id: user._id, role: user.role });

  logger.info(`User logged in: ${user.email}`);

  return { token, user: toPublicUser(user) };
};

module.exports = { register, login };
