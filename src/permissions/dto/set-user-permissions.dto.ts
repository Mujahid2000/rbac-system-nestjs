import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PermissionOverrideDto {
  @IsString()
  @IsNotEmpty()
  atomKey: string;

  @IsBoolean()
  granted: boolean;
}

export class SetUserPermissionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideDto)
  overrides: PermissionOverrideDto[];
}
