
import jwt from 'jsonwebtoken';

export const createMockToken = (payload: object = {}, expiresIn: string = '1h') => {
  return jwt.sign(
    { userId: 'test-user-id', role: 'STUDENT', ...payload },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: expiresIn as any }
  );
};

export const mockRequest = (body: object = {}, headers: object = {}) => {
  return {
    body,
    headers,
  } as any;
};

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};
