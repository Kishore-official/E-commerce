import { IsIn, IsOptional, IsString, ValidateIf, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStatus } from '@ecommerce/shared-types';

export class ModerateReviewDto {
  @ApiProperty({
    enum: [ReviewStatus.APPROVED, ReviewStatus.REJECTED],
    description: 'Target moderation status',
  })
  @IsIn([ReviewStatus.APPROVED, ReviewStatus.REJECTED], {
    message: 'status must be either approved or rejected',
  })
  status: ReviewStatus.APPROVED | ReviewStatus.REJECTED;

  @ApiPropertyOptional({ description: 'Reason for rejection (required when rejecting)' })
  @ValidateIf((o) => o.status === ReviewStatus.REJECTED)
  @IsString()
  @IsNotEmpty({ message: 'rejectionReason is required when rejecting a review' })
  rejectionReason?: string;
}
