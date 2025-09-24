import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/auth-context.type';
import { JwtWrapperService } from 'src/engine/core-modules/jwt/services/jwt-wrapper.service';

@Injectable()
export class SepayAuthGuard implements CanActivate {
  private readonly logger = new Logger(SepayAuthGuard.name);

  constructor(private readonly jwtWrapperService: JwtWrapperService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (process.env.SEPAY_AUTH_ENABLED !== 'true') {
      this.logger.log('SEPAY_AUTH_ENABLED=false, skipping authentication');
      return true;
    }
    const apiKeyToken = req.header('Apikey');
    if (!apiKeyToken) {
      this.logger.error('Missing Apikey header');
      throw new UnauthorizedException('Missing Apikey header');
    }
    try {
      this.jwtWrapperService.verifyJwtToken(
        apiKeyToken,
        JwtTokenTypeEnum.API_KEY,
      );
      return true;
    } catch (err) {
      this.logger.error('Invalid Apikey');
      throw new UnauthorizedException('Invalid Apikey');
    }
  }
}
