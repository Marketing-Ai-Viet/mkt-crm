import { Injectable } from '@nestjs/common';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class OtpNewService {
  constructor(private readonly redisClientService: RedisClientService) {}

  async generateOtpSecret(email: string) {
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

    // ⏱ Lưu vào Redis trong 5 phút
    const redis = this.redisClientService.getClient();
    await redis.set(`otp-secret:${email}`, secret.base32, 'EX', 300);

    return {
      secret: secret.base32,
      qr,
    };
  }

  async verify(email: string, token: string): Promise<boolean> {
    const redis = this.redisClientService.getClient();
    const base32Secret = await redis.get(`otp-secret:${email}`);
    if (!base32Secret) return false;

    const totp = new OTPAuth.TOTP({
      issuer: 'MyApp',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(base32Secret),
    });

    const delta = totp.validate({ token });
    return delta !== null;
  }

  async getOtpSecret(email: string): Promise<string | null> {
    const redis = this.redisClientService.getClient();
    return redis.get(`otp-secret:${email}`);
  }

  async clearOtpSecret(email: string) {
    const redis = this.redisClientService.getClient();
    await redis.del(`otp-secret:${email}`);
  }

  async setupGoogleAuthOtp(email: string) {
    const secret = new OTPAuth.Secret(); // 160-bit
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

    // Lưu secret cho 2FA vào Redis, không TTL (hoặc TTL dài)
    const redis = this.redisClientService.getClient();
    await redis.set(`2fa-secret:${email}`, secret.base32);

    return { secret: secret.base32, qr };
  }

  async verifyGoogleAuthOtp(email: string, otp: string): Promise<boolean> {
    const redis = this.redisClientService.getClient();
    const secret = await redis.get(`2fa-secret:${email}`);
    if (!secret) return false;

    const totp = new OTPAuth.TOTP({
      issuer: 'MyApp',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: otp });
    return delta !== null;
  }

}
