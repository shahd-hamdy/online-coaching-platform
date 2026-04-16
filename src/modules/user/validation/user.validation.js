const Joi = require('joi');
const { GOALS, LEVELS } = require('../../../utils/constants');

const EG_PHONE = /^(\+20|0)(10|11|12|15)[0-9]{8}$/;

const mongoIdParam = (label = 'id') =>
  Joi.string().hex().length(24).required().messages({
    'string.hex': `${label} must be a valid id`,
    'string.length': `${label} must be a valid id`,
  });

const exerciseIdParam = Joi.object({
  exerciseId: mongoIdParam('Exercise id'),
});

const userIdFromParams = Joi.object({
  id: mongoIdParam('User id'),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(3).max(60).trim(),
  name: Joi.string().min(2).max(60).trim(),
  phone: Joi.string().trim().pattern(EG_PHONE),
  goal: Joi.string().valid(...Object.values(GOALS)).allow(null),
  level: Joi.string().valid(...Object.values(LEVELS)).allow(null),
  address: Joi.object({
    city: Joi.string().trim().max(80).allow(''),
    district: Joi.string().trim().max(80).allow(''),
    street: Joi.string().trim().max(120).allow(''),
  }),
})
  .min(1)
  .messages({ 'object.min': 'Please provide at least one field to update' });

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required()
    .messages({ 'any.required': 'Current password is required' }),
  newPassword: Joi.string().min(8).max(72).required()
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.min': 'New password must be at least 8 characters',
      'any.invalid': 'New password must be different from current password',
    }),
});

module.exports = {
  exerciseIdParam,
  userIdFromParams,
  updateProfileSchema,
  changePasswordSchema,
};
