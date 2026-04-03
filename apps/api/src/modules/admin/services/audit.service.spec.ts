import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog } from '../schemas/audit-log.schema';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogModel: any;

  const mockSave = jest.fn();

  beforeEach(async () => {
    // For Mongoose models that use `new this.model(data)`, we need a callable
    // constructor function with static query methods attached.
    const MockModel: any = function (data: any) {
      return { ...data, save: mockSave };
    };
    MockModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    MockModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    MockModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getModelToken(AuditLog.name),
          useValue: MockModel,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogModel = module.get(getModelToken(AuditLog.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should create and save an audit log', async () => {
      const savedDoc = {
        id: 'some-uuid',
        action: 'vendor.approved',
        entityType: 'Vendor',
        entityId: 'vendor-1',
        userId: 'admin-1',
        changes: { status: { old: 'pending', new: 'approved' } },
        ipAddress: null,
        createdAt: new Date(),
      };

      mockSave.mockResolvedValue(savedDoc);

      const result = await service.log({
        action: 'vendor.approved',
        entityType: 'Vendor',
        entityId: 'vendor-1',
        userId: 'admin-1',
        changes: { status: { old: 'pending', new: 'approved' } },
      });

      expect(result).toEqual(savedDoc);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle null changes and ipAddress', async () => {
      const savedDoc = {
        id: 'some-uuid',
        action: 'product.approved',
        entityType: 'Product',
        entityId: 'prod-1',
        userId: 'admin-1',
        changes: null,
        ipAddress: null,
        createdAt: new Date(),
      };

      mockSave.mockResolvedValue(savedDoc);

      const result = await service.log({
        action: 'product.approved',
        entityType: 'Product',
        entityId: 'prod-1',
        userId: 'admin-1',
      });

      expect(result).toEqual(savedDoc);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        { id: 'audit-1', action: 'vendor.approved', entityType: 'Vendor', entityId: 'vendor-1' },
        { id: 'audit-2', action: 'product.approved', entityType: 'Product', entityId: 'prod-1' },
      ];

      const execFn = jest.fn().mockResolvedValue(mockLogs);
      const limitFn = jest.fn().mockReturnValue({ exec: execFn });
      const skipFn = jest.fn().mockReturnValue({ limit: limitFn });
      const sortFn = jest.fn().mockReturnValue({ skip: skipFn });
      auditLogModel.find.mockReturnValue({ sort: sortFn });

      const countExecFn = jest.fn().mockResolvedValue(2);
      auditLogModel.countDocuments.mockReturnValue({ exec: countExecFn });

      const result = await service.findAll({
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual(mockLogs);
      expect(result.totalItems).toBe(2);
      expect(auditLogModel.find).toHaveBeenCalledWith({});
      expect(sortFn).toHaveBeenCalledWith({ createdAt: -1 });
      expect(skipFn).toHaveBeenCalledWith(0);
      expect(limitFn).toHaveBeenCalledWith(20);
    });

    it('should apply filters when provided', async () => {
      const execFn = jest.fn().mockResolvedValue([]);
      const limitFn = jest.fn().mockReturnValue({ exec: execFn });
      const skipFn = jest.fn().mockReturnValue({ limit: limitFn });
      const sortFn = jest.fn().mockReturnValue({ skip: skipFn });
      auditLogModel.find.mockReturnValue({ sort: sortFn });

      const countExecFn = jest.fn().mockResolvedValue(0);
      auditLogModel.countDocuments.mockReturnValue({ exec: countExecFn });

      await service.findAll({
        entityType: 'Vendor',
        action: 'vendor.approved',
        userId: 'admin-1',
        page: 1,
        limit: 20,
      });

      expect(auditLogModel.find).toHaveBeenCalledWith({
        entityType: 'Vendor',
        action: 'vendor.approved',
        userId: 'admin-1',
      });
      expect(auditLogModel.countDocuments).toHaveBeenCalledWith({
        entityType: 'Vendor',
        action: 'vendor.approved',
        userId: 'admin-1',
      });
    });
  });

  describe('findById', () => {
    it('should return audit log by id', async () => {
      const mockLog = {
        id: 'audit-1',
        action: 'vendor.approved',
        entityType: 'Vendor',
        entityId: 'vendor-1',
      };

      auditLogModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockLog),
      });

      const result = await service.findById('audit-1');

      expect(result).toEqual(mockLog);
      expect(auditLogModel.findOne).toHaveBeenCalledWith({ id: 'audit-1' });
    });

    it('should throw NotFoundException if audit log not found', async () => {
      auditLogModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById('audit-1')).rejects.toThrow(
        "Audit log 'audit-1' not found",
      );
    });
  });
});
