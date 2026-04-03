import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  function createMockContext(isPublic: boolean): ExecutionContext {
    const mockHandler = jest.fn();
    const mockClass = jest.fn();

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);

    return {
      getHandler: () => mockHandler,
      getClass: () => mockClass,
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access when @Public() is set', async () => {
    const context = createMockContext(true);
    // Mock the parent AuthGuard's canActivate to avoid needing Passport
    jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockResolvedValue(true);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException when no user is present', () => {
    const context = createMockContext(false);
    expect(() => guard.handleRequest(null, null, null, context)).toThrow(UnauthorizedException);
  });

  it('should return user when handleRequest receives valid user', () => {
    const context = createMockContext(false);
    const user = { sub: 'user-id', email: 'test@example.com', role: 'customer' };
    expect(guard.handleRequest(null, user, null, context)).toEqual(user);
  });

  it('should rethrow error from handleRequest', () => {
    const context = createMockContext(false);
    const error = new Error('JWT expired');
    expect(() => guard.handleRequest(error, null, null, context)).toThrow('JWT expired');
  });

  it('should return null for public routes when no user', () => {
    const context = createMockContext(true);
    expect(guard.handleRequest(null, null, null, context)).toBeNull();
  });

  it('should return user for public routes when user is present', () => {
    const context = createMockContext(true);
    const user = { sub: 'user-id', email: 'test@example.com', role: 'customer' };
    expect(guard.handleRequest(null, user, null, context)).toEqual(user);
  });
});
