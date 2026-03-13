import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { JwtAuthGuard } from './authorization/guards/jwt-auth.guard';
import { PermissionGuard } from './authorization/guards/permission.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { envValidationSchema } from './config/env.validation';
import { CustomerPortalModule } from './customer-portal/customer-portal.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { LeadsModule } from './leads/leads.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', { infer: true }),
      }),
    }),
    DatabaseModule,
    AuthorizationModule,
    AuthModule,
    DashboardModule,
    LeadsModule,
    TasksModule,
    ReportsModule,
    SettingsModule,
    CustomerPortalModule,
    AuditLogsModule,
    PermissionsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
