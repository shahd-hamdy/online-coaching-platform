const Joi = require('joi');

const EG_PHONE = /^(\+20|0)(10|11|12|15)[0-9]{8}$/;

const registerSchema = Joi.object({
  fullName: Joi.string().min(3).max(60).trim(),
  name: Joi.string().min(2).max(60).trim(),
  email: Joi.string().email().lowercase().trim().required()
    .messages({ 'string.email': 'Please provide a valid email address' }),
  password: Joi.string().min(8).max(72).required()
    .messages({ 'string.min': 'Password must be at least 8 characters' }),
  role: Joi.string().valid('user', 'trainer','admin','superAdmin').default('user'),
  phone: Joi.string().trim().pattern(EG_PHONE).required()
    .messages({ 'string.pattern.base': 'Please provide a valid Egyptian mobile number' }),
  gender: Joi.string().valid('male', 'female').required(),
  dateOfBirth: Joi.date().max('now').required()
    .custom((value, helpers) => {
      const age = Math.floor(
        (Date.now() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (age < 14 || age > 80) return helpers.error('date.age');
      return value;
    })
    .messages({ 'date.age': 'Age must be between 14 and 80 years' }),
}).or('fullName', 'name')
  .messages({
    'object.missing': 'Provide fullName or name',
  });

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().max(72).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
};
