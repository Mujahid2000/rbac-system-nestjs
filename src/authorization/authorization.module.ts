import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { PermissionResolverService } from './permission-resolver.service';

@Module({
  imports: [JwtModule.register({}), DatabaseModule],
  providers: [PermissionResolverService],
  exports: [JwtModule, PermissionResolverService],
})
export class AuthorizationModule {}
