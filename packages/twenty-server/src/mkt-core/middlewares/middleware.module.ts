import { Module } from '@nestjs/common';
import { GraphQLRequestCustomMiddleware } from 'src/mkt-core/middlewares/graphql-request-custom.middleware';
import { GraphQLRequestCustomService } from 'src/mkt-core/middlewares/graphql-request-custom.service';

@Module({
  providers: [
    GraphQLRequestCustomMiddleware,
    GraphQLRequestCustomService,
  ],
})
export class MktMiddlewareModule {}
