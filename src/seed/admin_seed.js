const mongoose = require('mongoose');
const User = require('../modules/user/model/user.model');
const { ROLES } = require('../utils/constants');

require('dotenv').config();

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const exists = await User.findOne({ role: ROLES.ADMIN });

  if (exists) {
    console.log('Admin already exists');
    process.exit();
  }

  await User.create({
    fullName: 'Admin',
    email: 'admin@test.com',
    password: '12345678',
    role: ROLES.ADMIN,
    phone: '+201000000000',
    gender: 'male',
    dateOfBirth: new Date('2000-01-01'),
  });

  console.log('Admin created successfully');
  process.exit();
};

createAdmin();