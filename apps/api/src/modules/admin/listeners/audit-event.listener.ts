import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '@common/events/domain-event.base';
import { AuditService } from '../services/audit.service';

@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  constructor(private readonly auditService: AuditService) {}

  @OnEvent('identity.vendor.approved')
  async onVendorApproved(event: DomainEvent): Promise<void> {
    try {
      const { approvedBy } = event.payload as { approvedBy: string; userId: string };
      await this.auditService.log({
        action: 'vendor.approved',
        entityType: 'Vendor',
        entityId: event.aggregateId,
        userId: approvedBy,
        changes: {
          status: { old: 'pending', new: 'approved' },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log vendor approval: ${error}`);
    }
  }

  @OnEvent('identity.vendor.rejected')
  async onVendorRejected(event: DomainEvent): Promise<void> {
    try {
      const { rejectedBy, reason } = event.payload as { rejectedBy: string; userId: string; reason?: string };
      await this.auditService.log({
        action: 'vendor.rejected',
        entityType: 'Vendor',
        entityId: event.aggregateId,
        userId: rejectedBy,
        changes: {
          status: { old: 'pending', new: 'rejected' },
          ...(reason ? { rejectionReason: { old: null, new: reason } } : {}),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log vendor rejection: ${error}`);
    }
  }

  @OnEvent('identity.vendor.suspended')
  async onVendorSuspended(event: DomainEvent): Promise<void> {
    try {
      const { suspendedBy, reason } = event.payload as { suspendedBy: string; userId: string; reason?: string };
      await this.auditService.log({
        action: 'vendor.suspended',
        entityType: 'Vendor',
        entityId: event.aggregateId,
        userId: suspendedBy,
        changes: {
          status: { old: 'approved', new: 'suspended' },
          ...(reason ? { rejectionReason: { old: null, new: reason } } : {}),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log vendor suspension: ${error}`);
    }
  }

  @OnEvent('catalog.product.approved')
  async onProductApproved(event: DomainEvent): Promise<void> {
    try {
      const { approvedBy } = event.payload as { approvedBy: string };
      await this.auditService.log({
        action: 'product.approved',
        entityType: 'Product',
        entityId: event.aggregateId,
        userId: approvedBy,
        changes: {
          status: { old: 'pending_review', new: 'approved' },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log product approval: ${error}`);
    }
  }

  @OnEvent('catalog.product.rejected')
  async onProductRejected(event: DomainEvent): Promise<void> {
    try {
      const { rejectedBy, reason } = event.payload as { rejectedBy: string; reason?: string };
      await this.auditService.log({
        action: 'product.rejected',
        entityType: 'Product',
        entityId: event.aggregateId,
        userId: rejectedBy,
        changes: {
          status: { old: 'pending_review', new: 'rejected' },
          ...(reason ? { rejectionReason: { old: null, new: reason } } : {}),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log product rejection: ${error}`);
    }
  }

  @OnEvent('catalog.product.submitted_for_review')
  async onProductSubmittedForReview(event: DomainEvent): Promise<void> {
    try {
      const { vendorId } = event.payload as { vendorId: string };
      await this.auditService.log({
        action: 'product.submitted_for_review',
        entityType: 'Product',
        entityId: event.aggregateId,
        userId: vendorId,
        changes: {
          status: { old: 'draft', new: 'pending_review' },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log product submission: ${error}`);
    }
  }

  @OnEvent('offers.offer.approved')
  async onOfferApproved(event: DomainEvent): Promise<void> {
    try {
      const { adminUserId } = event.payload as { adminUserId: string; vendorId: string };
      await this.auditService.log({
        action: 'offer.approved',
        entityType: 'Offer',
        entityId: event.aggregateId,
        userId: adminUserId,
        changes: {
          status: { old: 'pending_review', new: 'active' },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log offer approval: ${error}`);
    }
  }

  @OnEvent('offers.offer.rejected')
  async onOfferRejected(event: DomainEvent): Promise<void> {
    try {
      const { adminUserId, reason } = event.payload as { adminUserId: string; vendorId: string; reason?: string };
      await this.auditService.log({
        action: 'offer.rejected',
        entityType: 'Offer',
        entityId: event.aggregateId,
        userId: adminUserId,
        changes: {
          status: { old: 'pending_review', new: 'rejected' },
          ...(reason ? { rejectionReason: { old: null, new: reason } } : {}),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log offer rejection: ${error}`);
    }
  }

  @OnEvent('offers.offer.submitted_for_review')
  async onOfferSubmittedForReview(event: DomainEvent): Promise<void> {
    try {
      const { vendorId } = event.payload as { vendorId: string };
      await this.auditService.log({
        action: 'offer.submitted_for_review',
        entityType: 'Offer',
        entityId: event.aggregateId,
        userId: vendorId,
        changes: {
          status: { old: 'draft', new: 'pending_review' },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log offer submission: ${error}`);
    }
  }

  @OnEvent('reviews.review.approved')
  async onReviewApproved(event: DomainEvent): Promise<void> {
    try {
      const { moderatedBy } = event.payload as { moderatedBy: string; productId: string };
      await this.auditService.log({
        action: 'review.approved',
        entityType: 'Review',
        entityId: event.aggregateId,
        userId: moderatedBy,
        changes: {
          status: { old: 'pending_moderation', new: 'approved' },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log review approval: ${error}`);
    }
  }

  @OnEvent('reviews.review.rejected')
  async onReviewRejected(event: DomainEvent): Promise<void> {
    try {
      const { moderatedBy, rejectionReason } = event.payload as {
        moderatedBy: string;
        productId: string;
        rejectionReason?: string;
      };
      await this.auditService.log({
        action: 'review.rejected',
        entityType: 'Review',
        entityId: event.aggregateId,
        userId: moderatedBy,
        changes: {
          status: { old: 'pending_moderation', new: 'rejected' },
          ...(rejectionReason ? { rejectionReason: { old: null, new: rejectionReason } } : {}),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log review rejection: ${error}`);
    }
  }

  @OnEvent('identity.user.role_changed')
  async onUserRoleChanged(event: DomainEvent): Promise<void> {
    try {
      const { changedBy, oldRole, newRole } = event.payload as {
        changedBy: string;
        oldRole: string;
        newRole: string;
      };
      await this.auditService.log({
        action: 'user.role_changed',
        entityType: 'User',
        entityId: event.aggregateId,
        userId: changedBy,
        changes: {
          role: { old: oldRole, new: newRole },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log user role change: ${error}`);
    }
  }

  @OnEvent('identity.user.status_changed')
  async onUserStatusChanged(event: DomainEvent): Promise<void> {
    try {
      const { changedBy, isActive } = event.payload as {
        changedBy: string;
        isActive: boolean;
      };
      await this.auditService.log({
        action: 'user.status_changed',
        entityType: 'User',
        entityId: event.aggregateId,
        userId: changedBy,
        changes: {
          isActive: { old: !isActive, new: isActive },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log user status change: ${error}`);
    }
  }
}

