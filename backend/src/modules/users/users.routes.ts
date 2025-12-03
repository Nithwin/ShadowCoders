import { Express, Router } from 'express';
import * as userController from './users.controller';
import { verifyAccess, requireRole } from '../../middleware/auth';

export const registerUserRoutes = (app: Express) => {
    const router = Router();

    // All routes require authentication and STAFF (Admin) role
    router.use(verifyAccess);
    router.use(requireRole('STAFF'));

    router.get('/', userController.getAllUsers);
    router.post('/', userController.createUser);
    router.get('/:id', userController.getUserById);
    router.put('/:id', userController.updateUser);
    router.delete('/:id', userController.deleteUser);

    app.use('/api/users', router);
};

