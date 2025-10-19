const express = require('express');
const router = express.Router();
const { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom, joinRoom, leaveRoom, sendMessage, getRoomMessages } = require('../controllers/roomController');
const { authenticate } = require('../middlewares/authMiddleware'); 

router.get('/', authenticate, getAllRooms);
router.get('/:id', authenticate, getRoomById);
router.post('/', authenticate, createRoom);
router.put('/:id', authenticate, updateRoom);
router.delete('/:id', authenticate, deleteRoom);
router.post('/:id/join', authenticate, joinRoom);
router.post('/:id/leave', authenticate, leaveRoom);
router.post('/:id/messages', authenticate, sendMessage);
router.get('/:id/messages', authenticate, getRoomMessages);

module.exports = router;