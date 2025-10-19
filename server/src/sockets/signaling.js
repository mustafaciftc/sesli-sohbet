module.exports = (io, socket) => {
console.log('socket connected', socket.id);


socket.on('join-room', ({ roomId, username }) => {
socket.join(roomId);
socket.to(roomId).emit('peer-joined', { socketId: socket.id, username });
});


socket.on('signal', ({ to, data }) => {
io.to(to).emit('signal', { from: socket.id, data });
});


socket.on('leave-room', ({ roomId }) => {
socket.leave(roomId);
socket.to(roomId).emit('peer-left', { socketId: socket.id });
});


socket.on('disconnect', () => {
console.log('disconnected', socket.id);
});
};