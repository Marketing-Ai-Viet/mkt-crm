# HTTP Implementation

Tài liệu mô tả cách triển khai HTTP trong hệ thống Twenty CRM.

## Tổng quan

Hệ thống sử dụng NestJS với Express platform và hỗ trợ cả REST API và GraphQL.

| Component | Technology |
|-----------|------------|
| Framework | NestJS 9.0.0 + Express |
| HTTP Client | @nestjs/axios (axios v1.6.2) |
| GraphQL | GraphQL Yoga với NestJS driver |
| Authentication | JWT, API Key, OAuth 2.0, SAML 2.0 |

## Configuration

### Environment Variables

```bash
# Server
NODE_PORT=3000
NODE_ENV=development

# HTTPS
SSL_KEY_PATH=/path/to/key.pem
SSL_CERT_PATH=/path/to/cert.pem

# Rate Limiting
API_RATE_LIMITING_TTL=60000
API_RATE_LIMITING_LIMIT=100

# File Upload
# Max file size: 10MB (configurable)
```

### Bootstrap Configuration

**File**: `packages/twenty-server/src/main.ts`

```typescript
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  cors: true,
  bufferLogs: process.env.LOGGER_IS_BUFFER_ENABLED === 'true',
  rawBody: true,  // Required for webhooks
  snapshot: process.env.NODE_ENV === NodeEnvironment.DEVELOPMENT,
  httpsOptions: {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  },
});

// Body parser limits
app.useBodyParser('json', { limit: '10MB' });
app.useBodyParser('urlencoded', { limit: '10MB', extended: true });
```

---

## 1. REST API

### Route Structure

| Route Pattern | Purpose |
|---------------|---------|
| `/rest/*` | Core API endpoints |
| `/rest/metadata/*` | Metadata operations |
| `/rest/batch/*` | Bulk operations |

### Core REST Controller

**File**: `packages/twenty-server/src/engine/api/rest/core/controllers/rest-api-core.controller.ts`

```typescript
@Controller('rest')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
@UseFilters(RestApiExceptionFilter)
export class RestApiCoreController {
  @Post('batch/*')     // Bulk create
  @Post('*/duplicates') // Find duplicates
  @Post('*')           // Create single
  @Get('*')            // Read
  @Delete('*')         // Delete
  @Patch('*')          // Update
  @Put('*')            // Update (legacy)
}
```

### REST API Service

**File**: `packages/twenty-server/src/engine/api/rest/rest-api.service.ts`

```typescript
@Injectable()
export class RestApiService {
  constructor(private readonly httpService: HttpService) {}

  async call(
    graphqlApiType: GraphqlApiType,
    requestContext: RequestContext,
    data: Query
  ) {
    const url = graphqlApiType === GraphqlApiType.CORE
      ? '/graphql'
      : '/metadata';

    const response = await this.httpService.axiosRef.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: requestContext.headers.authorization,
      },
    });

    if (response.data.errors?.length) {
      throw new RestApiException(response.data.errors);
    }

    return response;
  }
}
```

---

## 2. GraphQL API

### Configuration

**File**: `packages/twenty-server/src/engine/api/graphql/graphql-config/graphql-config.service.ts`

```typescript
createGqlOptions(): YogaDriverConfig {
  const plugins = [
    useThrottler({
      ttl: this.twentyConfigService.get('API_RATE_LIMITING_TTL'),
      limit: this.twentyConfigService.get('API_RATE_LIMITING_LIMIT'),
      identifyFn: (context) =>
        context.req.user?.id ?? context.req.ip ?? 'anonymous',
    }),
    useGraphQLErrorHandlerHook({...}),
    useSentryTracing(),
  ];

  return {
    autoSchemaFile: true,
    include: [CoreEngineModule, ModulesModule],
    conditionalSchema: async (context) => {
      return await this.createSchema(context, authData);
    },
    plugins,
  };
}
```

### File Upload

```typescript
// main.ts
app.use(
  '/graphql',
  graphqlUploadExpress({
    maxFieldSize: bytes('10MB'),
    maxFiles: 10,
  }),
);
```

---

## 3. Authentication

### JWT Authentication

**File**: `packages/twenty-server/src/engine/core-modules/auth/token/services/access-token.service.ts`

#### Token Payload Structure

```typescript
type AccessTokenJwtPayload = {
  type: JwtTokenTypeEnum;
  sub: string;           // userId
  userId: string;
  workspaceId: string;
  workspaceMemberId?: string;
  userWorkspaceId?: string;
  authProvider?: string;
};
```

#### Generate Token

```typescript
async generateAccessToken(
  userId: string,
  workspaceId: string,
  workspaceMemberId?: string,
): Promise<AuthToken> {
  const payload: AccessTokenJwtPayload = {
    type: JwtTokenTypeEnum.ACCESS_TOKEN,
    sub: userId,
    userId,
    workspaceId,
    workspaceMemberId,
  };

  const token = this.jwtService.sign(payload, {
    expiresIn: this.twentyConfigService.get('ACCESS_TOKEN_EXPIRES_IN'),
  });

  return { token, expiresAt };
}
```

### JWT Auth Guard

**File**: `packages/twenty-server/src/engine/guards/jwt-auth.guard.ts`

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      const data = await this.accessTokenService.validateTokenByRequest(request);

      // Attach to request
      request.user = data.user;
      request.apiKey = data.apiKey;
      request.workspace = data.workspace;
      request.workspaceMetadataVersion = metadataVersion;
      request.workspaceMemberId = data.workspaceMemberId;
      request.userWorkspaceId = data.userWorkspaceId;

      return true;
    } catch (error) {
      return false;
    }
  }
}
```

### Workspace Auth Guard

**File**: `packages/twenty-server/src/engine/guards/workspace-auth.guard.ts`

```typescript
@Injectable()
export class WorkspaceAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.workspace !== undefined;
  }
}
```

### API Key Authentication

API Keys được quản lý qua REST endpoint: `rest/metadata/apiKeys`

```typescript
// Headers
Authorization: Bearer <api-key>
```

### OAuth 2.0 Providers

| Provider | Controller | Strategy |
|----------|------------|----------|
| Google | `google-auth.controller.ts` | `google.auth.strategy.ts` |
| Microsoft | `microsoft-auth.controller.ts` | `microsoft.auth.strategy.ts` |
| SAML 2.0 | `sso-auth.controller.ts` | `saml.auth.strategy.ts` |

#### OAuth Flow Example

```typescript
// google-auth.controller.ts
@Controller('auth/google')
export class GoogleAuthController {
  @Get()
  @UseGuards(GoogleProviderEnabledGuard, GoogleOauthGuard, PublicEndpointGuard)
  async googleAuth() {
    // Triggers Google OAuth flow
  }

  @Get('redirect')
  @UseGuards(GoogleProviderEnabledGuard, GoogleOauthGuard, PublicEndpointGuard)
  async googleAuthRedirect(@Req() req: GoogleRequest, @Res() res: Response) {
    return res.redirect(
      await this.authService.signInUpWithSocialSSO(
        req.user,
        AuthProviderEnum.Google
      )
    );
  }
}
```

---

## 4. Middleware Stack

### Middleware Configuration

**File**: `packages/twenty-server/src/app.module.ts`

```typescript
configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(GraphQLHydrateRequestFromTokenMiddleware)
    .forRoutes({ path: 'graphql', method: RequestMethod.ALL });

  consumer
    .apply(GraphQLHydrateRequestFromTokenMiddleware)
    .forRoutes({ path: 'metadata', method: RequestMethod.ALL });

  consumer
    .apply(RestCoreMiddleware)
    .forRoutes({ path: 'rest/*', method: MIGRATED_REST_METHODS });
}
```

### Middleware Service

**File**: `packages/twenty-server/src/engine/middlewares/middleware.service.ts`

```typescript
@Injectable()
export class MiddlewareService {
  async hydrateRestRequest(request: Request) {
    const data = await this.accessTokenService.validateTokenByRequest(request);

    const metadataVersion = data.workspace
      ? await this.workspaceStorageCacheService.getMetadataVersion(
          data.workspace.id
        )
      : undefined;

    this.bindDataToRequestObject(data, request, metadataVersion);
  }

  private bindDataToRequestObject(
    data: AuthContext,
    request: Request,
    metadataVersion: number
  ) {
    request.user = data.user;
    request.apiKey = data.apiKey;
    request.userWorkspace = data.userWorkspace;
    request.workspace = data.workspace;
    request.workspaceId = data.workspace?.id;
    request.workspaceMetadataVersion = metadataVersion;
    request.workspaceMemberId = data.workspaceMemberId;
    request.userWorkspaceId = data.userWorkspaceId;
    request.authProvider = data.authProvider;
    request.locale =
      data.userWorkspace?.locale ??
      request.headers['x-locale'] ??
      SOURCE_LOCALE;
  }
}
```

### Global Middleware

```typescript
// main.ts
app.use(session(getSessionStorageOptions(twentyConfigService)));
app.use('/graphql', graphqlUploadExpress({...}));
app.use('/metadata', graphqlUploadExpress({...}));
```

---

## 5. Error Handling

### Exception Filters

| Filter | Purpose |
|--------|---------|
| `UnhandledExceptionFilter` | Global exception handler |
| `RestApiExceptionFilter` | REST API errors |
| `AuthExceptionFilter` | Authentication errors |
| `FileApiExceptionFilter` | File operation errors |

### REST API Exception Filter

**File**: `packages/twenty-server/src/engine/api/rest/rest-api-exception.filter.ts`

```typescript
@Catch()
export class RestApiExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly httpExceptionHandlerService: HttpExceptionHandlerService
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : 400;

    return this.httpExceptionHandlerService.handleError(
      exception as Error | HttpException,
      response,
      statusCode
    );
  }
}
```

### Error Response Format

```typescript
// REST Error Response
{
  statusCode: 400,
  messages: ["Error message"],
  error: "INTERNAL_SERVER_ERROR"
}

// GraphQL Error Response
{
  errors: [
    {
      message: "Error message",
      extensions: {
        code: "ERROR_CODE"
      }
    }
  ]
}
```

---

## 6. mkt-core HTTP Controllers

### SEPay Payment Webhook

**File**: `packages/twenty-server/src/mkt-core/payment/sepay-payment/sepay-payment.controller.ts`

```typescript
@Controller('hooks')
export class SepayPaymentController {
  @UseGuards(...sepayGuards)
  @Post('sepay-payment')
  @HttpCode(HttpStatus.OK)
  async handleSepayPayment(@Body() payload: SepayWebhookPayload) {
    // Payload structure:
    // - gateway: "sepay"
    // - transactionDate: timestamp
    // - accountNumber: "0971304083"
    // - code: order code
    // - transferAmount: amount
    // - description: payment description

    const workspaceId = process.env.SEPAY_WORKSPACE_ID;
    const order = await this.mktPaymentService.findOneByOrderCode(
      workspaceId,
      payload.code
    );

    await this.mktPaymentService.updatePaymentById(workspaceId, payment.id, {
      status: MKT_PAYMENT_STATUS.COMPLETED,
      paymentDate: payload.transactionDate,
      amount: payload.transferAmount,
      description: payload.content,
    });

    await this.fireBaseIntegrationService.completedOrderToFirebase(order);

    return { success: true };
  }
}
```

**Environment Variables**:
```bash
SEPAY_AUTH_ENABLED=true|false
SEPAY_WORKSPACE_ID=workspace-uuid
```

### Invoice File Download

**File**: `packages/twenty-server/src/mkt-core/invoice/controllers/invoice-file.controller.ts`

```typescript
@Controller('api/files/invoice-files')
export class InvoiceFileController {
  @UseGuards(PublicEndpointGuard)
  @Get(':fileName')
  async downloadFile(
    @Param('fileName') fileName: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Res() res: Response
  ) {
    // Time-limited download với HMAC-SHA256 signature
    const secretKey = process.env.FILE_DOWNLOAD_SECRET || 'default-secret-key';
    const expectedSignature = this.generateSignature(
      fileName,
      expires,
      secretKey
    );

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Stream file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @UseGuards(JwtAuthGuard, UserAuthGuard)
  @Post('regenerate-url')
  async regenerateDownloadUrl(@Body() body: { fileName: string }) {
    const expiresIn = parseInt(process.env.FILE_DOWNLOAD_EXPIRES || '30');
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const signature = this.generateSignature(
      fileName,
      expires.toString(),
      secretKey
    );

    return {
      downloadUrl: `/api/files/invoice-files/${fileName}?expires=${expires}&signature=${signature}`,
      expires,
      expiresIn,
    };
  }

  private generateSignature(
    fileName: string,
    expires: string,
    secretKey: string
  ): string {
    const data = `${fileName}:${expires}`;
    return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
  }
}
```

**Environment Variables**:
```bash
FILE_DOWNLOAD_SECRET=your-secret-key
FILE_DOWNLOAD_EXPIRES=30  # seconds
```

---

## 7. HTTP Client Usage

### HttpService Pattern

```typescript
import { HttpService } from '@nestjs/axios';

@Injectable()
export class MyService {
  constructor(private readonly httpService: HttpService) {}

  async callExternalApi(url: string, data: object) {
    const response = await this.httpService.axiosRef.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000,
    });

    return response.data;
  }
}
```

### HTTP Tool

**File**: `packages/twenty-server/src/engine/core-modules/tool/tools/http-tool/http-tool.ts`

```typescript
@Injectable()
export class HttpTool implements Tool {
  async execute(parameters: ToolInput): Promise<ToolOutput> {
    const { url, method, headers, body } = parameters as HttpRequestInput;

    const axiosConfig: AxiosRequestConfig = {
      url,
      method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      axiosConfig.data = body;
    }

    const response = await axios(axiosConfig);
    return { result: response.data };
  }
}
```

---

## 8. Request Validation

### DTO Pattern

```typescript
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateCustomerDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
```

### Validation Pipe Setup

```typescript
// main.ts
import { useContainer } from 'class-validator';

useContainer(app.select(AppModule), { fallbackOnErrors: true });
```

---

## 9. Rate Limiting

### GraphQL Rate Limiting

```typescript
// graphql-config.service.ts
useThrottler({
  ttl: this.twentyConfigService.get('API_RATE_LIMITING_TTL'),
  limit: this.twentyConfigService.get('API_RATE_LIMITING_LIMIT'),
  identifyFn: (context) =>
    context.req.user?.id ?? context.req.ip ?? 'anonymous',
});
```

### Configuration

| Setting | Default | Mô tả |
|---------|---------|-------|
| `API_RATE_LIMITING_TTL` | 60000 | Window time (ms) |
| `API_RATE_LIMITING_LIMIT` | 100 | Max requests per window |

---

## 10. Request/Response Flow

```
HTTP Request
    ↓
Express Middleware (body parser, session, CORS)
    ↓
GraphQL Upload Middleware (for file uploads)
    ↓
NestJS Global Filters (UnhandledExceptionFilter)
    ↓
Route Middleware (GraphQLHydrate, RestCore)
    ↓
Guards (JwtAuthGuard, WorkspaceAuthGuard)
    ↓
Controller Method
    ↓
Service Layer
    ↓
Exception Filter (RestApiExceptionFilter)
    ↓
HTTP Response
```

---

## 11. Tạo HTTP Endpoint mới

### Step 1: Create Controller

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { RestApiExceptionFilter } from 'src/engine/api/rest/rest-api-exception.filter';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { Workspace } from 'src/engine/core-modules/workspace/workspace.entity';

@Controller('rest/mkt-custom')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
@UseFilters(RestApiExceptionFilter)
export class MktCustomController {
  constructor(private readonly customService: MktCustomService) {}

  @Get()
  async getAll(@AuthWorkspace() workspace: Workspace) {
    return this.customService.findAll(workspace.id);
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @AuthWorkspace() workspace: Workspace
  ) {
    return this.customService.findOne(workspace.id, id);
  }

  @Post()
  async create(
    @Body() dto: CreateMktCustomDTO,
    @AuthWorkspace() workspace: Workspace
  ) {
    return this.customService.create(workspace.id, dto);
  }
}
```

### Step 2: Create DTO

```typescript
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateMktCustomDTO {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;
}
```

### Step 3: Create Service

```typescript
import { Injectable } from '@nestjs/common';
import { TwentyORMManager } from 'src/engine/twenty-orm/twenty-orm.manager';

@Injectable()
export class MktCustomService {
  constructor(private readonly twentyORMManager: TwentyORMManager) {}

  async findAll(workspaceId: string) {
    const repository = await this.twentyORMManager.getRepository(
      workspaceId,
      'mktCustom'
    );
    return repository.find();
  }

  async findOne(workspaceId: string, id: string) {
    const repository = await this.twentyORMManager.getRepository(
      workspaceId,
      'mktCustom'
    );
    return repository.findOne({ where: { id } });
  }

  async create(workspaceId: string, dto: CreateMktCustomDTO) {
    const repository = await this.twentyORMManager.getRepository(
      workspaceId,
      'mktCustom'
    );
    return repository.save(dto);
  }
}
```

### Step 4: Create Module

```typescript
import { Module } from '@nestjs/common';
import { MktCustomController } from './mkt-custom.controller';
import { MktCustomService } from './mkt-custom.service';

@Module({
  controllers: [MktCustomController],
  providers: [MktCustomService],
  exports: [MktCustomService],
})
export class MktCustomModule {}
```

### Step 5: Register Module

```typescript
// mkt-core.module.ts
@Module({
  imports: [
    // ... existing modules
    MktCustomModule,
  ],
})
export class MktCoreModule {}
```

---

## 12. Authentication Patterns

### Public Endpoint

```typescript
@Controller('public')
export class PublicController {
  @UseGuards(PublicEndpointGuard)
  @Get()
  async getData() {
    return { message: 'Public data' };
  }
}
```

### Authenticated Endpoint

```typescript
@Controller('protected')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class ProtectedController {
  @Get()
  async getData(@AuthWorkspace() workspace: Workspace) {
    return { workspaceId: workspace.id };
  }
}
```

### Conditional Authentication (Webhook)

```typescript
const webhookGuards =
  process.env.WEBHOOK_AUTH_ENABLED === 'true'
    ? [JwtAuthGuard, UserAuthGuard]
    : [PublicEndpointGuard];

@Controller('hooks')
export class WebhookController {
  @UseGuards(...webhookGuards)
  @Post('my-webhook')
  async handleWebhook(@Body() payload: WebhookPayload) {
    return { success: true };
  }
}
```

---

## 13. File Structure Summary

```
packages/twenty-server/src/
├── main.ts                          # Entry point, middleware setup
├── app.module.ts                    # Module config, middleware registration
├── engine/
│   ├── api/
│   │   ├── graphql/
│   │   │   └── graphql-config/
│   │   │       └── graphql-config.service.ts  # GraphQL Yoga setup
│   │   └── rest/
│   │       ├── core/
│   │       │   └── controllers/
│   │       │       └── rest-api-core.controller.ts
│   │       ├── metadata/
│   │       │   └── rest-api-metadata.controller.ts
│   │       ├── rest-api.service.ts
│   │       └── rest-api-exception.filter.ts
│   ├── core-modules/
│   │   └── auth/
│   │       ├── controllers/
│   │       │   ├── google-auth.controller.ts
│   │       │   ├── microsoft-auth.controller.ts
│   │       │   └── sso-auth.controller.ts
│   │       └── token/
│   │           └── services/
│   │               └── access-token.service.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── workspace-auth.guard.ts
│   └── middlewares/
│       ├── middleware.service.ts
│       ├── rest-core.middleware.ts
│       └── graphql-hydrate-request-from-token.middleware.ts
└── mkt-core/
    ├── payment/
    │   └── sepay-payment/
    │       └── sepay-payment.controller.ts
    └── invoice/
        └── controllers/
            └── invoice-file.controller.ts
```

---

## 14. Best Practices

### Do's

1. **Luôn sử dụng Guards cho authentication**
   ```typescript
   @UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
   ```

2. **Sử dụng Exception Filter**
   ```typescript
   @UseFilters(RestApiExceptionFilter)
   ```

3. **Validate input với DTO**
   ```typescript
   async create(@Body() dto: CreateDTO) { }
   ```

4. **Sử dụng decorators để lấy context**
   ```typescript
   @AuthWorkspace() workspace: Workspace
   @AuthUser() user: User
   ```

### Don'ts

1. **Không expose internal errors**
   - Sử dụng exception filter để transform errors

2. **Không skip authentication cho protected routes**
   - Luôn kiểm tra guards

3. **Không hardcode secrets**
   - Sử dụng environment variables

---

## 15. Troubleshooting

### Debug Request

```typescript
@Get()
async debug(@Req() request: Request) {
  console.log('Headers:', request.headers);
  console.log('User:', request.user);
  console.log('Workspace:', request.workspace);
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/missing token | Check Authorization header |
| 403 Forbidden | No workspace access | Verify workspace membership |
| 404 Not Found | Invalid route | Check controller path |
| 413 Payload Too Large | Body > 10MB | Increase limit or compress |
