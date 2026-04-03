import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UserRole } from '@ecommerce/shared-types';
import { User, UserDocument } from '../schemas/user.schema';
import { Vendor, VendorDocument } from '../schemas/vendor.schema';
import { VendorStaff, VendorStaffDocument } from '../schemas/vendor-staff.schema';
import { RefreshToken, RefreshTokenDocument } from '../schemas/refresh-token.schema';
import { JwtPayload } from '@common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { RegisterDto } from '../dto/register.dto';
import { AuthResponseDto, UserProfileDto } from '../dto/auth-response.dto';

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<VendorDocument>,
    @InjectModel(VendorStaff.name)
    private readonly vendorStaffModel: Model<VendorStaffDocument>,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email.toLowerCase().trim());
    if (!user || !user.isActive) {
      return null;
    }

    if (!user.passwordHash) {
      console.warn(`[AuthService] passwordHash missing for user ${user.id} — select override may have failed`);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    return isPasswordValid ? user : null;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.usersService.create({
      id: uuidv4(),
      email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone || null,
      role: UserRole.CUSTOMER,
    });

    return this.generateAuthResponse(user);
  }

  async login(user: User): Promise<AuthResponseDto> {
    await this.usersService.updateLastLogin(user.id);
    return this.generateAuthResponse(user);
  }

  async refresh(refreshTokenRaw: string): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(refreshTokenRaw);

    const token = await this.refreshTokenModel.findOne({
      tokenHash,
      revoked: false,
    }).exec();

    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > token.expiresAt) {
      await this.refreshTokenModel.updateOne({ id: token.id }, { $set: { revoked: true } }).exec();
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old token (rotation)
    await this.refreshTokenModel.updateOne({ id: token.id }, { $set: { revoked: true } }).exec();

    const user = await this.usersService.findById(token.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    return this.generateAuthResponse(user);
  }

  async logout(refreshTokenRaw: string): Promise<void> {
    const tokenHash = this.hashToken(refreshTokenRaw);

    const token = await this.refreshTokenModel.findOne({
      tokenHash,
      revoked: false,
    }).exec();

    if (token) {
      await this.refreshTokenModel.updateOne({ id: token.id }, { $set: { revoked: true } }).exec();
    }
    // Silently succeed if token not found (idempotent)
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const vendorId = await this.resolveVendorId(user);
    return this.toUserProfile(user, vendorId);
  }

  // ── Private helpers ──

  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const vendorId = await this.resolveVendorId(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      vendorId: vendorId || undefined,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshTokenRaw = uuidv4();
    const tokenHash = this.hashToken(refreshTokenRaw);

    const refreshExpiresIn = this.configService.get<string>('auth.refreshTokenExpiresIn', '7d');
    const expiresAt = this.calculateExpiry(refreshExpiresIn);

    await this.refreshTokenModel.create({
      id: uuidv4(),
      userId: user.id,
      tokenHash,
      expiresAt,
      revoked: false,
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      user: this.toUserProfile(user, vendorId),
    };
  }

  private async resolveVendorId(user: User): Promise<string | null> {
    if (user.role === UserRole.VENDOR) {
      const vendor = await this.vendorModel.findOne({ userId: user.id }).exec();
      return vendor?.id || null;
    }

    if (user.role === UserRole.VENDOR_STAFF) {
      const vendorStaff = await this.vendorStaffModel.findOne({ userId: user.id }).exec();
      return vendorStaff?.vendorId || null;
    }

    return null;
  }

  private toUserProfile(user: User, vendorId?: string | null): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      emailVerified: user.emailVerified,
      vendorId: vendorId ?? null,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return new Date(Date.now() + value * multipliers[unit]);
  }
}
