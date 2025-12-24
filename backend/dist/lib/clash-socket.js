"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clashSocketService = exports.ClashSocketService = void 0;
const prisma_1 = require("./prisma");
class ClashSocketService {
    constructor() {
        this.io = null;
        this.clashRooms = new Map();
        this.socketToRoom = new Map();
    }
    initialize(io) {
        this.io = io;
    }
    /**
     * Register Clash socket events
     */
    registerEvents(socket) {
        // Join a clash room
        socket.on('join-clash-room', async (data) => {
            try {
                if (!socket.userId) {
                    socket.emit('clash-error', { message: 'Authentication required' });
                    return;
                }
                const room = await prisma_1.prisma.clashRoom.findUnique({
                    where: { id: data.roomId },
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                });
                if (!room) {
                    socket.emit('clash-error', { message: 'Room not found' });
                    return;
                }
                // Check if user is a participant
                const participant = room.participants.find(p => p.userId === socket.userId);
                if (!participant) {
                    socket.emit('clash-error', { message: 'You are not a participant in this room' });
                    return;
                }
                // Join socket room
                socket.join(`clash:${data.roomId}`);
                this.socketToRoom.set(socket.id, data.roomId);
                // Initialize or update room state
                if (!this.clashRooms.has(data.roomId)) {
                    this.clashRooms.set(data.roomId, {
                        roomId: data.roomId,
                        participants: new Map(),
                        sockets: new Set(),
                    });
                }
                const roomState = this.clashRooms.get(data.roomId);
                roomState.sockets.add(socket.id);
                roomState.participants.set(socket.userId, {
                    userId: socket.userId,
                    userName: participant.user.name || 'Unknown',
                    userEmail: participant.user.email,
                    score: participant.score,
                    hasSubmitted: false,
                });
                // Notify all participants about the update
                this.broadcastRoomUpdate(data.roomId);
                socket.emit('clash-joined', { roomId: data.roomId });
            }
            catch (error) {
                console.error('[ClashSocket] Error joining room:', error);
                socket.emit('clash-error', { message: 'Failed to join room' });
            }
        });
        // Leave a clash room
        socket.on('leave-clash-room', (data) => {
            this.handleLeaveRoom(socket, data.roomId);
        });
        // Room started event (triggered by creator)
        socket.on('clash-room-started', async (data) => {
            try {
                const room = await prisma_1.prisma.clashRoom.findUnique({
                    where: { id: data.roomId },
                });
                if (!room)
                    return;
                if (room.createdById !== socket.userId) {
                    socket.emit('clash-error', { message: 'Only the creator can start the room' });
                    return;
                }
                // Broadcast to all participants
                this.io?.to(`clash:${data.roomId}`).emit('clash-started', {
                    roomId: data.roomId,
                    startedAt: new Date(),
                });
            }
            catch (error) {
                console.error('[ClashSocket] Error starting room:', error);
            }
        });
        // Submission event
        socket.on('clash-submission', async (data) => {
            try {
                if (!socket.userId)
                    return;
                const roomState = this.clashRooms.get(data.roomId);
                if (!roomState)
                    return;
                const participant = roomState.participants.get(socket.userId);
                if (participant) {
                    participant.hasSubmitted = true;
                    participant.score = data.score;
                }
                // Broadcast leaderboard update
                this.broadcastLeaderboardUpdate(data.roomId);
            }
            catch (error) {
                console.error('[ClashSocket] Error handling submission:', error);
            }
        });
        // Disconnect handling
        socket.on('disconnect', () => {
            const roomId = this.socketToRoom.get(socket.id);
            if (roomId) {
                this.handleLeaveRoom(socket, roomId);
            }
        });
    }
    /**
     * Handle user leaving a room
     */
    handleLeaveRoom(socket, roomId) {
        const roomState = this.clashRooms.get(roomId);
        if (!roomState)
            return;
        roomState.sockets.delete(socket.id);
        if (socket.userId) {
            roomState.participants.delete(socket.userId);
        }
        this.socketToRoom.delete(socket.id);
        socket.leave(`clash:${roomId}`);
        // If no participants left, clean up room state
        if (roomState.sockets.size === 0) {
            this.clashRooms.delete(roomId);
        }
        else {
            this.broadcastRoomUpdate(roomId);
        }
    }
    /**
     * Broadcast room update to all participants
     */
    broadcastRoomUpdate(roomId) {
        const roomState = this.clashRooms.get(roomId);
        if (!roomState)
            return;
        const participants = Array.from(roomState.participants.values());
        this.io?.to(`clash:${roomId}`).emit('clash-room-update', {
            roomId,
            participants,
            participantCount: participants.length,
        });
    }
    /**
     * Broadcast leaderboard update
     */
    broadcastLeaderboardUpdate(roomId) {
        const roomState = this.clashRooms.get(roomId);
        if (!roomState)
            return;
        const participants = Array.from(roomState.participants.values())
            .sort((a, b) => {
            // Sort by score (lower is better for time/characters)
            if (a.score === 0 && b.score === 0)
                return 0;
            if (a.score === 0)
                return 1;
            if (b.score === 0)
                return -1;
            return a.score - b.score;
        })
            .map((p, index) => ({
            ...p,
            rank: p.score > 0 ? index + 1 : null,
        }));
        this.io?.to(`clash:${roomId}`).emit('clash-leaderboard-update', {
            roomId,
            leaderboard: participants,
        });
    }
    /**
     * Notify room that it has finished
     */
    async notifyRoomFinished(roomId) {
        this.io?.to(`clash:${roomId}`).emit('clash-finished', {
            roomId,
            finishedAt: new Date(),
        });
        // Clean up room state after a delay
        setTimeout(() => {
            this.clashRooms.delete(roomId);
        }, 60000); // Keep state for 1 minute for late joiners
    }
}
exports.ClashSocketService = ClashSocketService;
exports.clashSocketService = new ClashSocketService();
//# sourceMappingURL=clash-socket.js.map