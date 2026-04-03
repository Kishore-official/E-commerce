import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { NotificationType, UserRole } from '@ecommerce/shared-types';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { User, UserDocument } from '@modules/identity/schemas/user.schema';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const notification = await this.notificationModel.create({
      id: uuidv4(),
      ...data,
    });
    this.logger.debug(`Notification created for user ${data.userId}: ${data.title}`);
    return notification;
  }

  async createForAdmins(data: Omit<CreateNotificationData, 'userId'>): Promise<void> {
    const admins = await this.userModel.find({
      role: { $in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      isActive: true,
    }).exec();

    if (admins.length === 0) return;

    const notifications = admins.map((admin) => ({
      id: uuidv4(),
      userId: admin.id,
      ...data,
    }));

    await this.notificationModel.insertMany(notifications);
    this.logger.debug(`Notification sent to ${admins.length} admin(s): ${data.title}`);
  }

  async findByUser(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Notification[]; totalItems: number }> {
    const skip = (page - 1) * limit;
    const [data, totalItems] = await Promise.all([
      this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments({ userId }).exec(),
    ]);
    return { data, totalItems };
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, isRead: false }).exec();
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationModel.updateOne(
      { id: notificationId, userId },
      { $set: { isRead: true } },
    ).exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } },
    ).exec();
  }
}
