// src/modules/otp/otp-auth-app.service.ts

import { Injectable } from '@nestjs/common';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class OtpAuthAppService {
  constructor(private readonly redisClientService: RedisClientService) {}

  async generateTempOtpSecret(email: string) {
    const secret = new OTPAuth.Secret();
    const totp = new OTPAuth.TOTP({
      issuer: 'MyApp',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUrl = totp.toString();
    const qr = await QRCode.toDataURL(otpauthUrl);

    await this.redisClientService.getClient().set(`otp-secret:${email}`, secret.base32, 'EX', 300);

    return { secret: secret.base32, qr };
  }

  async verifyTempOtp(email: string, token: string): Promise<boolean> {
    const base32Secret = await this.redisClientService.getClient().get(`otp-secret:${email}`);
    if (!base32Secret) return false;

    const totp = new OTPAuth.TOTP({
      issuer: 'MyApp',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32Secret),
    });

    return totp.validate({ token }) !== null;
  }

  async setupGoogleAuthOtp(email: string) {
    const secret = new OTPAuth.Secret();
    const totp = new OTPAuth.TOTP({
      issuer: 'MyApp',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const otpauthUrl = totp.toString();
    const qr = await QRCode.toDataURL(otpauthUrl);

    await this.redisClientService.getClient().set(`2fa-secret:${email}`, secret.base32);
    return { secret: secret.base32, qr };
  }

  async verifyGoogleAuthOtp(email: string, otp: string): Promise<boolean> {
    const secret = await this.redisClientService.getClient().get(`2fa-secret:${email}`);
    if (!secret) return false;

    const totp = new OTPAuth.TOTP({
      issuer: 'MyApp',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    return totp.validate({ token: otp }) !== null;
  }
}
