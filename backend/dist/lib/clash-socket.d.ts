import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from './socket';
export declare class ClashSocketService {
    private io;
    private clashRooms;
    private socketToRoom;
    initialize(io: SocketIOServer): void;
    /**
     * Register Clash socket events
     */
    registerEvents(socket: AuthenticatedSocket): void;
    /**
     * Handle user leaving a room
     */
    private handleLeaveRoom;
    /**
     * Broadcast room update to all participants
     */
    private broadcastRoomUpdate;
    /**
     * Broadcast leaderboard update
     */
    private broadcastLeaderboardUpdate;
    /**
     * Notify room that it has finished
     */
    notifyRoomFinished(roomId: string): Promise<void>;
}
export declare const clashSocketService: ClashSocketService;
//# sourceMappingURL=clash-socket.d.ts.map