import { Injectable } from '@nestjs/common';

import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { OAUTH2_LOCK_OPTIONS } from 'src/mkt-core/oauth2-client/constants';

@Injectable()
export class OAuth2LockService {
  constructor(private readonly cacheLockService: CacheLockService) {}

  async executeWithLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
    return this.cacheLockService.withLock(fn, lockKey, {
      ms: OAUTH2_LOCK_OPTIONS.MS,
      maxRetries: OAUTH2_LOCK_OPTIONS.MAX_RETRIES,
      ttl: OAUTH2_LOCK_OPTIONS.TTL,
    });
  }
}
