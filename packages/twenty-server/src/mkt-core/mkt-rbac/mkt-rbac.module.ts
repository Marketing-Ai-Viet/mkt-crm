import { Module, DynamicModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';

import { TwentyORMModule } from 'src/engine/twenty-orm/twenty-orm.module';

import { MktRbacService } from './services/mkt-rbac.service';
import { PermissionContextService } from './services/permission-context.service';
import { GraphQLPermissionGuard } from './guards/graphql-permission.guard';
import { ModuleAccessGuard } from './guards/module-access.guard';
import { GraphQLLoggingMiddleware } from './middleware/graphql-logging.middleware';
import { GraphQLFieldPermissionInterceptor } from './interceptors/graphql-field-permission.interceptor';
import { GraphQLPermissionPlugin } from './plugins/graphql-permission.plugin';

@Module({})
export class MktRbacModule {
  /**
   * Main registration method - uses proper DI patterns for NestJS 9+
   */
  static forRoot(): DynamicModule {
    return {
      module: MktRbacModule,
      imports: [TwentyORMModule],
      providers: [
        // Core services - these will be available globally
        MktRbacService,
        PermissionContextService,
        Reflector,

        // Guards with proper DI
        GraphQLPermissionGuard,
        ModuleAccessGuard,

        // Auto-applied guards
        {
          provide: APP_GUARD,
          useFactory: (reflector: Reflector, rbacService: MktRbacService) => {
            return new ModuleAccessGuard(reflector, rbacService);
          },
          inject: [Reflector, MktRbacService],
        },

        // Interceptors
        {
          provide: APP_INTERCEPTOR,
          useClass: GraphQLFieldPermissionInterceptor,
        },

        // Middleware components
        GraphQLLoggingMiddleware,

        // Plugins
        GraphQLPermissionPlugin,
      ],
      exports: [
        MktRbacService,
        PermissionContextService,
        GraphQLPermissionGuard,
        ModuleAccessGuard,
        GraphQLLoggingMiddleware,
        GraphQLPermissionPlugin,
      ],
      global: true,
    };
  }
}
