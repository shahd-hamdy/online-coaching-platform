const express = require('express');
const controller = require('../controller/admin.controller');
const { protect } = require('../../../middlewares/auth.middleware');
const { restrictToAdminPanel } = require('../../../middlewares/role.middleware');
const validate = require('../../../middlewares/validate.middleware');
const v = require('../validation/admin.validation');

const router = express.Router();

// ── Guard: every admin route requires a valid JWT + admin role ────────────
router.use(protect);
router.use(restrictToAdminPanel);

// ─────────────────────────────────────────────
// A) Dashboard
// ─────────────────────────────────────────────
router.get('/dashboard', controller.getDashboard);

// ─────────────────────────────────────────────
// B) User Management
// ─────────────────────────────────────────────
router
  .route('/users')
  .get(validate(v.getUsersQuery, { source: 'query' }), controller.getAllUsers);

router
  .route('/users/:id')
  .get(
    validate(v.userIdParam, { source: 'params' }),
    controller.getUserById,
  )
  .patch(
    validate(v.userIdParam, { source: 'params' }),
    validate(v.updateUserBody),
    controller.updateUser,
  )
  .delete(
    validate(v.userIdParam, { source: 'params' }),
    controller.deleteUser,
  );

// ─────────────────────────────────────────────
// C) Attendance Management
// ─────────────────────────────────────────────
router.get(
  '/attendance',
  validate(v.getAttendanceQuery, { source: 'query' }),
  controller.getAllAttendance,
);

// ─────────────────────────────────────────────
// D) Subscription Overview
// ─────────────────────────────────────────────
router.get(
  '/subscriptions',
  validate(v.getSubscriptionsQuery, { source: 'query' }),
  controller.getAllSubscriptions,
);

module.exports = router;
