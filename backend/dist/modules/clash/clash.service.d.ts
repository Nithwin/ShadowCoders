import { ClashMode } from '@prisma/client';
export declare class ClashService {
    /**
     * Create a new clash room
     */
    createRoom(userId: string, data: {
        mode?: ClashMode;
        difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
        maxParticipants?: number;
        timeLimitMins?: number;
        isPrivate?: boolean;
        allowedLanguages?: string[];
    }): Promise<any>;
    /**
     * Join a clash room
     */
    joinRoom(userId: string, roomCode: string): Promise<any>;
    /**
     * Leave a clash room
     */
    leaveRoom(userId: string, roomId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Start a clash room (creator only)
     */
    startRoom(userId: string, roomId: string): Promise<{
        success: boolean;
        countdown: number;
    }>;
    /**
     * Submit code for a clash
     */
    submitCode(userId: string, roomId: string, code: string, language: string): Promise<{
        submission: any;
        results: ({
            input: any;
            expectedOutput: any;
            actualOutput: string | null;
            passed: boolean;
            error: string | null;
        } | {
            input: any;
            expectedOutput: any;
            actualOutput: null;
            passed: boolean;
            error: any;
        })[];
        passed: boolean;
        score: number;
    }>;
    /**
     * Get room details with leaderboard
     */
    getRoomDetails(roomId: string, userId?: string): Promise<any>;
    /**
     * Get available public rooms
     */
    getAvailableRooms(): Promise<any>;
    /**
     * Finish a room (auto-called when time expires)
     */
    finishRoom(roomId: string): Promise<{
        success: boolean;
    }>;
}
export declare const clashService: ClashService;
//# sourceMappingURL=clash.service.d.ts.map