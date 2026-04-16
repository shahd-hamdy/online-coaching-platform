const Joi = require('joi');

const setLogSchema = Joi.object({
  setNumber: Joi.number().integer().min(1).required(),
  reps: Joi.number().integer().min(1).max(200).required(),
  weight: Joi.number().min(0).max(1000).default(0),
  completed: Joi.boolean().default(true),
});

const createProgressSchema = Joi.object({
  exercise: Joi.string().hex().length(24).required()
    .messages({ 'any.required': 'Exercise ID is required' }),
  workoutPlan: Joi.string().hex().length(24).allow(null, '').optional(),
  date: Joi.date().iso().max('now').optional(),
  sets: Joi.array().items(setLogSchema).min(1).required()
    .messages({ 'array.min': 'At least one set is required' }),
  notes: Joi.string().max(500).allow('').optional(),
});

const progressIdParam = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

const updateProgressSchema = Joi.object({
  date: Joi.date().iso().max('now'),
  sets: Joi.array().items(setLogSchema).min(1),
  notes: Joi.string().max(500).allow(''),
  workoutPlan: Joi.string().hex().length(24).allow(null, ''),
}).min(1)
  .messages({ 'object.min': 'Provide at least one field to update' });

const progressStatsQuery = Joi.object({
  exerciseId: Joi.string().hex().length(24),
});

module.exports = {
  createProgressSchema,
  progressIdParam,
  updateProgressSchema,
  progressStatsQuery,
};
