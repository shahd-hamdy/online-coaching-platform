const router         = require('express').Router();
const ctrl           = require('../controller/machine.controller');
const { protect }    = require('../../../middlewares/auth.middleware');
const { restrictToAdminPanel } = require('../../../middlewares/role.middleware');
const validate       = require('../../../middlewares/validate.middleware');
const { uploadImage } = require('../../../utils/upload');
const { createMachineSchema, updateMachineSchema } = require('../validation/machine.validation');

// Public
router.get('/',    ctrl.getAllMachines);
router.get('/:id', ctrl.getMachineById);

// Protected
router.use(protect);

router.post(
  '/',
  restrictToAdminPanel,
  uploadImage.single('image'),
  validate(createMachineSchema),
  ctrl.createMachine
);
router.patch(
  '/:id',
  restrictToAdminPanel,
  uploadImage.single('image'),
  validate(updateMachineSchema),
  ctrl.updateMachine
);
router.delete('/:id', restrictToAdminPanel, ctrl.deleteMachine);

module.exports = router;
