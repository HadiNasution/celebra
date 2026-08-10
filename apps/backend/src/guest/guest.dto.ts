import { IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateGuestDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID()
  guestRoleId?: string;
}

export class UpdateGuestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID()
  guestRoleId?: string;
}

export class ImportGuestsCsvDto {
  @IsString()
  @IsNotEmpty()
  csv!: string;
}
