import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, VendorStatus, PaginatedResult } from '@ecommerce/shared-types';
import { Vendor, VendorDocument } from '../schemas/vendor.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { RegisterVendorDto } from '../dto/register-vendor.dto';
import { AdminCreateVendorDto } from '../dto/admin-create-vendor.dto';
import { UpdateVendorDto } from '../dto/update-vendor.dto';
import { generateSlug } from '@common/utils/slug.util';
import { assertVendorTransition } from '../state-machines/vendor-status.machine';
import { EventBusService } from '@common/events/event-bus.service';
import { UsersService } from './users.service';
import {
  VendorRegisteredEvent,
  VendorApprovedEvent,
  VendorRejectedEvent,
  VendorSuspendedEvent,
} from '../events/vendor.events';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class VendorService {
  constructor(
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
    private readonly eventBus: EventBusService,
  ) {}

  async register(userId: string, dto: RegisterVendorDto): Promise<Vendor> {
    const user = await this.userModel.findOne({ id: userId }).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.CUSTOMER) {
      throw new BadRequestException('Only customers can register as vendors');
    }

    const existingVendor = await this.vendorModel.findOne({ userId }).exec();
    if (existingVendor) {
      throw new ConflictException('User already has a vendor account');
    }

    const slug = await this.ensureUniqueSlug(generateSlug(dto.businessName));

    const vendor = await this.vendorModel.create({
      id: uuidv4(),
      userId,
      businessName: dto.businessName,
      slug,
      businessEmail: dto.businessEmail,
      phone: dto.phone || null,
      description: dto.description || null,
      countryCode: 'SA',
      status: VendorStatus.PENDING,
      commissionRate: 10.0,
    });

    this.eventBus.emit(new VendorRegisteredEvent(vendor.id, userId));
    return vendor;
  }

  async createByAdmin(
    dto: AdminCreateVendorDto,
    adminUserId: string,
  ): Promise<Vendor> {
    const email = dto.email.toLowerCase().trim();

    // Check if user already exists
    let user = await this.userModel.findOne({ email }).exec();
    if (user) {
      // User exists, check if they already have a vendor account
      const existingVendor = await this.vendorModel.findOne({ userId: user.id }).exec();
      if (existingVendor) {
        throw new ConflictException('User already has a vendor account');
      }
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
      const newUser = await this.usersService.create({
        id: uuidv4(),
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone || null,
        role: dto.status === VendorStatus.APPROVED ? UserRole.VENDOR : UserRole.CUSTOMER,
      });
      // Fetch as document to match type
      user = await this.userModel.findOne({ id: newUser.id }).exec();
      if (!user) {
        throw new NotFoundException('Failed to create user');
      }
    }

    // Create vendor record
    const slug = await this.ensureUniqueSlug(generateSlug(dto.businessName));
    const initialStatus = dto.status || VendorStatus.PENDING;

    const vendor = await this.vendorModel.create({
      id: uuidv4(),
      userId: user.id,
      businessName: dto.businessName,
      slug,
      businessEmail: dto.businessEmail,
      phone: dto.businessPhone || null,
      description: dto.description || null,
      countryCode: 'SA',
      status: initialStatus,
      commissionRate: 10.0,
      approvedAt: initialStatus === VendorStatus.APPROVED ? new Date() : null,
    });

    // If approved immediately, ensure user role is VENDOR
    if (initialStatus === VendorStatus.APPROVED && user.role !== UserRole.VENDOR) {
      await this.usersService.update(user.id, { role: UserRole.VENDOR });
      this.eventBus.emit(new VendorApprovedEvent(vendor.id, user.id, adminUserId));
    } else {
      this.eventBus.emit(new VendorRegisteredEvent(vendor.id, user.id));
    }

    return vendor;
  }

  async approve(vendorId: string, adminUserId: string): Promise<Vendor> {
    const vendor = await this.vendorModel.findOne({ id: vendorId }).exec();
    if (!vendor) {
      throw new NotFoundException(`Vendor '${vendorId}' not found`);
    }

    assertVendorTransition(vendor.status, VendorStatus.APPROVED);

    const updated = await this.vendorModel.findOneAndUpdate(
      { id: vendorId },
      { $set: { status: VendorStatus.APPROVED, approvedAt: new Date() } },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundException(`Vendor '${vendorId}' not found`);
    }

    await this.usersService.update(vendor.userId, { role: UserRole.VENDOR });

    this.eventBus.emit(new VendorApprovedEvent(vendorId, vendor.userId, adminUserId));
    return updated;
  }

  async reject(vendorId: string, adminUserId: string, reason?: string): Promise<Vendor> {
    const vendor = await this.vendorModel.findOne({ id: vendorId }).exec();
    if (!vendor) {
      throw new NotFoundException(`Vendor '${vendorId}' not found`);
    }

    assertVendorTransition(vendor.status, VendorStatus.REJECTED);

    const updated = await this.vendorModel.findOneAndUpdate(
      { id: vendorId },
      { $set: { status: VendorStatus.REJECTED, rejectionReason: reason || null } },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundException(`Vendor '${vendorId}' not found`);
    }

    this.eventBus.emit(new VendorRejectedEvent(vendorId, vendor.userId, adminUserId, reason));
    return updated;
  }

  async suspend(vendorId: string, adminUserId: string, reason?: string): Promise<Vendor> {
    const vendor = await this.vendorModel.findOne({ id: vendorId }).exec();
    if (!vendor) {
      throw new NotFoundException(`Vendor '${vendorId}' not found`);
    }

    assertVendorTransition(vendor.status, VendorStatus.SUSPENDED);

    const updated = await this.vendorModel.findOneAndUpdate(
      { id: vendorId },
      { $set: { status: VendorStatus.SUSPENDED, rejectionReason: reason || null } },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundException(`Vendor '${vendorId}' not found`);
    }

    this.eventBus.emit(new VendorSuspendedEvent(vendorId, vendor.userId, adminUserId, reason));
    return updated;
  }

  async findByUserId(userId: string): Promise<Vendor | null> {
    return this.vendorModel.findOne({ userId }).exec();
  }

  async findById(vendorId: string): Promise<Vendor> {
    const vendor = await this.vendorModel.findOne({ id: vendorId }).exec();
    if (!vendor) {
      throw new NotFoundException(`Vendor '${vendorId}' not found`);
    }
    return vendor;
  }

  async findByVendorId(vendorId: string): Promise<Vendor> {
    return this.findById(vendorId);
  }

  async updateProfile(vendorId: string, dto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.vendorModel.findOne({ id: vendorId }).exec();
    if (!vendor) {
      throw new NotFoundException(`Vendor '${vendorId}' not found`);
    }

    const updateData: Partial<Vendor> = {};

    // Update allowed fields
    if (dto.businessName !== undefined) {
      updateData.businessName = dto.businessName;
      // Regenerate slug if business name changes
      updateData.slug = await this.ensureUniqueSlug(
        generateSlug(dto.businessName),
        vendorId,
      );
    }
    if (dto.businessEmail !== undefined) {
      updateData.businessEmail = dto.businessEmail;
    }
    if (dto.phone !== undefined) {
      updateData.phone = dto.phone || null;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description || null;
    }
    if (dto.logoUrl !== undefined) {
      updateData.logoUrl = dto.logoUrl || null;
    }

    const updated = await this.vendorModel.findOneAndUpdate(
      { id: vendorId },
      { $set: updateData },
      { new: true }
    ).exec();

    if (!updated) {
      throw new NotFoundException(`Vendor '${vendorId}' not found`);
    }

    return updated;
  }

  async findAll(query: {
    page: number;
    limit: number;
    status?: VendorStatus;
  }): Promise<PaginatedResult<Vendor>> {
    const filter: Record<string, unknown> = {};
    if (query.status) {
      filter.status = query.status;
    }

    const [data, totalItems] = await Promise.all([
      this.vendorModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.vendorModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / query.limit);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) {
      filter.id = { $ne: excludeId };
    }

    const existing = await this.vendorModel.findOne(filter).exec();
    if (!existing) return slug;

    const suffix = Math.random().toString(36).substring(2, 8);
    return `${slug}-${suffix}`;
  }
}

