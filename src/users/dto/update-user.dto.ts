import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleName } from '../../database/schemas/role.schema';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(RoleName)
  roleName?: RoleName;

  @IsOptional()
  @IsMongoId()
  managerId?: string;
}
