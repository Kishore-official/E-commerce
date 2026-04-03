import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { VendorOwnerGuard } from './vendor-owner.guard';

describe('VendorOwnerGuard', () => {
  let guard: VendorOwnerGuard;

  beforeEach(() => {
    guard = new VendorOwnerGuard();
  });

  function createMockContext(
    user: any,
    params: any = {},
    body: any = {},
    query: any = {},
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user, params, body, query }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow super_admin to access any vendor resource', () => {
    const context = createMockContext(
      { sub: 'admin-id', role: 'super_admin' },
      { vendorId: 'vendor-123' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow admin to access any vendor resource', () => {
    const context = createMockContext(
      { sub: 'admin-id', role: 'admin' },
      { vendorId: 'vendor-123' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow vendor user when vendorId matches', () => {
    const context = createMockContext(
      { sub: 'user-id', role: 'vendor', vendorId: 'vendor-123' },
      { vendorId: 'vendor-123' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny vendor user when vendorId does not match', () => {
    const context = createMockContext(
      { sub: 'user-id', role: 'vendor', vendorId: 'vendor-456' },
      { vendorId: 'vendor-123' },
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny when user has no vendorId but resource requires it', () => {
    const context = createMockContext(
      { sub: 'user-id', role: 'customer' },
      { vendorId: 'vendor-123' },
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should pass through when no vendorId in request', () => {
    const context = createMockContext(
      { sub: 'user-id', role: 'vendor', vendorId: 'vendor-123' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return false when no user on request', () => {
    const context = createMockContext(null);
    expect(guard.canActivate(context)).toBe(false);
  });
});
