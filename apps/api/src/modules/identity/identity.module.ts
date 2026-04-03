import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from './schemas/user.schema';
import { Vendor, VendorSchema } from './schemas/vendor.schema';
import { VendorStaff, VendorStaffSchema } from './schemas/vendor-staff.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { AuthService } from './services/auth.service';
import { UsersService } from './services/users.service';
import { VendorService } from './services/vendor.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './controllers/auth.controller';
import { VendorController } from './controllers/vendor.controller';
import { AdminIdentityController } from './controllers/admin-identity.controller';
import { AdminUsersController } from './controllers/admin-users.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: VendorStaff.name, schema: VendorStaffSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: config.get<string>('auth.jwtExpiresIn', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController, VendorController, AdminIdentityController, AdminUsersController],
  providers: [AuthService, UsersService, VendorService, LocalStrategy, JwtStrategy],
  exports: [AuthService, UsersService, VendorService],
})
export class IdentityModule {}
