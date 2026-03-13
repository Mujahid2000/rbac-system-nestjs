import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleName } from '../../database/schemas/role.schema';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(RoleName)
  roleName!: RoleName;

  @IsOptional()
  @IsMongoId()
  managerId?: string;
}
