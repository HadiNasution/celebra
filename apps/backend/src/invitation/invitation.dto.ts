import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class CreateInvitationDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;
}

export class UpdateContentDto {
  @IsObject()
  contentJson!: Record<string, unknown>;
}
