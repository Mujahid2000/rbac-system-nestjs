import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
})
export class PermissionsModule {}
