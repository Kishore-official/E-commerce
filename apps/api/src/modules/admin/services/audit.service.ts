import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(data: AuditLogData): Promise<AuditLog> {
    const auditLog = new this.auditLogModel({
      id: uuidv4(),
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      changes: data.changes || null,
      ipAddress: data.ipAddress || null,
    });

    return auditLog.save();
  }

  async findAll(
    query: {
      entityType?: string;
      entityId?: string;
      action?: string;
      userId?: string;
      page: number;
      limit: number;
    },
  ): Promise<{ data: AuditLog[]; totalItems: number }> {
    const filter: Record<string, unknown> = {};

    if (query.entityType) {
      filter['entityType'] = query.entityType;
    }
    if (query.entityId) {
      filter['entityId'] = query.entityId;
    }
    if (query.action) {
      filter['action'] = query.action;
    }
    if (query.userId) {
      filter['userId'] = query.userId;
    }

    const skip = (query.page - 1) * query.limit;

    const [data, totalItems] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return { data, totalItems };
  }

  async findById(id: string): Promise<AuditLog> {
    const auditLog = await this.auditLogModel.findOne({ id }).exec();
    if (!auditLog) {
      throw new NotFoundException(`Audit log '${id}' not found`);
    }
    return auditLog;
  }
}
