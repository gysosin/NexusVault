const express = require('express');
const connectionController = require('../controllers/connectionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', connectionController.getConnections);
router.post('/', connectionController.createConnection);
router.delete('/:id', connectionController.deleteConnection);

module.exports = router;
