import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { EventBusService } from '@common/events/event-bus.service';
import { User, UserDocument } from '../schemas/user.schema';
import { UserRoleChangedEvent, UserStatusChangedEvent } from '../events/user.events';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly eventBus: EventBusService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).select('+passwordHash').lean().exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findOne({ id }).exec();
  }

  async findAll(opts: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<PaginatedResult<User>> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (opts.role) {
      query['role'] = opts.role as UserRole;
    }
    if (opts.search) {
      query['email'] = { $regex: opts.search, $options: 'i' };
    }

    const [items, totalItems] = await Promise.all([
      this.userModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        hasNextPage: page * limit < totalItems,
        hasPreviousPage: page > 1,
      },
    };
  }

  async create(data: Partial<User>): Promise<User> {
    const user = new this.userModel(data);
    return user.save();
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.userModel.findOneAndUpdate({ id }, { $set: data }, { new: true }).exec();
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async adminUpdateRole(id: string, newRole: UserRole, adminId: string): Promise<User> {
    const user = await this.userModel.findOne({ id }).exec();
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const oldRole = user.role;
    const updated = await this.userModel.findOneAndUpdate({ id }, { $set: { role: newRole } }, { new: true }).exec();
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    this.eventBus.emit(new UserRoleChangedEvent(id, { changedBy: adminId, oldRole, newRole }));
    return updated;
  }

  async adminUpdateStatus(id: string, isActive: boolean, adminId: string): Promise<User> {
    const user = await this.userModel.findOne({ id }).exec();
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const updated = await this.userModel.findOneAndUpdate({ id }, { $set: { isActive } }, { new: true }).exec();
    if (!updated) throw new NotFoundException(`User ${id} not found`);
    this.eventBus.emit(new UserStatusChangedEvent(id, { changedBy: adminId, isActive }));
    return updated;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.updateOne({ id }, { $set: { lastLoginAt: new Date() } }).exec();
  }
}
