import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserRole, VendorStatus } from '@ecommerce/shared-types';
import { ActiveVendorGuard } from './active-vendor.guard';
import { Vendor, VendorDocument } from '../../modules/identity/schemas/vendor.schema';

describe('ActiveVendorGuard', () => {
  let guard: ActiveVendorGuard;
  let mockVendorModel: any;

  beforeEach(() => {
    mockVendorModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };
    guard = new ActiveVendorGuard(mockVendorModel as unknown as Model<VendorDocument>);
    jest.clearAllMocks();
  });

  function createMockContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow super_admin to bypass vendor status check', async () => {
    const context = createMockContext({
      sub: 'admin-id',
      role: UserRole.SUPER_ADMIN,
      vendorId: 'vendor-123',
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockVendorModel.findOne).not.toHaveBeenCalled();
  });

  it('should allow admin to bypass vendor status check', async () => {
    const context = createMockContext({
      sub: 'admin-id',
      role: UserRole.ADMIN,
      vendorId: 'vendor-123',
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockVendorModel.findOne).not.toHaveBeenCalled();
  });

  it('should allow access when user is not vendor or vendor_staff', async () => {
    const context = createMockContext({
      sub: 'user-id',
      role: UserRole.CUSTOMER,
    });
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockVendorModel.findOne).not.toHaveBeenCalled();
  });

  it('should allow access when vendor status is APPROVED', async () => {
    const context = createMockContext({
      sub: 'user-id',
      role: UserRole.VENDOR,
      vendorId: 'vendor-123',
    });
    mockVendorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        id: 'vendor-123',
        status: VendorStatus.APPROVED,
      }),
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockVendorModel.findOne).toHaveBeenCalledWith({ id: 'vendor-123' });
  });

  it('should deny access when vendor status is PENDING', async () => {
    const context = createMockContext({
      sub: 'user-id',
      role: UserRole.VENDOR,
      vendorId: 'vendor-123',
    });
    mockVendorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        id: 'vendor-123',
        status: VendorStatus.PENDING,
      }),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    mockVendorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        id: 'vendor-123',
        status: VendorStatus.PENDING,
      }),
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Vendor account is pending. Only approved vendors can access this resource.',
    );
  });

  it('should deny access when vendor status is SUSPENDED', async () => {
    const context = createMockContext({
      sub: 'user-id',
      role: UserRole.VENDOR,
      vendorId: 'vendor-123',
    });
    mockVendorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        id: 'vendor-123',
        status: VendorStatus.SUSPENDED,
      }),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    mockVendorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        id: 'vendor-123',
        status: VendorStatus.SUSPENDED,
      }),
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Vendor account is suspended. Only approved vendors can access this resource.',
    );
  });

  it('should deny access when vendor status is REJECTED', async () => {
    const context = createMockContext({
      sub: 'user-id',
      role: UserRole.VENDOR,
      vendorId: 'vendor-123',
    });
    mockVendorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        id: 'vendor-123',
        status: VendorStatus.REJECTED,
      }),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    mockVendorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        id: 'vendor-123',
        status: VendorStatus.REJECTED,
      }),
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Vendor account is rejected. Only approved vendors can access this resource.',
    );
  });

  it('should deny access when vendor is not found', async () => {
    const context = createMockContext({
      sub: 'user-id',
      role: UserRole.VENDOR,
      vendorId: 'vendor-123',
    });
    mockVendorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    mockVendorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(guard.canActivate(context)).rejects.toThrow('Vendor not found');
  });

  it('should deny access when vendor_staff user has no vendorId', async () => {
    const context = createMockContext({
      sub: 'user-id',
      role: UserRole.VENDOR_STAFF,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'User is not associated with any vendor',
    );
  });

  it('should return false when no user is present', async () => {
    const context = createMockContext(null);
    const result = await guard.canActivate(context);
    expect(result).toBe(false);
  });

  it('should allow vendor_staff when vendor is approved', async () => {
    const context = createMockContext({
      sub: 'user-id',
      role: UserRole.VENDOR_STAFF,
      vendorId: 'vendor-123',
    });
    mockVendorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        id: 'vendor-123',
        status: VendorStatus.APPROVED,
      }),
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockVendorModel.findOne).toHaveBeenCalledWith({ id: 'vendor-123' });
  });
});
