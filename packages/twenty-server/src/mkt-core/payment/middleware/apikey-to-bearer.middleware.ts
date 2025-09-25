import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

import { NextFunction, Request, Response } from 'express';

@Injectable()
export class ApikeyToBearerMiddleware implements NestMiddleware {
  private readonly logger: Logger = new Logger(ApikeyToBearerMiddleware.name);
  use(req: Request, res: Response, next: NextFunction) {
    // Read the Apikey header (case-insensitive)
    const apiKey = req.headers['authorization'] as string | undefined;

    if (apiKey) {
      req.headers['authorization'] = apiKey
        .replace(/^\s*Apikey\s+/i, 'Bearer ')
        .trim();
    }
    this.logger.warn('Transformed Apikey to Bearer token');
    next();
  }
}
