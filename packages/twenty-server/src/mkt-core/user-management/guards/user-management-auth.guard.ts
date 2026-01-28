import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { AuthenticationError } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';

/**
 * Auth guard for user management that throws proper UNAUTHENTICATED error
 * instead of generic ForbiddenException
 */
@Injectable()
export class UserManagementAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    if (request.user === undefined) {
      throw new AuthenticationError('Unauthorized');
    }

    return true;
  }
}
