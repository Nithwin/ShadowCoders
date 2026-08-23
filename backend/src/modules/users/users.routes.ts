import { Express, Router } from 'express';
import * as userController from './users.controller';
import { verifyAccess, requireRole } from '../../middleware/auth';

export const registerUserRoutes = (app: Express) => {
    const router = Router();

    // Public routes (no auth required) - e.g. for images that need to be loaded by <img> tags
    router.get('/:id/picture', userController.getUserPicture);

    // Routes requiring only authentication (Student + Staff)
    router.use(verifyAccess);
    // router.get('/:id/picture', userController.getUserPicture); // Moved up

    // Routes requiring STAFF (Admin) role
    const adminRouter = Router();
    adminRouter.use(requireRole('STAFF'));

    adminRouter.get('/', userController.getAllUsers);
    adminRouter.post('/', userController.createUser);
    adminRouter.get('/:id', userController.getUserById);
    adminRouter.put('/:id', userController.updateUser);
    adminRouter.delete('/:id', userController.deleteUser);
    
    // Mount admin routes (effectively applying the middleware to them)
    router.use('/', adminRouter);

    app.use('/api/users', router);
};

