import { IsEnum } from 'class-validator';
import { UserStatus } from '../../database/schemas/user.schema';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}
