import { Body, Controller, Post } from "@nestjs/common";
import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { Public } from "../common/decorators/public.decorator";

class ContactDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}

@Controller("contact")
export class ContactController {
  @Public()
  @Post()
  submit(@Body() body: ContactDto) {
    return { success: true, email: body.email };
  }
}
