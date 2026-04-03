import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@ecommerce/shared-types';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class VendorOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      return false;
    }

    // Platform roles bypass vendor ownership checks
    if (
      [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role as UserRole)
    ) {
      return true;
    }

    const resourceVendorId =
      request.params?.vendorId ||
      request.body?.vendorId ||
      request.query?.vendorId;

    // If no vendorId in the request, pass through
    if (!resourceVendorId) {
      return true;
    }

    if (!user.vendorId) {
      throw new ForbiddenException('User is not associated with any vendor');
    }

    if (user.vendorId !== resourceVendorId) {
      throw new ForbiddenException('Access denied to this vendor resource');
    }

    return true;
  }
}
