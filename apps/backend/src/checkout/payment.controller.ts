import { Body, Controller, Post, Headers } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { CreateCheckoutDto } from "./dto/create-checkout.dto";
import { TenantService } from "../tenant/tenant.service";
import { NotificationService } from "../notification/notification.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("checkout")
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly tenantService: TenantService,
    private readonly notificationService: NotificationService,
  ) {}

  @Public()
  @Post()
  async create(@Body() dto: CreateCheckoutDto) {
    return this.paymentService.createCheckout(dto);
  }

  @Public()
  @Post("callback")
  async callback(
    @Headers("x-callback-token") callbackToken: string,
    @Body() body: { id: string; external_id: string; status: string },
  ) {
    const expectedToken = process.env.XENDIT_CALLBACK_TOKEN;
    if (callbackToken !== expectedToken) {
      return { ok: false };
    }

    if (body.status !== "PAID") return { ok: false };

    const payment = await this.paymentService.handlePaidCallback(body.id);
    const result = await this.tenantService.createTenantOnPayment(payment);
    await this.notificationService.sendCredentials(
      payment.userEmail,
      payment.userName,
      result.password,
      result.slug,
    );

    return { ok: true };
  }
}
