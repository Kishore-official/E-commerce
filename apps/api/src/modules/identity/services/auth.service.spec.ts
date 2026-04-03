import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserRole } from '@ecommerce/shared-types';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from '../schemas/user.schema';
import { Vendor } from '../schemas/vendor.schema';
import { VendorStaff } from '../schemas/vendor-staff.schema';
import { RefreshToken } from '../schemas/refresh-token.schema';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let refreshTokenModel: any;
  let vendorModel: any;
  let vendorStaffModel: any;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: '', // set in beforeAll
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    avatarUrl: null,
    role: UserRole.CUSTOMER,
    emailVerified: false,
    isActive: true,
    lastLoginAt: null,
  };

  beforeAll(async () => {
    (mockUser as any).passwordHash = await bcrypt.hash('Password123!', 4); // Low rounds for speed
  });

  beforeEach(async () => {
    const mockRefreshTokenModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      create: jest.fn(),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const mockVendorModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const mockVendorStaffModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateLastLogin: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('7d'),
          },
        },
        {
          provide: getModelToken(RefreshToken.name),
          useValue: mockRefreshTokenModel,
        },
        {
          provide: getModelToken(Vendor.name),
          useValue: mockVendorModel,
        },
        {
          provide: getModelToken(VendorStaff.name),
          useValue: mockVendorStaffModel,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    refreshTokenModel = module.get(getModelToken(RefreshToken.name));
    vendorModel = module.get(getModelToken(Vendor.name));
    vendorStaffModel = module.get(getModelToken(VendorStaff.name));
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      const result = await authService.validateUser('test@example.com', 'Password123!');
      expect(result).toBeDefined();
      expect(result!.id).toBe('user-uuid-1');
    });

    it('should return null when email is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const result = await authService.validateUser('unknown@example.com', 'Password123!');
      expect(result).toBeNull();
    });

    it('should return null when password is wrong', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      const result = await authService.validateUser('test@example.com', 'WrongPassword1');
      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false } as User);
      const result = await authService.validateUser('test@example.com', 'Password123!');
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('should create a user and return auth response', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as User);
      // resolveVendorId returns null for CUSTOMER
      vendorModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      refreshTokenModel.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          role: UserRole.CUSTOMER,
        }),
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should normalize email to lowercase', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as User);
      vendorModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      refreshTokenModel.create.mockResolvedValue({});

      await authService.register({
        email: '  Test@Example.COM  ',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });
  });

  describe('login', () => {
    it('should return auth response with tokens', async () => {
      // CUSTOMER role - resolveVendorId returns null
      vendorModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      refreshTokenModel.create.mockResolvedValue({});

      const result = await authService.login(mockUser as User);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe('user-uuid-1');
      expect(usersService.updateLastLogin).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should include vendorId in JWT for vendor users', async () => {
      const vendorUser = { ...mockUser, role: UserRole.VENDOR } as User;
      vendorModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ id: 'vendor-uuid-1' }),
      });
      refreshTokenModel.create.mockResolvedValue({});

      await authService.login(vendorUser);

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ vendorId: 'vendor-uuid-1' }),
      );
    });
  });

  describe('refresh', () => {
    it('should issue new tokens and revoke old token', async () => {
      const rawToken = 'test-refresh-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      refreshTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'token-id-1',
          userId: 'user-uuid-1',
          tokenHash,
          expiresAt: new Date(Date.now() + 86400000), // 1 day from now
          revoked: false,
        }),
      });
      refreshTokenModel.updateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) });

      usersService.findById.mockResolvedValue(mockUser as User);
      vendorModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      refreshTokenModel.create.mockResolvedValue({});

      const result = await authService.refresh(rawToken);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(refreshTokenModel.updateOne).toHaveBeenCalledWith(
        { id: 'token-id-1' },
        { $set: { revoked: true } },
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      refreshTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(authService.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const rawToken = 'expired-refresh-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      refreshTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'token-id-2',
          userId: 'user-uuid-1',
          tokenHash,
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
          revoked: false,
        }),
      });
      refreshTokenModel.updateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) });

      await expect(authService.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenModel.updateOne).toHaveBeenCalledWith(
        { id: 'token-id-2' },
        { $set: { revoked: true } },
      );
    });
  });

  describe('logout', () => {
    it('should revoke the matching refresh token', async () => {
      const rawToken = 'logout-refresh-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      refreshTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          id: 'token-id-3',
          tokenHash,
          revoked: false,
        }),
      });
      refreshTokenModel.updateOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) });

      await authService.logout(rawToken);

      expect(refreshTokenModel.updateOne).toHaveBeenCalledWith(
        { id: 'token-id-3' },
        { $set: { revoked: true } },
      );
    });

    it('should succeed silently if token not found', async () => {
      refreshTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(authService.logout('unknown-token')).resolves.not.toThrow();
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      usersService.findById.mockResolvedValue(mockUser as User);
      // CUSTOMER role - resolveVendorId returns null
      vendorModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await authService.getProfile('user-uuid-1');

      expect(result.id).toBe('user-uuid-1');
      expect(result.email).toBe('test@example.com');
      expect(result.vendorId).toBeNull();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(authService.getProfile('unknown-uuid')).rejects.toThrow(UnauthorizedException);
    });
  });
});
