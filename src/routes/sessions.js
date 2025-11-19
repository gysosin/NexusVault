const express = require('express');
const sessionController = require('../controllers/sessionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/active', sessionController.getActiveSessions);
router.get('/history', sessionController.getSessionHistory);
router.get('/history/:sessionId', sessionController.getSessionDetails);

module.exports = router;
