import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRole, VendorStatus } from '@ecommerce/shared-types';
import { JwtPayload } from '../decorators/current-user.decorator';
import { Vendor, VendorDocument } from '../../modules/identity/schemas/vendor.schema';

@Injectable()
export class ActiveVendorGuard implements CanActivate {
  constructor(
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      return false;
    }

    // Platform roles bypass vendor status checks
    if (
      [UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(user.role as UserRole)
    ) {
      return true;
    }

    // Only check vendor status for vendor-related roles
    if (
      user.role !== UserRole.VENDOR &&
      user.role !== UserRole.VENDOR_STAFF
    ) {
      return true;
    }

    if (!user.vendorId) {
      throw new ForbiddenException('User is not associated with any vendor');
    }

    const vendor = await this.vendorModel.findOne({ id: user.vendorId }).exec();

    if (!vendor) {
      throw new ForbiddenException('Vendor not found');
    }

    if (vendor.status !== VendorStatus.APPROVED) {
      throw new ForbiddenException(
        `Vendor account is ${vendor.status}. Only approved vendors can access this resource.`,
      );
    }

    return true;
  }
}
