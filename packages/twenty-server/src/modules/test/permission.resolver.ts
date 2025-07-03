import { Context, Query, Resolver } from '@nestjs/graphql';
import { Request } from 'express';
import { AppPermission } from 'src/constants/app-permission.enum';
import { MiddlewareService } from 'src/engine/middlewares/middleware.service';

@Resolver()
export class PermissionResolver {
  constructor(private readonly middlewareService: MiddlewareService) {}

  @Query(() => String)
  async testPermission(@Context('req') req: Request): Promise<string> {
    // Gọi hàm kiểm tra permission
    await this.middlewareService.checkPermission(
      req,
      AppPermission.VIEW_REPORT_ALL,
    );

    return '✅ You have permission to view reports.';
  }
}
