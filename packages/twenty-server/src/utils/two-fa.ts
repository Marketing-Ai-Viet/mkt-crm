// src/utils/otp.service.ts

import { Injectable } from '@nestjs/common';
import { RedisClientService } from 'src/engine/core-modules/redis-client/redis-client.service';

@Injectable()
export class OtpConfig {
  constructor(private readonly redisClientService: RedisClientService) {}

  /**
   * Sinh mã OTP 6 chữ số dạng string
   * @returns mã OTP, ví dụ: '482193'
   */
  generate6DigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Kiểm tra mã OTP người dùng nhập có khớp và còn hiệu lực không
   * @param userId - ID của người dùng
   * @param otpInput - Mã OTP do người dùng nhập
   * @returns true nếu hợp lệ, false nếu sai hoặc hết hạn
   */
  async verifyOtpForUser(userId: string, otpInput: string): Promise<boolean> {
    const redis = this.redisClientService.getClient();
    const cachedOtp = await redis.get(`otp:${userId}`);

    if (!cachedOtp) {
      // Không tồn tại => hết hạn hoặc chưa tạo
      return false;
    }

    const isMatch = cachedOtp === otpInput;

    if (isMatch) {
      // Nếu đúng, xóa luôn để không dùng lại
      await redis.del(`otp:${userId}`);
    }

    return isMatch;
  }


  /**
   * Lưu mã OTP cho user vào Redis với TTL
   * @param userId - ID của user
   * @param otpCode - Mã OTP đã sinh
   * @param ttlSeconds - Thời gian hết hạn (giây), mặc định 300s (5 phút)
   */
  async saveOtpForUser(
    userId: string,
    otpCode: string,
    ttlSeconds = 300,
  ): Promise<void> {
    const redis = this.redisClientService.getClient();
    await redis.set(`otp:${userId}`, otpCode, 'EX', ttlSeconds);
  }

  /**
   * Lấy mã OTP từ Redis theo userId
   */
  async getOtpForUser(userId: string): Promise<string | null> {
    const redis = this.redisClientService.getClient();
    return await redis.get(`otp:${userId}`);
  }

  /**
   * Xóa mã OTP khi đã xác thực xong
   */
  async deleteOtpForUser(userId: string): Promise<void> {
    const redis = this.redisClientService.getClient();
    await redis.del(`otp:${userId}`);
  }
}
