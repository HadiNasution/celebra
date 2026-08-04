import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsObject } from "class-validator";

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  htmlBundle!: string;

  @IsOptional()
  @IsString()
  cssBundle?: string;

  @IsOptional()
  @IsString()
  jsBundle?: string;

  @IsObject()
  jsonSchema!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  previewImage?: string;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}
