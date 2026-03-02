import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController, MeController } from './auth.controller';
import { UsersController } from './users.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-change-in-production-min-32-chars'),
      signOptions: { expiresIn: process.env.JWT_EXPIRY || '15m' },
    }),
  ],
  controllers: [AuthController, MeController, UsersController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
