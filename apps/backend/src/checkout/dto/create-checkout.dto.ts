import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export const PLANS = ["1_month", "3_months", "6_months", "12_months"] as const;
export type Plan = (typeof PLANS)[number];

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsIn(PLANS)
  plan!: Plan;
}

export const PLAN_PRICES: Record<Plan, number> = {
  "1_month": 9,
  "3_months": 20,
  "6_months": 35,
  "12_months": 59,
};

export const PLAN_MONTHS: Record<Plan, number> = {
  "1_month": 1,
  "3_months": 3,
  "6_months": 6,
  "12_months": 12,
};
