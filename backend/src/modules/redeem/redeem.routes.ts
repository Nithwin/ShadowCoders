import { Express } from 'express';
import { verifyAccess, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as redeemController from './redeem.controller';
import {
  createRedeemItemSchema,
  updateRedeemItemSchema,
  createRedeemOrderSchema,
  updateRedeemOrderSchema,
  listRedeemOrdersSchema,
} from './redeem.zod';

export const registerRedeemRoutes = (app: Express) => {
  // Student routes
  app.get(
    '/api/student/redeem/items',
    verifyAccess,
    redeemController.getAvailableItems
  );
  
  app.post(
    '/api/student/redeem/orders',
    verifyAccess,
    validate(createRedeemOrderSchema),
    redeemController.createOrder
  );
  
  app.get(
    '/api/student/redeem/orders',
    verifyAccess,
    validate(listRedeemOrdersSchema),
    redeemController.getMyOrders
  );
  
  // Admin routes
  app.get(
    '/api/admin/redeem/items',
    verifyAccess,
    requireRole('STAFF'),
    redeemController.getAllItems
  );
  
  app.post(
    '/api/admin/redeem/items',
    verifyAccess,
    requireRole('STAFF'),
    validate(createRedeemItemSchema),
    redeemController.createItem
  );
  
  app.put(
    '/api/admin/redeem/items/:id',
    verifyAccess,
    requireRole('STAFF'),
    validate(updateRedeemItemSchema),
    redeemController.updateItem
  );
  
  app.get(
    '/api/admin/redeem/orders',
    verifyAccess,
    requireRole('STAFF'),
    validate(listRedeemOrdersSchema),
    redeemController.getAllOrders
  );
  
  app.get(
    '/api/admin/redeem/orders/:id',
    verifyAccess,
    requireRole('STAFF'),
    redeemController.getOrderById
  );
  
  app.put(
    '/api/admin/redeem/orders/:id',
    verifyAccess,
    requireRole('STAFF'),
    validate(updateRedeemOrderSchema),
    redeemController.updateOrder
  );
};

