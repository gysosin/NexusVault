const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

router.get('/activity', adminController.getActivity);

router.get('/roles', adminController.getRoles);
router.post('/roles', adminController.createRole);
router.delete('/roles/:id', adminController.deleteRole);

router.get('/stats', adminController.getStats);

router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
