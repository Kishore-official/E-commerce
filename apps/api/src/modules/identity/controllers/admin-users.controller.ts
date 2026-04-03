import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole, PaginatedResult } from '@ecommerce/shared-types';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@common/decorators/current-user.decorator';
import { UsersService } from '../services/users.service';
import { User } from '../schemas/user.schema';
import { IsEnum, IsBoolean, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminUserQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;
}

@ApiTags('Admin - Users')
@ApiBearerAuth()
@Controller('admin/users')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (admin)' })
  @ApiResponse({ status: 200 })
  async listUsers(
    @Query() query: AdminUserQueryDto,
  ): Promise<PaginatedResult<User>> {
    return this.usersService.findAll({
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      search: query.search,
      role: query.role,
    });
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Only super_admin can assign super_admin role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRole(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<User> {
    if (dto.role === UserRole.SUPER_ADMIN && admin.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can assign super_admin role');
    }
    return this.usersService.adminUpdateRole(id, dto.role, admin.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateStatus(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<User> {
    return this.usersService.adminUpdateStatus(id, dto.isActive, admin.sub);
  }
}

