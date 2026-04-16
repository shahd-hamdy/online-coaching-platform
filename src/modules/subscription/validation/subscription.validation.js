const Joi = require('joi');

const createSubscriptionSchema = Joi.object({
  plan: Joi.string().valid('basic', 'standard', 'premium').required()
    .messages({ 'any.required': 'Please select a subscription plan' }),
  durationMonths: Joi.number().integer().valid(1, 3, 6, 12).default(1)
    .messages({ 'any.only': 'Duration must be 1, 3, 6, or 12 months' }),
});

const subscriptionIdParam = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'Invalid subscription id',
    'string.length': 'Invalid subscription id',
  }),
});

module.exports = { createSubscriptionSchema, subscriptionIdParam };
