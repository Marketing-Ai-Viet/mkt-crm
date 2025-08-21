import { Injectable,NestMiddleware } from '@nestjs/common';
import { NextFunction,Request,Response } from 'express';

import { MktLicenseService } from 'src/mkt-core/license/mkt-license.service';

@Injectable()
export class MktLicenseMiddleware implements NestMiddleware {
  constructor(private readonly mktLicenseService: MktLicenseService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.path === '/graphql' && req.method === 'POST') {
        await this.customizeGraphQLRequest(req);
      }
    } catch (error) {
      console.error('Error in GraphQL request customization middleware:', error);
    }
    next();
  }

  private async customizeGraphQLRequest(req: Request): Promise<void> {
    const body = req.body;

    if (!body || !body.variables) {
      return;
    }

    const operationName = body.operationName;

    let detectedOperationName = operationName;

    if (!operationName && body.query) {
      const queryMatch = body.query.match(/mutation\s+(\w+)/);

      if (queryMatch) {
        detectedOperationName = queryMatch[1];
      }
    }

    await this.mktLicenseService.customizeGraphQLRequest(
      detectedOperationName,
      body.variables,
    );
  }
}