/**
 * Minimal Enterprise RBAC Guard
 * Lightweight guard without complex dependencies for development/seeding
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class MinimalEnterpriseRbacGuard implements CanActivate {
  private readonly logger = new Logger(MinimalEnterpriseRbacGuard.name);

  constructor(private _reflector: Reflector) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    // For development/seeding mode, always allow access
    // This guard is intentionally permissive for minimal setup

    this.logger.debug(
      'MinimalEnterpriseRbacGuard: Allowing access (development mode)',
    );

    return true;
  }
}
