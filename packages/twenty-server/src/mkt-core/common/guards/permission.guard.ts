// import {
//     CanActivate,
//     ExecutionContext,
//     ForbiddenException,
//     Injectable,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { Request } from 'express';
// import { AccessTokenService } from 'src/engine/core-modules/auth/token/services/access-token.service';
// import { AppPermission } from 'src/mkt-core/common/constants/app-permission.enum';

// @Injectable()
// export class PermissionGuard implements CanActivate {
//   constructor(
//     private readonly reflector: Reflector,
//     private readonly accessTokenService: AccessTokenService,
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const requiredPermissions =
//       this.reflector.get<AppPermission[]>(
//         'permissions',
//         context.getHandler(),
//       ) || [];

//     const request: Request = context.switchToHttp().getRequest();

//     const data = await this.accessTokenService.validateTokenByRequest(request);

//     if (!data?.user) {
//       throw new ForbiddenException('Missing user data.');
//     }

//     let rawPerms = data.user?.permissions;

//     if (typeof rawPerms === 'string') {
//       try {
//         rawPerms = JSON.parse(rawPerms);
//       } catch {
//         rawPerms = [];
//       }
//     }

//     const userPermissions: string[] = Array.isArray(rawPerms)
//       ? rawPerms
//       : [];

//     const hasPermission = requiredPermissions.some((requiredPerm) =>
//       userPermissions.some((userPerm) =>
//         this.matchPermission(userPerm, requiredPerm),
//       ),
//     );

//     if (!hasPermission) {
//       throw new ForbiddenException(
//         'You do not have permission to access this resource.',
//       );
//     }

//     return true;
//   }

//   private matchPermission(userPerm: string, requiredPerm: string): boolean {
//     if (userPerm === 'admin') return true;
//     if (userPerm === requiredPerm) return true;

//     if (userPerm.endsWith(':*')) {
//       const prefix = userPerm.slice(0, -2);
//       return requiredPerm.startsWith(prefix + ':');
//     }

//     return false;
//   }
// }
