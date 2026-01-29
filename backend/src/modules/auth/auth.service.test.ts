import { handleEmailLogin } from './auth.service';
import * as authRepo from './auth.repo';
import * as tokenService from './token.service';
import bcrypt from 'bcrypt';

// Mock dependencies
jest.mock('./auth.repo');
jest.mock('./token.service');
jest.mock('bcrypt');

describe('AuthService', () => {
    describe('handleEmailLogin', () => {
        const mockUser = {
            id: '123',
            email: 'test@example.com',
            password: 'hashedpassword',
            role: 'STUDENT',
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return tokens for valid credentials', async () => {
            // Setup mocks
            (authRepo.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (tokenService.generateAccessToken as jest.Mock).mockReturnValue('access_token');
            (tokenService.generateAndSaveRefreshToken as jest.Mock).mockResolvedValue('refresh_token');

            // Execute
            const result = await handleEmailLogin({
                email: 'test@example.com',
                password: 'password',
            });

            // Assert
            expect(result).toEqual({
                accessToken: 'access_token',
                refreshToken: 'refresh_token',
            });
            expect(authRepo.findUserByEmail).toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedpassword');
        });

        it('should throw error for invalid email', async () => {
            (authRepo.findUserByEmail as jest.Mock).mockResolvedValue(null);

            await expect(handleEmailLogin({
                email: 'wrong@example.com',
                password: 'password',
            })).rejects.toEqual(expect.objectContaining({
                status: 401,
                message: 'Invalid email or password',
            }));
        });

        it('should throw error for invalid password', async () => {
            (authRepo.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(handleEmailLogin({
                email: 'test@example.com',
                password: 'wrongpassword',
            })).rejects.toEqual(expect.objectContaining({
                status: 401,
                message: 'Invalid email or password',
            }));
        });

        it('should throw error when missing fields', async () => {
            await expect(handleEmailLogin({
                email: '',
                password: '',
            })).rejects.toEqual(expect.objectContaining({
                status: 400,
                message: 'Email and password are required',
            }));
        });

        it('should handle database errors gracefully', async () => {
            (authRepo.findUserByEmail as jest.Mock).mockRejectedValue({
                code: 'P1001',
                message: "Can't reach database server"
            });

            await expect(handleEmailLogin({
                email: 'test@example.com',
                password: 'password',
            })).rejects.toEqual(expect.objectContaining({
                status: 503,
                code: 'DATABASE_CONNECTION_ERROR'
            }));
        });
    });
});
