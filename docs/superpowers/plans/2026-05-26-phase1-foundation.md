# Phase 1：基础骨架 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 搭建完整的 Monorepo 项目骨架，实现认证（注册/登录/JWT）和用户管理功能，让 App 能跑起来并完成登录流程。

**架构：** pnpm workspace Monorepo，前端 Bare React Native + React Navigation + Zustand，后端 NestJS + Prisma + MySQL 8.0。前后端通过 Axios + TanStack Query 通信，JWT 认证。

**技术栈：** React Native 0.76+, NestJS 10, Prisma 6, MySQL 8.0, Zustand, TanStack Query, React Navigation 7, Axios, React Hook Form, Zod, MMKV

---

## 文件结构

```
economic/
├── package.json                          # pnpm workspace 根配置
├── pnpm-workspace.yaml
├── .gitignore
├── apps/
│   ├── server/                           # NestJS 后端
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── .env
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # 数据模型
│   │   │   └── seed.ts                   # 种子数据
│   │   └── src/
│   │       ├── main.ts                   # 入口
│   │       ├── app.module.ts             # 根模块
│   │       ├── common/
│   │       │   ├── filters/http-exception.filter.ts
│   │       │   ├── interceptors/transform.interceptor.ts
│   │       │   ├── guards/jwt-auth.guard.ts
│   │       │   └── decorators/current-user.decorator.ts
│   │       ├── config/
│   │       │   └── database.config.ts
│   │       └── modules/
│   │           ├── prisma/
│   │           │   ├── prisma.module.ts
│   │           │   └── prisma.service.ts
│   │           ├── auth/
│   │           │   ├── auth.module.ts
│   │           │   ├── auth.controller.ts
│   │           │   ├── auth.service.ts
│   │           │   ├── dto/register.dto.ts
│   │           │   ├── dto/login.dto.ts
│   │           │   └── strategies/jwt.strategy.ts
│   │           ├── user/
│   │           │   ├── user.module.ts
│   │           │   ├── user.controller.ts
│   │           │   ├── user.service.ts
│   │           │   └── dto/update-user.dto.ts
│   │           └── address/
│   │               ├── address.module.ts
│   │               ├── address.controller.ts
│   │               ├── address.service.ts
│   │               └── dto/
│   │                   ├── create-address.dto.ts
│   │                   └── update-address.dto.ts
│   └── mobile/                           # React Native App
│       ├── package.json
│       ├── tsconfig.json
│       ├── app.json
│       ├── android/
│       └── src/
│           ├── App.tsx                   # 根组件
│           ├── theme/
│           │   └── tokens.ts             # 设计令牌
│           ├── components/
│           │   ├── Button.tsx
│           │   ├── Input.tsx
│           │   ├── Card.tsx
│           │   ├── Header.tsx
│           │   └── Loading.tsx
│           ├── navigation/
│           │   ├── RootNavigator.tsx     # 认证态切换
│           │   ├── AuthStack.tsx         # 登录/注册导航
│           │   └── MainTabs.tsx          # 底部 Tab
│           ├── services/
│           │   └── api.ts               # Axios 实例 + 拦截器
│           ├── stores/
│           │   └── authStore.ts          # 认证状态
│           ├── hooks/
│           │   └── useAuth.ts            # 认证 Hook
│           └── screens/
│               ├── auth/
│               │   ├── LoginScreen.tsx
│               │   └── RegisterScreen.tsx
│               ├── HomeScreen.tsx
│               ├── MapScreen.tsx
│               ├── OrderScreen.tsx
│               ├── AIScreen.tsx
│               └── profile/
│                   ├── ProfileScreen.tsx
│                   └── EditProfileScreen.tsx
└── packages/
    └── shared/
        ├── package.json
        ├── tsconfig.json
        └── types/
            ├── index.ts
            ├── user.ts
            ├── auth.ts
            └── address.ts
```

---

## 任务 1：Monorepo 搭建

**文件：**
- 创建：`economic/package.json`
- 创建：`economic/pnpm-workspace.yaml`
- 创建：`economic/.gitignore`

- [ ] **步骤 1：初始化 Git 仓库**

```bash
cd /e/economic
git init
```

- [ ] **步骤 2：创建根 package.json**

```json
{
  "name": "economic",
  "private": true,
  "scripts": {
    "dev:server": "pnpm --filter @economic/server start:dev",
    "dev:mobile": "pnpm --filter @economic/mobile android",
    "build:server": "pnpm --filter @economic/server build",
    "db:migrate": "pnpm --filter @economic/server prisma:migrate",
    "db:seed": "pnpm --filter @economic/server prisma:seed"
  }
}
```

- [ ] **步骤 3：创建 pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **步骤 4：创建 .gitignore**

```
node_modules/
dist/
.env
*.log
.DS_Store
android/.gradle/
android/app/build/
android/build/
.idea/
*.hprof
```

- [ ] **步骤 5：验证 pnpm workspace**

```bash
cd /e/economic && pnpm install
```

预期：成功（空 workspace，无报错）

- [ ] **步骤 6：Commit**

```bash
git add .
git commit -m "chore: init pnpm monorepo workspace"
```

---

## 任务 2：共享类型包

**文件：**
- 创建：`packages/shared/package.json`
- 创建：`packages/shared/tsconfig.json`
- 创建：`packages/shared/types/index.ts`
- 创建：`packages/shared/types/user.ts`
- 创建：`packages/shared/types/auth.ts`
- 创建：`packages/shared/types/address.ts`

- [ ] **步骤 1：创建 shared 包配置**

`packages/shared/package.json`:
```json
{
  "name": "@economic/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./types/index.ts",
  "types": "./types/index.ts"
}
```

`packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["types/**/*"]
}
```

- [ ] **步骤 2：定义用户类型**

`packages/shared/types/user.ts`:
```typescript
export interface User {
  id: number;
  phone: string;
  nickname: string | null;
  avatar: string | null;
  gender: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  nickname?: string;
  avatar?: string;
  gender?: number;
}
```

- [ ] **步骤 3：定义认证类型**

`packages/shared/types/auth.ts`:
```typescript
export interface RegisterDto {
  phone: string;
  password: string;
  nickname?: string;
}

export interface LoginDto {
  phone: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: import('./user').User;
}
```

- [ ] **步骤 4：定义地址类型**

`packages/shared/types/address.ts`:
```typescript
export interface Address {
  id: number;
  userId: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface CreateAddressDto {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface UpdateAddressDto extends Partial<CreateAddressDto> {}
```

- [ ] **步骤 5：导出索引**

`packages/shared/types/index.ts`:
```typescript
export * from './user';
export * from './auth';
export * from './address';
```

- [ ] **步骤 6：Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types package"
```

---

## 任务 3：NestJS 后端初始化

**文件：**
- 创建：`apps/server/` 下所有 NestJS 初始化文件

- [ ] **步骤 1：使用 NestJS CLI 创建项目**

```bash
cd /e/economic/apps
npx @nestjs/cli@latest server --package-manager pnpm --skip-git --strict
```

- [ ] **步骤 2：安装依赖**

```bash
cd /e/economic/apps/server
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt \
  @prisma/client bcrypt class-validator class-transformer
pnpm add -D prisma @types/passport-jwt @types/bcrypt @nestjs/swagger
```

- [ ] **步骤 3：更新 package.json 添加 workspace 依赖和脚本**

在 `apps/server/package.json` 的 `dependencies` 中添加：
```json
"@economic/shared": "workspace:*"
```

添加 scripts：
```json
{
  "scripts": {
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:generate": "prisma generate"
  }
}
```

- [ ] **步骤 4：配置 .env**

`apps/server/.env`:
```
DATABASE_URL="mysql://root:root@localhost:3306/economic"
JWT_SECRET="economic-jwt-secret-dev-only"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000
```

注意：MySQL 密码根据 phpstudy_pro 的实际配置修改。

- [ ] **步骤 5：配置 nest-cli.json**

`apps/server/nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **步骤 6：验证后端能启动**

```bash
cd /e/economic && pnpm --filter @economic/server start:dev
```

预期：NestJS 启动成功，监听 3000 端口

- [ ] **步骤 7：Commit**

```bash
git add apps/server/
git commit -m "feat: init NestJS server project"
```

---

## 任务 4：Prisma Schema + MySQL 连接

**文件：**
- 创建：`apps/server/prisma/schema.prisma`
- 创建：`apps/server/src/modules/prisma/prisma.service.ts`
- 创建：`apps/server/src/modules/prisma/prisma.module.ts`

- [ ] **步骤 1：创建 Prisma schema（Phase 1 表）**

`apps/server/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  phone     String   @unique @db.VarChar(20)
  password  String   @db.VarChar(255)
  nickname  String?  @db.VarChar(50)
  avatar    String?  @db.VarChar(500)
  gender    Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  addresses    Address[]

  @@map("users")
}

model Address {
  id        Int      @id @default(autoincrement())
  userId    Int
  name      String   @db.VarChar(50)
  phone     String   @db.VarChar(20)
  province  String   @db.VarChar(50)
  city      String   @db.VarChar(50)
  district  String   @db.VarChar(50)
  detail    String   @db.VarChar(200)
  latitude  Decimal  @db.Decimal(10, 7)
  longitude Decimal  @db.Decimal(10, 7)
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("addresses")
}
```

- [ ] **步骤 2：创建 MySQL 数据库**

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS economic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

- [ ] **步骤 3：运行 Prisma 迁移**

```bash
cd /e/economic/apps/server
pnpm prisma migrate dev --name init
```

预期：迁移成功，生成 Prisma Client

- [ ] **步骤 4：创建 PrismaService**

`apps/server/src/modules/prisma/prisma.service.ts`:
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

`apps/server/src/modules/prisma/prisma.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **步骤 5：在 AppModule 中导入 PrismaModule**

修改 `apps/server/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
})
export class AppModule {}
```

- [ ] **步骤 6：验证数据库连接**

```bash
pnpm --filter @economic/server start:dev
```

预期：启动成功，无数据库连接错误

- [ ] **步骤 7：Commit**

```bash
git add apps/server/prisma/ apps/server/src/modules/prisma/ apps/server/src/app.module.ts
git commit -m "feat: add Prisma schema with User and Address models"
```

---

## 任务 5：公共模块（过滤器、拦截器、守卫、装饰器）

**文件：**
- 创建：`apps/server/src/common/filters/http-exception.filter.ts`
- 创建：`apps/server/src/common/interceptors/transform.interceptor.ts`
- 创建：`apps/server/src/common/guards/jwt-auth.guard.ts`
- 创建：`apps/server/src/common/decorators/current-user.decorator.ts`

- [ ] **步骤 1：创建统一响应拦截器**

`apps/server/src/common/interceptors/transform.interceptor.ts`:
```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: 'success',
        data,
      })),
    );
  }
}
```

- [ ] **步骤 2：创建异常过滤器**

`apps/server/src/common/filters/http-exception.filter.ts`:
```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? (exception.getResponse() as any).message || exception.message
      : 'Internal server error';

    response.status(status).json({
      code: status,
      message: Array.isArray(message) ? message[0] : message,
      data: null,
    });
  }
}
```

- [ ] **步骤 3：创建 JWT 守卫**

`apps/server/src/common/guards/jwt-auth.guard.ts`:
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

- [ ] **步骤 4：创建 CurrentUser 装饰器**

`apps/server/src/common/decorators/current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

- [ ] **步骤 5：在 main.ts 中注册全局过滤器和拦截器**

修改 `apps/server/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();

  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
}
bootstrap();
```

- [ ] **步骤 6：Commit**

```bash
git add apps/server/src/common/ apps/server/src/main.ts
git commit -m "feat: add common guards, filters, interceptors, decorators"
```

---

## 任务 6：认证模块（后端）

**文件：**
- 创建：`apps/server/src/modules/auth/auth.module.ts`
- 创建：`apps/server/src/modules/auth/auth.controller.ts`
- 创建：`apps/server/src/modules/auth/auth.service.ts`
- 创建：`apps/server/src/modules/auth/dto/register.dto.ts`
- 创建：`apps/server/src/modules/auth/dto/login.dto.ts`
- 创建：`apps/server/src/modules/auth/strategies/jwt.strategy.ts`
- 修改：`apps/server/src/app.module.ts`

- [ ] **步骤 1：创建 RegisterDto**

`apps/server/src/modules/auth/dto/register.dto.ts`:
```typescript
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @MinLength(6)
  @MaxLength(32)
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nickname?: string;
}
```

- [ ] **步骤 2：创建 LoginDto**

`apps/server/src/modules/auth/dto/login.dto.ts`:
```typescript
import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  phone: string;

  @IsString()
  password: string;
}
```

- [ ] **步骤 3：创建 JwtStrategy**

`apps/server/src/modules/auth/strategies/jwt.strategy.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: number; phone: string }) {
    return { id: payload.sub, phone: payload.phone };
  }
}
```

- [ ] **步骤 4：创建 AuthService**

`apps/server/src/modules/auth/auth.service.ts`:
```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('手机号已注册');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        nickname: dto.nickname || `用户${dto.phone.slice(-4)}`,
      },
    });

    const tokens = this.generateTokens(user.id, user.phone);
    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const tokens = this.generateTokens(user.id, user.phone);
    const { password, ...userWithoutPassword } = user;
    return { ...tokens, user: userWithoutPassword };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      const tokens = this.generateTokens(payload.sub, payload.phone);
      return { accessToken: tokens.accessToken };
    } catch {
      throw new UnauthorizedException('refresh token 无效或已过期');
    }
  }

  private generateTokens(userId: number, phone: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId, phone },
      { expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m') },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, phone },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET', this.configService.get('JWT_SECRET') + '_refresh'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
    return { accessToken, refreshToken };
  }
}
```

- [ ] **步骤 5：创建 AuthController**

`apps/server/src/modules/auth/auth.controller.ts`:
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }
}
```

- [ ] **步骤 6：创建 AuthModule**

`apps/server/src/modules/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **步骤 7：在 AppModule 中导入 AuthModule**

修改 `apps/server/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **步骤 8：测试认证 API**

```bash
# 启动服务器
pnpm --filter @economic/server start:dev

# 测试注册
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456","nickname":"测试用户"}'

# 测试登录
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456"}'
```

预期：注册和登录都返回 `{ code: 200, data: { accessToken, refreshToken, user } }`

- [ ] **步骤 9：Commit**

```bash
git add apps/server/src/modules/auth/ apps/server/src/app.module.ts
git commit -m "feat: add auth module with register, login, refresh"
```

---

## 任务 7：用户模块（后端）

**文件：**
- 创建：`apps/server/src/modules/user/user.module.ts`
- 创建：`apps/server/src/modules/user/user.controller.ts`
- 创建：`apps/server/src/modules/user/user.service.ts`
- 创建：`apps/server/src/modules/user/dto/update-user.dto.ts`
- 修改：`apps/server/src/app.module.ts`

- [ ] **步骤 1：创建 UpdateUserDto**

`apps/server/src/modules/user/dto/update-user.dto.ts`:
```typescript
import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  nickname?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  avatar?: string;

  @IsInt()
  @IsOptional()
  gender?: number;
}
```

- [ ] **步骤 2：创建 UserService**

`apps/server/src/modules/user/user.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, phone: true, nickname: true, avatar: true, gender: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, phone: true, nickname: true, avatar: true, gender: true, createdAt: true, updatedAt: true },
    });
  }
}
```

- [ ] **步骤 3：创建 UserController**

`apps/server/src/modules/user/user.controller.ts`:
```typescript
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getMe(@CurrentUser('id') userId: number) {
    return this.userService.findById(userId);
  }

  @Patch('me')
  updateMe(@CurrentUser('id') userId: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(userId, dto);
  }
}
```

- [ ] **步骤 4：创建 UserModule**

`apps/server/src/modules/user/user.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

- [ ] **步骤 5：在 AppModule 中导入 UserModule**

在 `apps/server/src/app.module.ts` 的 imports 中添加 `UserModule`。

- [ ] **步骤 6：测试用户 API**

```bash
# 先登录获取 token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456"}' | jq -r '.data.accessToken')

# 获取当前用户
curl http://localhost:3000/api/v1/users/me -H "Authorization: Bearer $TOKEN"

# 更新用户
curl -X PATCH http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"新昵称","gender":1}'
```

- [ ] **步骤 7：Commit**

```bash
git add apps/server/src/modules/user/ apps/server/src/app.module.ts
git commit -m "feat: add user module with profile CRUD"
```

---

## 任务 8：地址模块（后端）

**文件：**
- 创建：`apps/server/src/modules/address/address.module.ts`
- 创建：`apps/server/src/modules/address/address.controller.ts`
- 创建：`apps/server/src/modules/address/address.service.ts`
- 创建：`apps/server/src/modules/address/dto/create-address.dto.ts`
- 创建：`apps/server/src/modules/address/dto/update-address.dto.ts`
- 修改：`apps/server/src/app.module.ts`

- [ ] **步骤 1：创建 CreateAddressDto**

`apps/server/src/modules/address/dto/create-address.dto.ts`:
```typescript
import { IsString, IsNumber, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @MaxLength(50)
  province: string;

  @IsString()
  @MaxLength(50)
  city: string;

  @IsString()
  @MaxLength(50)
  district: string;

  @IsString()
  @MaxLength(200)
  detail: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
```

- [ ] **步骤 2：创建 UpdateAddressDto**

`apps/server/src/modules/address/dto/update-address.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
```

- [ ] **步骤 3：创建 AddressService**

`apps/server/src/modules/address/address.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async create(userId: number, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({ data: { ...dto, userId } });
  }

  async update(userId: number, id: number, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('地址不存在');

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async delete(userId: number, id: number) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('地址不存在');
    return this.prisma.address.delete({ where: { id } });
  }
}
```

- [ ] **步骤 4：创建 AddressController**

`apps/server/src/modules/address/address.controller.ts`:
```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  findAll(@CurrentUser('id') userId: number) {
    return this.addressService.findAll(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: number, @Body() dto: CreateAddressDto) {
    return this.addressService.create(userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAddressDto) {
    return this.addressService.update(userId, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.addressService.delete(userId, id);
  }
}
```

- [ ] **步骤 5：创建 AddressModule 并注册到 AppModule**

`apps/server/src/modules/address/address.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';

@Module({
  controllers: [AddressController],
  providers: [AddressService],
})
export class AddressModule {}
```

在 `apps/server/src/app.module.ts` 的 imports 中添加 `AddressModule`。

- [ ] **步骤 6：测试地址 API**

```bash
# 创建地址
curl -X POST http://localhost:3000/api/v1/addresses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","phone":"13800138000","province":"北京市","city":"北京市","district":"朝阳区","detail":"三里屯太古里","latitude":39.9335,"longitude":116.4546,"isDefault":true}'

# 获取地址列表
curl http://localhost:3000/api/v1/addresses -H "Authorization: Bearer $TOKEN"
```

- [ ] **步骤 7：Commit**

```bash
git add apps/server/src/modules/address/ apps/server/src/app.module.ts
git commit -m "feat: add address module with CRUD"
```

---

## 任务 9：种子数据

**文件：**
- 创建：`apps/server/prisma/seed.ts`
- 修改：`apps/server/package.json`

- [ ] **步骤 1：创建种子数据脚本**

`apps/server/prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 清理数据
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // 创建测试用户
  const hashedPassword = await bcrypt.hash('123456', 10);
  const user = await prisma.user.create({
    data: {
      phone: '13800138000',
      password: hashedPassword,
      nickname: '测试用户',
      gender: 1,
    },
  });

  // 创建测试地址
  await prisma.address.create({
    data: {
      userId: user.id,
      name: '张三',
      phone: '13800138000',
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      detail: '三里屯太古里北区',
      latitude: 39.9335,
      longitude: 116.4546,
      isDefault: true,
    },
  });

  console.log('Seed data created:', { userId: user.id });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **步骤 2：添加 seed 脚本到 package.json**

在 `apps/server/package.json` 的 `prisma` 字段中添加：
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

- [ ] **步骤 3：运行种子数据**

```bash
cd /e/economic/apps/server
pnpm prisma db seed
```

预期：输出 "Seed data created: { userId: 1 }"

- [ ] **步骤 4：验证数据**

```bash
mysql -u root -p economic -e "SELECT id, phone, nickname FROM users; SELECT id, name, detail FROM addresses;"
```

- [ ] **步骤 5：Commit**

```bash
git add apps/server/prisma/seed.ts apps/server/package.json
git commit -m "feat: add seed data for testing"
```

---

## 任务 10：React Native 项目初始化

**文件：**
- 创建：`apps/mobile/` 下所有 RN 初始化文件

- [ ] **步骤 1：创建 React Native 项目**

```bash
cd /e/economic/apps
npx @react-native-community/cli@latest init EconomicMobile --directory mobile --package-name com.economic.mobile --skip-git-install
```

- [ ] **步骤 2：安装核心依赖**

```bash
cd /e/economic/apps/mobile
pnpm add @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context \
  zustand @tanstack/react-query axios \
  react-hook-form @hookform/resolvers zod \
  react-native-mmkv \
  react-native-vector-icons \
  react-native-reanimated react-native-gesture-handler
pnpm add -D @types/react-native-vector-icons
```

- [ ] **步骤 3：添加 workspace 依赖**

在 `apps/mobile/package.json` 的 `dependencies` 中添加：
```json
"@economic/shared": "workspace:*"
```

- [ ] **步骤 4：配置 react-native-reanimated**

在 `babel.config.js` 的 plugins 中添加：
```javascript
plugins: ['react-native-reanimated/plugin'],
```

注意：`react-native-reanimated/plugin` 必须是 plugins 数组的最后一个。

- [ ] **步骤 5：验证 RN 项目能编译**

```bash
cd /e/economic
pnpm --filter @economic/mobile android
```

预期：App 在模拟器上成功启动，显示默认欢迎页

- [ ] **步骤 6：Commit**

```bash
git add apps/mobile/
git commit -m "feat: init React Native project"
```

---

## 任务 11：设计令牌 + 通用组件

**文件：**
- 创建：`apps/mobile/src/theme/tokens.ts`
- 创建：`apps/mobile/src/components/Button.tsx`
- 创建：`apps/mobile/src/components/Input.tsx`
- 创建：`apps/mobile/src/components/Card.tsx`
- 创建：`apps/mobile/src/components/Header.tsx`
- 创建：`apps/mobile/src/components/Loading.tsx`

- [ ] **步骤 1：创建设计令牌**

`apps/mobile/src/theme/tokens.ts`:
```typescript
export const colors = {
  primary: '#FF6B35',
  primaryLight: '#FF8F65',
  secondary: '#004E89',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E5E5E5',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  overlay: 'rgba(0,0,0,0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
};
```

- [ ] **步骤 2：创建 Button 组件**

`apps/mobile/src/components/Button.tsx`:
```tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const buttonStyle = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'outline' && styles.outline,
    disabled && styles.disabled,
    style,
  ];

  const titleStyle = [
    styles.text,
    variant === 'outline' && styles.outlineText,
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} disabled={disabled || loading} activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#FFF'} />
      ) : (
        <Text style={titleStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  disabled: { opacity: 0.5 },
  text: { color: '#FFF', fontSize: fontSize.md, fontWeight: '600' },
  outlineText: { color: colors.primary },
  disabledText: { color: colors.textLight },
});
```

- [ ] **步骤 3：创建 Input 组件**

`apps/mobile/src/components/Input.tsx`:
```tsx
import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(({ label, error, style, ...props }, ref) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        ref={ref}
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textLight}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.text, marginBottom: spacing.xs, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  inputError: { borderColor: colors.error },
  error: { fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs },
});
```

- [ ] **步骤 4：创建 Card、Header、Loading 组件**

按同样模式创建 `Card.tsx`（容器卡片）、`Header.tsx`（页面标题栏）、`Loading.tsx`（加载指示器）。

- [ ] **步骤 5：创建组件索引**

`apps/mobile/src/components/index.ts`:
```typescript
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';
export { Header } from './Header';
export { Loading } from './Loading';
```

- [ ] **步骤 6：Commit**

```bash
git add apps/mobile/src/theme/ apps/mobile/src/components/
git commit -m "feat: add design tokens and common components"
```

---

## 任务 12：API 客户端 + 认证状态

**文件：**
- 创建：`apps/mobile/src/services/api.ts`
- 创建：`apps/mobile/src/stores/authStore.ts`
- 创建：`apps/mobile/src/hooks/useAuth.ts`

- [ ] **步骤 1：创建 Axios 实例**

`apps/mobile/src/services/api.ts`:
```typescript
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

const api = axios.create({
  baseURL: 'http://10.0.2.2:3000/api/v1', // Android 模拟器访问本机
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截器：注入 token
api.interceptors.request.use((config) => {
  const token = storage.getString('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理 401
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = storage.getString('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post('http://10.0.2.2:3000/api/v1/auth/refresh', { refreshToken });
          storage.set('accessToken', data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        } catch {
          storage.delete('accessToken');
          storage.delete('refreshToken');
        }
      }
    }
    return Promise.reject(error.response?.data || error);
  },
);

export default api;
```

- [ ] **步骤 2：创建认证 Zustand Store**

`apps/mobile/src/stores/authStore.ts`:
```typescript
import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import api from '../services/api';
import type { User, AuthResponse } from '@economic/shared';

const storage = new MMKV();

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, nickname?: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!storage.getString('accessToken'),
  isLoading: false,

  login: async (phone, password) => {
    set({ isLoading: true });
    try {
      const res: any = await api.post('/auth/login', { phone, password });
      const { accessToken, refreshToken, user } = res.data;
      storage.set('accessToken', accessToken);
      storage.set('refreshToken', refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (phone, password, nickname) => {
    set({ isLoading: true });
    try {
      const res: any = await api.post('/auth/register', { phone, password, nickname });
      const { accessToken, refreshToken, user } = res.data;
      storage.set('accessToken', accessToken);
      storage.set('refreshToken', refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    storage.delete('accessToken');
    storage.delete('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const res: any = await api.get('/users/me');
      set({ user: res.data });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  updateUser: async (data) => {
    const res: any = await api.patch('/users/me', data);
    set({ user: res.data });
  },
}));
```

- [ ] **步骤 3：创建 useAuth Hook**

`apps/mobile/src/hooks/useAuth.ts`:
```typescript
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, login, register, logout, loadUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      loadUser();
    }
  }, [isAuthenticated]);

  return { user, isAuthenticated, isLoading, login, register, logout };
};
```

- [ ] **步骤 4：Commit**

```bash
git add apps/mobile/src/services/ apps/mobile/src/stores/ apps/mobile/src/hooks/
git commit -m "feat: add API client, auth store, and useAuth hook"
```

---

## 任务 13：导航结构

**文件：**
- 创建：`apps/mobile/src/navigation/RootNavigator.tsx`
- 创建：`apps/mobile/src/navigation/AuthStack.tsx`
- 创建：`apps/mobile/src/navigation/MainTabs.tsx`
- 修改：`apps/mobile/src/App.tsx`

- [ ] **步骤 1：创建 AuthStack**

`apps/mobile/src/navigation/AuthStack.tsx`:
```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);
```

- [ ] **步骤 2：创建 MainTabs**

`apps/mobile/src/navigation/MainTabs.tsx`:
```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import OrderScreen from '../screens/OrderScreen';
import AIScreen from '../screens/AIScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import { colors, fontSize } from '../theme/tokens';

const Tab = createBottomTabNavigator();

export const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textLight,
      tabBarLabelStyle: { fontSize: fontSize.xs },
      headerShown: false,
    }}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '首页' }} />
    <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: '地图' }} />
    <Tab.Screen name="Order" component={OrderScreen} options={{ tabBarLabel: '订单' }} />
    <Tab.Screen name="AI" component={AIScreen} options={{ tabBarLabel: 'AI助手' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '我的' }} />
  </Tab.Navigator>
);
```

- [ ] **步骤 3：创建 RootNavigator**

`apps/mobile/src/navigation/RootNavigator.tsx`:
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components/Loading';

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};
```

- [ ] **步骤 4：更新 App.tsx**

`apps/mobile/src/App.tsx`:
```tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './navigation/RootNavigator';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RootNavigator />
  </QueryClientProvider>
);

export default App;
```

- [ ] **步骤 5：创建占位页面**

创建 5 个占位页面（后续替换为真实实现）：

`apps/mobile/src/screens/HomeScreen.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

export default () => (
  <View style={styles.container}><Text style={styles.text}>首页</Text></View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  text: { fontSize: 24, color: colors.text },
});
```

同样创建 MapScreen、OrderScreen、AIScreen、ProfileScreen 占位。

- [ ] **步骤 6：验证导航**

```bash
pnpm --filter @economic/mobile android
```

预期：App 启动后显示登录页，因为未登录所以显示 AuthStack

- [ ] **步骤 7：Commit**

```bash
git add apps/mobile/src/navigation/ apps/mobile/src/screens/ apps/mobile/src/App.tsx
git commit -m "feat: add navigation structure with auth/main switching"
```

---

## 任务 14：登录/注册页面

**文件：**
- 创建：`apps/mobile/src/screens/auth/LoginScreen.tsx`
- 创建：`apps/mobile/src/screens/auth/RegisterScreen.tsx`

- [ ] **步骤 1：创建 LoginScreen**

`apps/mobile/src/screens/auth/LoginScreen.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input } from '../../components';
import { colors, spacing, fontSize } from '../../theme/tokens';

const loginSchema = z.object({
  phone: z.string().min(11, '请输入正确的手机号'),
  password: z.string().min(6, '密码至少6位'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen({ navigation }: any) {
  const { login, isLoading } = useAuth();
  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.phone, data.password);
    } catch (error: any) {
      Alert.alert('登录失败', error?.message || '请重试');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>欢迎回来</Text>
      <Text style={styles.subtitle}>登录你的账号</Text>

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <Input
            label="手机号"
            placeholder="请输入手机号"
            keyboardType="phone-pad"
            value={value}
            onChangeText={onChange}
            error={errors.phone?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            label="密码"
            placeholder="请输入密码"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            error={errors.password?.message}
          />
        )}
      />

      <Button title="登录" onPress={handleSubmit(onSubmit)} loading={isLoading} />

      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>没有账号？去注册</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background, justifyContent: 'center' },
  title: { fontSize: fontSize.xxl, fontWeight: 'bold', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xl },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.primary, fontSize: fontSize.md },
});
```

- [ ] **步骤 2：创建 RegisterScreen**

`apps/mobile/src/screens/auth/RegisterScreen.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input } from '../../components';
import { colors, spacing, fontSize } from '../../theme/tokens';

const registerSchema = z.object({
  phone: z.string().min(11, '请输入正确的手机号'),
  password: z.string().min(6, '密码至少6位'),
  nickname: z.string().max(50).optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen({ navigation }: any) {
  const { register, isLoading } = useAuth();
  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await register(data.phone, data.password, data.nickname);
    } catch (error: any) {
      Alert.alert('注册失败', error?.message || '请重试');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>创建账号</Text>
      <Text style={styles.subtitle}>注册后即可使用全部功能</Text>

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <Input
            label="手机号"
            placeholder="请输入手机号"
            keyboardType="phone-pad"
            value={value}
            onChangeText={onChange}
            error={errors.phone?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <Input
            label="密码"
            placeholder="请输入密码（至少6位）"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            error={errors.password?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="nickname"
        render={({ field: { onChange, value } }) => (
          <Input
            label="昵称（可选）"
            placeholder="给自己取个名字吧"
            value={value}
            onChangeText={onChange}
            error={errors.nickname?.message}
          />
        )}
      />

      <Button title="注册" onPress={handleSubmit(onSubmit)} loading={isLoading} />

      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>已有账号？去登录</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background, justifyContent: 'center' },
  title: { fontSize: fontSize.xxl, fontWeight: 'bold', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xl },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.primary, fontSize: fontSize.md },
});
```

- [ ] **步骤 3：测试登录流程**

```bash
pnpm --filter @economic/mobile android
```

测试步骤：
1. App 启动 → 显示登录页
2. 点击"去注册" → 显示注册页
3. 输入手机号、密码、昵称 → 点击注册
4. 注册成功 → 自动跳转到首页 Tab
5. 退出登录 → 回到登录页
6. 用刚注册的手机号登录 → 成功跳转首页

- [ ] **步骤 4：Commit**

```bash
git add apps/mobile/src/screens/auth/
git commit -m "feat: add login and register screens with form validation"
```

---

## 任务 15：个人中心页面

**文件：**
- 创建：`apps/mobile/src/screens/profile/ProfileScreen.tsx`
- 创建：`apps/mobile/src/screens/profile/EditProfileScreen.tsx`

- [ ] **步骤 1：创建 ProfileScreen**

`apps/mobile/src/screens/profile/ProfileScreen.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components';
import { colors, spacing, fontSize, borderRadius } from '../../theme/tokens';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('确认退出', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 用户信息卡片 */}
      <Card style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.nickname?.[0] || '用'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.nickname}>{user?.nickname || '未设置昵称'}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.editBtn}>编辑</Text>
        </TouchableOpacity>
      </Card>

      {/* 功能列表 */}
      <Card style={styles.menuCard}>
        {[
          { label: '我的地址', screen: 'AddressList' },
          { label: '我的收藏', screen: 'Favorite' },
          { label: '浏览历史', screen: 'History' },
          { label: '设置', screen: 'Settings' },
        ].map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, index < 3 && styles.menuBorder]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </Card>

      {/* 退出登录 */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, marginBottom: spacing.md },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: fontSize.xl, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: spacing.md },
  nickname: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  phone: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  editBtn: { color: colors.primary, fontSize: fontSize.sm },
  menuCard: { padding: 0, marginBottom: spacing.md },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLabel: { fontSize: fontSize.md, color: colors.text },
  menuArrow: { fontSize: fontSize.xl, color: colors.textLight },
  logoutBtn: { marginTop: spacing.lg, padding: spacing.md, alignItems: 'center' },
  logoutText: { color: colors.error, fontSize: fontSize.md },
});
```

- [ ] **步骤 2：创建 EditProfileScreen**

`apps/mobile/src/screens/profile/EditProfileScreen.tsx`:
```tsx
import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input } from '../../components';
import { colors, spacing, fontSize } from '../../theme/tokens';

export default function EditProfileScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();
  const { control, handleSubmit } = useForm({
    defaultValues: {
      nickname: user?.nickname || '',
    },
  });

  const onSubmit = async (data: { nickname: string }) => {
    try {
      await updateUser(data);
      Alert.alert('成功', '资料已更新');
      navigation.goBack();
    } catch {
      Alert.alert('失败', '请重试');
    }
  };

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name="nickname"
        render={({ field: { onChange, value } }) => (
          <Input label="昵称" value={value} onChangeText={onChange} />
        )}
      />
      <Button title="保存" onPress={handleSubmit(onSubmit)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
});
```

- [ ] **步骤 3：测试个人中心**

```bash
pnpm --filter @economic/mobile android
```

测试步骤：
1. 登录后 → 点击"我的" Tab → 显示个人中心
2. 看到头像、昵称、手机号
3. 点击"编辑" → 跳转编辑页 → 修改昵称 → 保存成功
4. 返回个人中心 → 昵称已更新
5. 点击"退出登录" → 确认弹窗 → 退出回到登录页

- [ ] **步骤 4：Commit**

```bash
git add apps/mobile/src/screens/profile/
git commit -m "feat: add profile and edit profile screens"
```

---

## Phase 1 完成检查清单

- [ ] Monorepo 搭建完成，`pnpm install` 正常
- [ ] NestJS 后端启动成功，`http://localhost:3000/api/v1` 可访问
- [ ] MySQL 数据库 `economic` 创建成功，迁移完成
- [ ] Prisma schema 包含 User、Address 两张表
- [ ] 注册 API `POST /api/v1/auth/register` 正常工作
- [ ] 登录 API `POST /api/v1/auth/login` 正常工作
- [ ] Token 刷新 `POST /api/v1/auth/refresh` 正常工作
- [ ] 用户信息 `GET /api/v1/users/me` 需要认证才能访问
- [ ] 地址 CRUD `GET/POST/PATCH/DELETE /api/v1/addresses` 正常工作
- [ ] React Native App 在 Android 模拟器上成功启动
- [ ] 登录/注册页面表单验证正常
- [ ] 登录成功后跳转到主页，退出后回到登录页
- [ ] 个人中心显示用户信息，可编辑昵称
- [ ] 底部 5 个 Tab 可切换（占位页面）
- [ ] 种子数据可正常运行
