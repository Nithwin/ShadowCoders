import { Request, Response, NextFunction } from 'express';
import * as userService from './users.service';
import { Role } from '@prisma/client';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
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
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
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
    next(error);
  }
};

export const getUserGithubStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    const data = await userService.getUserGithubStats(id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
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
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ message: 'User ID is required' });
    }
    await userService.deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userData = req.body;
        // Basic validation - only email and password are required
        // name and reg_no can be null
        if (!userData.email || !userData.password) {
             return res.status(400).json({ message: 'Email and password are required' });
        }

        // Convert empty strings or undefined to null for optional fields
        if (userData.name === '' || userData.name === undefined) {
            userData.name = null;
        }
        if (userData.reg_no === '' || userData.reg_no === undefined) {
            userData.reg_no = null;
        }

        const newUser = await userService.createUser(userData);
        res.status(201).json(newUser);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Email already exists' });
        }
        next(error);
    }
}

export const getUserPicture = async (req: Request, res: Response, next: NextFunction) => {
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
  } catch(error) {
      next(error);
  }
}
