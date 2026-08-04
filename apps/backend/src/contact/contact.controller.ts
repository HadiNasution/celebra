import { Body, Controller, Post } from "@nestjs/common";

class ContactDto {
  name!: string;
  email!: string;
  message!: string;
}

@Controller("contact")
export class ContactController {
  @Post()
  submit(@Body() body: ContactDto) {
    console.log("[Contact]", body.email);
    return { success: true };}
}
