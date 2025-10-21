import Joi from 'joi';

export const validateUser = (req, res, next) => {
  const schema = Joi.object({
    userName: Joi.string().min(3).max(30).required().messages({
      'string.empty': 'Username cannot be empty',
      'string.min': 'Username should have a minimum length of {#limit}',
      'string.max': 'Username should have a maximum length of {#limit}',
      'any.required': 'Username is required',
    }),
    email: Joi.string().email().required().messages({
      'string.empty': 'Email cannot be empty',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
      'string.empty': 'Password cannot be empty',
      'string.min': 'Password must be at least {#limit} characters long',
      'any.required': 'Password is required',
    }),
    phone: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .messages({
        'string.pattern.base': 'Phone number must be between 10 and 15 digits',
      }),
    avatar: Joi.string().uri().messages({
      'string.uri': 'Avatar must be a valid URI',
    }),
    role: Joi.string().valid('admin', 'user').messages({
      'any.only': 'Role must be either admin or user',
    }),
    groupIds: Joi.array().items(Joi.string()).messages({
      'array.base': 'Group IDs must be an array of strings',
    }),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  next();
};
