import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { Request } from 'express';

import { securityConfig } from 'src/mkt-core/payment/config/security.config';

// ============================================
// TYPES
// ============================================

type IpValidationResult = {
  isValid: boolean;
  clientIp: string;
  matchedRule?: string;
};

// ============================================
// GUARD
// ============================================

/**
 * IP Whitelist Guard
 *
 * Validates that incoming requests originate from whitelisted IP addresses.
 * Supports both individual IPs and CIDR notation.
 *
 * Features:
 * - IP extraction from X-Forwarded-For, X-Real-IP, and socket address
 * - CIDR range validation
 * - IPv4 and IPv6 support
 * - Configurable via environment variables
 * - Comprehensive logging
 *
 * Environment variables:
 * - SEPAY_IP_WHITELIST_ENABLED: Enable/disable the guard (default: false)
 * - SEPAY_IP_WHITELIST: Comma-separated list of IPs/CIDRs
 *
 * @example
 * ```typescript
 * @UseGuards(IpWhitelistGuard)
 * @Post('hooks/webhook')
 * async handleWebhook() { ... }
 * ```
 */
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);

  constructor(
    @Inject(securityConfig.KEY)
    private readonly config: ConfigType<typeof securityConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip if IP whitelist is disabled
    if (!this.config.ipWhitelist.enabled) {
      this.logger.debug('IP whitelist disabled, skipping validation');

      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const result = this.validateIp(request);

    if (!result.isValid) {
      this.logger.warn({
        message: 'Request blocked by IP whitelist',
        clientIp: result.clientIp,
        endpoint: request.path,
        method: request.method,
      });

      throw new UnauthorizedException(
        `IP address ${result.clientIp} is not whitelisted`,
      );
    }

    this.logger.debug({
      message: 'IP whitelist validation passed',
      clientIp: result.clientIp,
      matchedRule: result.matchedRule,
    });

    return true;
  }

  // ============================================
  // VALIDATION METHODS
  // ============================================

  /**
   * Validate client IP against whitelist
   */
  private validateIp(request: Request): IpValidationResult {
    const clientIp = this.extractClientIp(request);
    const whitelist = this.config.ipWhitelist.addresses;

    // Check exact match
    if (whitelist.includes(clientIp)) {
      return {
        isValid: true,
        clientIp,
        matchedRule: clientIp,
      };
    }

    // Check CIDR ranges
    for (const entry of whitelist) {
      if (entry.includes('/') && this.isIpInCidr(clientIp, entry)) {
        return {
          isValid: true,
          clientIp,
          matchedRule: entry,
        };
      }
    }

    return {
      isValid: false,
      clientIp,
    };
  }

  /**
   * Extract client IP from request
   *
   * Priority:
   * 1. X-Forwarded-For header (first IP in chain)
   * 2. X-Real-IP header
   * 3. Socket remote address
   */
  private extractClientIp(request: Request): string {
    // Check X-Forwarded-For header (for proxied requests)
    const forwardedFor = request.headers['x-forwarded-for'];

    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];

      const ip = ips.trim();

      this.logger.debug(`Extracted IP from X-Forwarded-For: ${ip}`);

      return this.normalizeIp(ip);
    }

    // Check X-Real-IP header
    const realIp = request.headers['x-real-ip'];

    if (realIp) {
      const ip = Array.isArray(realIp) ? realIp[0] : realIp;

      this.logger.debug(`Extracted IP from X-Real-IP: ${ip}`);

      return this.normalizeIp(ip);
    }

    // Fallback to socket remote address
    const socketIp = request.socket.remoteAddress || 'unknown';

    this.logger.debug(`Extracted IP from socket: ${socketIp}`);

    return this.normalizeIp(socketIp);
  }

  /**
   * Normalize IP address (handle IPv4-mapped IPv6)
   */
  private normalizeIp(ip: string): string {
    // Remove IPv6 prefix for IPv4-mapped addresses (::ffff:192.168.1.1)
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }

    return ip;
  }

  // ============================================
  // CIDR METHODS
  // ============================================

  /**
   * Check if IP is within a CIDR range
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    try {
      // Check if it's an IPv6 address
      if (ip.includes(':') || cidr.includes(':')) {
        return this.isIpv6InCidr(ip, cidr);
      }

      return this.isIpv4InCidr(ip, cidr);
    } catch (error) {
      this.logger.warn(`Error checking CIDR ${cidr} for IP ${ip}:`, error);

      return false;
    }
  }

  /**
   * Check if IPv4 address is within a CIDR range
   */
  private isIpv4InCidr(ip: string, cidr: string): boolean {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);

    if (isNaN(bits) || bits < 0 || bits > 32) {
      return false;
    }

    const mask = bits === 0 ? 0 : ~(2 ** (32 - bits) - 1);
    const ipNum = this.ipv4ToNumber(ip);
    const rangeNum = this.ipv4ToNumber(range);

    if (ipNum === null || rangeNum === null) {
      return false;
    }

    return (ipNum & mask) === (rangeNum & mask);
  }

  /**
   * Check if IPv6 address is within a CIDR range
   * Simplified implementation - expand for full IPv6 support
   */
  private isIpv6InCidr(ip: string, cidr: string): boolean {
    // For now, only exact match for IPv6
    // TODO: Implement full IPv6 CIDR support if needed
    const [range] = cidr.split('/');

    return ip === range;
  }

  /**
   * Convert IPv4 address to number
   */
  private ipv4ToNumber(ip: string): number | null {
    const parts = ip.split('.');

    if (parts.length !== 4) {
      return null;
    }

    let result = 0;

    for (const part of parts) {
      const num = parseInt(part, 10);

      if (isNaN(num) || num < 0 || num > 255) {
        return null;
      }

      result = (result << 8) + num;
    }

    return result >>> 0; // Convert to unsigned 32-bit
  }
}
