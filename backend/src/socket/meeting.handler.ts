import { Server, Socket } from 'socket.io';

export const meetingHandler = (io: Server) => {
  const users: Record<string, string[]> = {}; // roomId -> socketIds
  const socketToRoom: Record<string, string> = {};
  const waitingUsers: Record<string, { socketId: string, name: string }[]> = {}; // roomId -> pending users

  io.on('connection', (socket: Socket) => {
    // Basic Join
    socket.on('join-room', (roomId: string) => {
      // ... existing logic ...
      joinRoom(socket, roomId);
    });

    // Waiting Room Requests
    socket.on('join-request', ({ roomId, name }: { roomId: string, name: string }) => {
      if (!waitingUsers[roomId]) waitingUsers[roomId] = [];
      waitingUsers[roomId].push({ socketId: socket.id, name });
      
      // Notify host (admin) - Simplification: Broadcast to all active users in room as "provisional admin"
      socket.broadcast.to(roomId).emit('waiting-room-update', waitingUsers[roomId]);
    });

    socket.on('approve-join', ({ socketId, roomId }: { socketId: string, roomId: string }) => {
      // Move user from waiting to active
      if (waitingUsers[roomId]) {
        waitingUsers[roomId] = waitingUsers[roomId].filter(u => u.socketId !== socketId);
        io.to(roomId).emit('waiting-room-update', waitingUsers[roomId]); // Update list
      }
      io.to(socketId).emit('join-approved');
    });

    socket.on('reject-join', ({ socketId, roomId }: { socketId: string, roomId: string }) => {
       if (waitingUsers[roomId]) {
        waitingUsers[roomId] = waitingUsers[roomId].filter(u => u.socketId !== socketId);
        io.to(roomId).emit('waiting-room-update', waitingUsers[roomId]);
      }
      io.to(socketId).emit('join-rejected');
    });

    // End Meeting for All
    socket.on('end-meeting-for-all', (roomId: string) => {
       io.to(roomId).emit('meeting-ended');
       // Disconnect all users in room
       if (users[roomId]) {
          users[roomId].forEach((socketId: string) => {
             const s = io.sockets.sockets.get(socketId);
             if (s) s.disconnect(true);
          });
          delete users[roomId];
       }
    });

    // Reactions
    socket.on('send-reaction', (payload: { roomId: string, reaction: string }) => {
       socket.broadcast.to(payload.roomId).emit('receive-reaction', payload);
    });

    socket.on('sending-signal', (payload: { userToSignal: string; callerID: string; signal: any }) => {
      io.to(payload.userToSignal).emit('user-joined', { 
        signal: payload.signal, 
        callerID: payload.callerID 
      });
    });

    socket.on('returning-signal', (payload: { callerID: string; signal: any }) => {
      io.to(payload.callerID).emit('receiving-returned-signal', { 
        signal: payload.signal, 
        id: socket.id 
      });
    });

    socket.on('chat-message', (payload: { roomId: string; message: string; sender: string }) => {
      socket.broadcast.to(payload.roomId).emit('chat-message', payload);
    });

    socket.on('disconnect', () => {
      const roomId = socketToRoom[socket.id];
      if (roomId) {
        // Remove from active users
        let room = users[roomId];
        if (room) {
          room = room.filter((id: string) => id !== socket.id);
          users[roomId] = room;
          socket.broadcast.to(roomId).emit('user-left', socket.id);
        }
        
        // Remove from waiting list if pending
        if (waitingUsers[roomId]) {
           waitingUsers[roomId] = waitingUsers[roomId].filter(u => u.socketId !== socket.id);
           socket.broadcast.to(roomId).emit('waiting-room-update', waitingUsers[roomId]);
        }
      }
      delete socketToRoom[socket.id];
    });
  });

  const joinRoom = (socket: Socket, roomId: string) => {
      if (!users[roomId]) {
        users[roomId] = [];
      }
      
      // Check if user is already in room (reconnection case)
      if (!users[roomId].includes(socket.id)) {
        users[roomId].push(socket.id);
      }
      
      socketToRoom[socket.id] = roomId;
      socket.join(roomId);
      
      const usersInThisRoom = users[roomId].filter((id: string) => id !== socket.id);
      socket.emit('all-users', usersInThisRoom.map(id => ({ id })));
  };
};
