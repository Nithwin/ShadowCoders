import { Request, Response } from 'express';
import * as userService from './users.service';
import { Role } from '@prisma/client';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { role, department, year, sortBy, sortOrder } = req.query;
    
    const params: {
      role?: Role;
      department?: string;
      year?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {};

    if (role) params.role = role as Role;
    if (department) params.department = department as string;
    if (year) params.year = parseInt(year as string);
    if (sortBy) params.sortBy = sortBy as string;
    if (sortOrder) params.sortOrder = sortOrder as 'asc' | 'desc';

    const users = await userService.getAllUsers(params);
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'User ID is required' });
    }
    await userService.deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const userData = req.body;
        // Basic validation
        if (!userData.email || !userData.password || !userData.name) {
             return res.status(400).json({ message: 'Missing required fields' });
        }

        const newUser = await userService.createUser(userData);
        res.status(201).json(newUser);
    } catch (error: any) {
        console.error('Error creating user:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: 'Failed to create user' });
    }
}
