import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergeCartDto {
  @ApiProperty({ description: 'Session ID from guest cart' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
