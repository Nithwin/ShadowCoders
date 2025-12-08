"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserPicture = exports.createUser = exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = void 0;
const userService = __importStar(require("./users.service"));
const getAllUsers = async (req, res) => {
    try {
        const { role, department, year, sortBy, sortOrder } = req.query;
        const params = {};
        if (role)
            params.role = role;
        if (department)
            params.department = department;
        if (year)
            params.year = parseInt(year);
        if (sortBy)
            params.sortBy = sortBy;
        if (sortOrder)
            params.sortOrder = sortOrder;
        const users = await userService.getAllUsers(params);
        res.json(users);
    }
    catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        const user = await userService.getUserById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
};
exports.getUserById = getUserById;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        const updateData = req.body;
        // Password hashing is now handled in the service layer if provided.
        // We no longer delete it here.
        const user = await userService.updateUser(id, updateData);
        res.json(user);
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        await userService.deleteUser(id);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
};
exports.deleteUser = deleteUser;
const createUser = async (req, res) => {
    try {
        const userData = req.body;
        // Basic validation
        if (!userData.email || !userData.password || !userData.name) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const newUser = await userService.createUser(userData);
        res.status(201).json(newUser);
    }
    catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Failed to create user' });
    }
};
exports.createUser = createUser;
const getUserPicture = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        // Use prisma directly here or add a service method. 
        // Since we need bytes, standard getUserById typically omits huge blobs or just returns basic info.
        // Let's call a specific service method or use prisma here for brevity if allowed, 
        // but better to stick to service pattern.
        const pictureData = await userService.getUserPictureData(id);
        if (!pictureData || !pictureData.pictureData) {
            // Fallback to default or 404. If no picture, maybe redirect to a default placeholder?
            // Or just 404.
            return res.status(404).send('Not found');
        }
        res.setHeader('Content-Type', pictureData.pictureMimeType || 'image/jpeg');
        res.send(pictureData.pictureData);
    }
    catch (error) {
        console.error('Error serving user picture:', error);
        res.status(500).send('Error serving picture');
    }
};
exports.getUserPicture = getUserPicture;
//# sourceMappingURL=users.controller.js.map