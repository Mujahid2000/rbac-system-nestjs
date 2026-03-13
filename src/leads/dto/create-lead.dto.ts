import { IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  email?: string;
}
