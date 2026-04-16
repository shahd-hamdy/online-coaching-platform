const Joi = require('joi');

// ─────────────────────────────────────────────
// Reusable primitives
// ─────────────────────────────────────────────

const mongoId = Joi.string()
  .hex()
  .length(24)
  .messages({
    'string.hex': '"{{#label}}" must be a valid MongoDB ObjectId.',
    'string.length': '"{{#label}}" must be a valid MongoDB ObjectId.',
  });

const paginationFields = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  sort: Joi.string(),
};

// ─────────────────────────────────────────────
// Route param schemas
// ─────────────────────────────────────────────

const userIdParam = Joi.object({
  id: mongoId.required(),
});

// ─────────────────────────────────────────────
// Query schemas
// ─────────────────────────────────────────────

/**
 * GET /admin/users
 */
const getUsersQuery = Joi.object({
  ...paginationFields,
  role: Joi.string().valid('user', 'trainer', 'admin'),
  isActive: Joi.boolean(),
  search: Joi.string().max(100).trim().allow(''),
});

/**
 * GET /admin/attendance
 */
const getAttendanceQuery = Joi.object({
  ...paginationFields,
  userId: mongoId,
  date: Joi.string().isoDate(),
  from: Joi.string().isoDate(),
  to: Joi.string().isoDate(),
});

/**
 * GET /admin/subscriptions
 */
const getSubscriptionsQuery = Joi.object({
  ...paginationFields,
  userId: mongoId,
  status: Joi.string().valid('active', 'expired', 'cancelled', 'pending'),
});

// ─────────────────────────────────────────────
// Body schemas
// ─────────────────────────────────────────────

/**
 * PATCH /admin/users/:id
 */
const updateUserBody = Joi.object({
  fullName: Joi.string().trim().min(3).max(60),
  name: Joi.string().trim().min(2).max(60),
  email: Joi.string().email().lowercase().trim(),
  role: Joi.string().valid('user', 'trainer', 'admin', 'superAdmin'),
  isActive: Joi.boolean(),
  phone: Joi.string()
    .trim()
    .pattern(/^(\+20|0)(10|11|12|15)[0-9]{8}$/)
    .messages({ 'string.pattern.base': 'Invalid Egyptian phone number' }),
  goal: Joi.string().valid('weight_loss', 'muscle_gain', 'fitness'),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced'),
})
  .min(1)
  .messages({
    'object.min': 'Provide at least one field to update.',
  });

// ─────────────────────────────────────────────

module.exports = {
  userIdParam,
  getUsersQuery,
  getAttendanceQuery,
  getSubscriptionsQuery,
  updateUserBody,
};