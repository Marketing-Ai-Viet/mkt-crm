// src/modules/otp/otp.service.ts

import { Injectable } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class OtpService {
  constructor(private readonly redisClientService: RedisClientService) {}

  generate6DigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async saveOtpForUser(userId: string, otpCode: string, ttlSeconds = 300): Promise<void> {
    const redis = this.redisClientService.getClient();
    await redis.set(`otp:${userId}`, otpCode, 'EX', ttlSeconds);
  }

  async verifyOtpForUser(userId: string, otpInput: string): Promise<boolean> {
    const redis = this.redisClientService.getClient();
    const cachedOtp = await redis.get(`otp:${userId}`);
    if (!cachedOtp) return false;

    const isMatch = cachedOtp === otpInput;
    if (isMatch) await redis.del(`otp:${userId}`);
    return isMatch;
  }

  async getOtpForUser(userId: string): Promise<string | null> {
    return this.redisClientService.getClient().get(`otp:${userId}`);
  }

  async deleteOtpForUser(userId: string): Promise<void> {
    await this.redisClientService.getClient().del(`otp:${userId}`);
  }
}
