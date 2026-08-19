import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class RsvpDto {
  @IsUUID()
  token!: string;

  @IsBoolean()
  attendance!: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  guestCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class GuestbookDto {
  @IsOptional()
  @IsUUID()
  guestToken?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;
}
