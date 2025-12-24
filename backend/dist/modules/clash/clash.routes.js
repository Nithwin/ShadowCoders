"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerClashRoutes = void 0;
const clash_service_1 = require("./clash.service");
const clash_question_service_1 = require("./clash-question.service");
const auth_1 = require("../../middleware/auth");
const client_1 = require("@prisma/client");
const registerClashRoutes = (app) => {
    // ============================================
    // Room Management Routes
    // ============================================
    // Create a new clash room
    app.post('/api/clash/rooms', auth_1.verifyAccess, async (req, res) => {
        try {
            const userId = req.user.sub;
            const { mode, difficulty, maxParticipants, timeLimitMins, isPrivate, allowedLanguages } = req.body;
            const room = await clash_service_1.clashService.createRoom(userId, {
                mode,
                difficulty,
                maxParticipants,
                timeLimitMins,
                isPrivate,
                allowedLanguages,
            });
            res.json(room);
        }
        catch (error) {
            console.error('[Clash] Error creating room:', error);
            res.status(400).json({ error: error.message });
        }
    });
    // Join a clash room by code
    app.post('/api/clash/rooms/:code/join', auth_1.verifyAccess, async (req, res) => {
        try {
            const userId = req.user.sub;
            const { code } = req.params;
            if (!code)
                return res.status(400).json({ error: 'Room code required' });
            const room = await clash_service_1.clashService.joinRoom(userId, code);
            res.json(room);
        }
        catch (error) {
            console.error('[Clash] Error joining room:', error);
            res.status(400).json({ error: error.message });
        }
    });
    // Leave a clash room
    app.post('/api/clash/rooms/:id/leave', auth_1.verifyAccess, async (req, res) => {
        try {
            const userId = req.user.sub;
            const { id } = req.params;
            if (!id)
                return res.status(400).json({ error: 'Room ID required' });
            const result = await clash_service_1.clashService.leaveRoom(userId, id);
            res.json(result);
        }
        catch (error) {
            console.error('[Clash] Error leaving room:', error);
            res.status(400).json({ error: error.message });
        }
    });
    // Start a clash room (creator only)
    app.post('/api/clash/rooms/:id/start', auth_1.verifyAccess, async (req, res) => {
        try {
            const userId = req.user.sub;
            const { id } = req.params;
            if (!id)
                return res.status(400).json({ error: 'Room ID required' });
            const result = await clash_service_1.clashService.startRoom(userId, id);
            res.json(result);
        }
        catch (error) {
            console.error('[Clash] Error starting room:', error);
            res.status(400).json({ error: error.message });
        }
    });
    // Submit code for a clash
    app.post('/api/clash/rooms/:id/submit', auth_1.verifyAccess, async (req, res) => {
        try {
            const userId = req.user.sub;
            const { id } = req.params;
            if (!id)
                return res.status(400).json({ error: 'Room ID required' });
            const { code, language } = req.body;
            if (!code || !language) {
                return res.status(400).json({ error: 'Code and language are required' });
            }
            const result = await clash_service_1.clashService.submitCode(userId, id, code, language);
            res.json(result);
        }
        catch (error) {
            console.error('[Clash] Error submitting code:', error);
            res.status(400).json({ error: error.message });
        }
    });
    // Get room details
    app.get('/api/clash/rooms/:id', auth_1.verifyAccess, async (req, res) => {
        try {
            const userId = req.user.sub;
            const { id } = req.params;
            if (!id)
                return res.status(400).json({ error: 'Room ID required' });
            const room = await clash_service_1.clashService.getRoomDetails(id, userId);
            res.json(room);
        }
        catch (error) {
            console.error('[Clash] Error getting room details:', error);
            res.status(400).json({ error: error.message });
        }
    });
    // Get available public rooms
    app.get('/api/clash/rooms', auth_1.verifyAccess, async (req, res) => {
        try {
            const rooms = await clash_service_1.clashService.getAvailableRooms();
            res.json(rooms);
        }
        catch (error) {
            console.error('[Clash] Error getting available rooms:', error);
            res.status(500).json({ error: error.message });
        }
    });
    // ============================================
    // Question Management Routes (Admin)
    // ============================================
    // Get all questions (admin only)
    app.get('/api/clash/questions', auth_1.verifyAccess, async (req, res) => {
        try {
            const userRole = req.user.role;
            if (userRole !== client_1.Role.STAFF) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            const { mode, difficulty, limit, offset } = req.query;
            const filters = {};
            if (mode)
                filters.mode = mode;
            if (difficulty)
                filters.difficulty = difficulty;
            if (limit)
                filters.limit = parseInt(limit);
            if (offset)
                filters.offset = parseInt(offset);
            const result = await clash_question_service_1.clashQuestionService.getAllQuestions(filters);
            res.json(result);
        }
        catch (error) {
            console.error('[Clash] Error getting questions:', error);
            res.status(500).json({ error: error.message });
        }
    });
    // Get random question for preview
    app.get('/api/clash/questions/random', auth_1.verifyAccess, async (req, res) => {
        try {
            const { mode, difficulty } = req.query;
            const question = await clash_question_service_1.clashQuestionService.getRandomQuestion(mode, difficulty);
            res.json(question);
        }
        catch (error) {
            console.error('[Clash] Error getting random question:', error);
            res.status(500).json({ error: error.message });
        }
    });
    // Create a question (admin only)
    app.post('/api/clash/questions', auth_1.verifyAccess, async (req, res) => {
        try {
            const userRole = req.user.role;
            if (userRole !== client_1.Role.STAFF) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            const question = await clash_question_service_1.clashQuestionService.createQuestion(req.body);
            res.json(question);
        }
        catch (error) {
            console.error('[Clash] Error creating question:', error);
            res.status(400).json({ error: error.message });
        }
    });
    // Update a question (admin only)
    app.put('/api/clash/questions/:id', auth_1.verifyAccess, async (req, res) => {
        try {
            const userRole = req.user.role;
            if (userRole !== client_1.Role.STAFF) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            const { id } = req.params;
            if (!id)
                return res.status(400).json({ error: 'Question ID required' });
            const question = await clash_question_service_1.clashQuestionService.updateQuestion(id, req.body);
            res.json(question);
        }
        catch (error) {
            console.error('[Clash] Error updating question:', error);
            res.status(400).json({ error: error.message });
        }
    });
    // Delete a question (admin only)
    app.delete('/api/clash/questions/:id', auth_1.verifyAccess, async (req, res) => {
        try {
            const userRole = req.user.role;
            if (userRole !== client_1.Role.STAFF) {
                return res.status(403).json({ error: 'Admin access required' });
            }
            const { id } = req.params;
            if (!id)
                return res.status(400).json({ error: 'Question ID required' });
            await clash_question_service_1.clashQuestionService.deleteQuestion(id);
            res.json({ success: true });
        }
        catch (error) {
            console.error('[Clash] Error deleting question:', error);
            res.status(400).json({ error: error.message });
        }
    });
};
exports.registerClashRoutes = registerClashRoutes;
//# sourceMappingURL=clash.routes.js.map