import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@ecommerce/shared-types';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(
    user: any,
    requiredRoles?: UserRole[],
  ): ExecutionContext {
    const mockHandler = jest.fn();
    const mockClass = jest.fn();

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return {
      getHandler: () => mockHandler,
      getClass: () => mockClass,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access when no @Roles() decorator is set', () => {
    const context = createMockContext(
      { sub: 'user-id', role: UserRole.CUSTOMER },
      undefined,
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when empty roles array is set', () => {
    const context = createMockContext(
      { sub: 'user-id', role: UserRole.CUSTOMER },
      [],
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user role matches required role', () => {
    const context = createMockContext(
      { sub: 'user-id', role: UserRole.ADMIN },
      [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user role does not match required roles', () => {
    const context = createMockContext(
      { sub: 'user-id', role: UserRole.CUSTOMER },
      [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    );
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should deny access when no user is present on request', () => {
    const context = createMockContext(null, [UserRole.ADMIN]);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access for vendor when VENDOR role is required', () => {
    const context = createMockContext(
      { sub: 'user-id', role: UserRole.VENDOR },
      [UserRole.VENDOR, UserRole.VENDOR_STAFF],
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access for vendor_staff when VENDOR_STAFF role is required', () => {
    const context = createMockContext(
      { sub: 'user-id', role: UserRole.VENDOR_STAFF },
      [UserRole.VENDOR, UserRole.VENDOR_STAFF],
    );
    expect(guard.canActivate(context)).toBe(true);
  });
});

