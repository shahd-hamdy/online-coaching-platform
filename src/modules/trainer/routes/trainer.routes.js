const router         = require('express').Router();
const ctrl           = require('../controller/trainer.controller');
const { protect }    = require('../../../middlewares/auth.middleware');
const { restrictTo, restrictToAdminPanel } = require('../../../middlewares/role.middleware');
const validate       = require('../../../middlewares/validate.middleware');
const { ROLES }      = require('../../../utils/constants');
const { createTrainerSchema, updateTrainerSchema } = require('../validation/trainer.validation');

router.get('/',    ctrl.getAllTrainers);
router.get('/:id', ctrl.getTrainerById);

router.use(protect);

// A trainer can create their own profile; admin can create for any userId
router.post(
  '/',
  restrictTo(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TRAINER),
  validate(createTrainerSchema),
  ctrl.createTrainer
);
router.post(
  '/for-user/:userId',
  restrictToAdminPanel,
  validate(createTrainerSchema),
  ctrl.createTrainer
);
router.patch(
  '/:id',
  restrictTo(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TRAINER),
  validate(updateTrainerSchema),
  ctrl.updateTrainer
);
router.patch(
  '/:id/assign/:userId',
  restrictTo(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TRAINER),
  ctrl.assignUser
);
router.patch(
  '/:id/unassign/:userId',
  restrictTo(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TRAINER),
  ctrl.unassignUser
);
router.delete('/:id', restrictToAdminPanel, ctrl.deleteTrainer);

module.exports = router;
