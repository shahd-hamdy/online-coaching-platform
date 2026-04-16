const router = require('express').Router();
const ctrl = require('../controller/user.controller');
const { protect } = require('../../../middlewares/auth.middleware');
const { restrictToAdminPanel } = require('../../../middlewares/role.middleware');
const validate = require('../../../middlewares/validate.middleware');
const { uploadAvatar } = require('../../../utils/upload');
const {
  updateProfileSchema,
  changePasswordSchema,
  exerciseIdParam,
  userIdFromParams,
} = require('../validation/user.validation');

router.use(protect);

router.get('/profile', ctrl.getProfile);
router.patch('/profile', validate(updateProfileSchema), ctrl.updateProfile);
router.patch('/avatar', uploadAvatar.single('avatar'), ctrl.updateAvatar);
router.patch('/change-password', validate(changePasswordSchema), ctrl.changePassword);

router.post(
  '/favorites/:exerciseId',
  validate(exerciseIdParam, { source: 'params' }),
  ctrl.addFavorite
);
router.delete(
  '/favorites/:exerciseId',
  validate(exerciseIdParam, { source: 'params' }),
  ctrl.removeFavorite
);

router.get('/', restrictToAdminPanel, ctrl.getAllUsers);
router.get(
  '/:id',
  restrictToAdminPanel,
  validate(userIdFromParams, { source: 'params' }),
  ctrl.getUserById
);
router.patch(
  '/:id/deactivate',
  restrictToAdminPanel,
  validate(userIdFromParams, { source: 'params' }),
  ctrl.deactivateUser
);
router.patch(
  '/:id/activate',
  restrictToAdminPanel,
  validate(userIdFromParams, { source: 'params' }),
  ctrl.activateUser
);

module.exports = router;
