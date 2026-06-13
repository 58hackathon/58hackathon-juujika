export type UserPlan = "free" | "lite" | "plus";

export type ShippingAddress = {
  postalCode: string;
  prefectureCity: string;
  addressLine: string;
  building?: string;
};

export type User = {
  id: string;
  username: string;
  email: string;
  plan: UserPlan;
  shippingAddress: ShippingAddress;
  createdAt: string;
};

export type CreateUserInput = {
  username: string;
  email: string;
  password: string;
  plan: UserPlan;
  shippingAddress: ShippingAddress;
};

export const userPlans: UserPlan[] = ["free", "lite", "plus"];
