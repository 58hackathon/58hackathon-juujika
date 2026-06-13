export type UserPlan = "free" | "lite" | "plus";

export type ShippingAddress = {
  postalCode: string;
  prefectureCity: string;
  addressLine: string;
  building?: string;
};

export type RegisteredUser = {
  id: string;
  username: string;
  email: string;
  plan: UserPlan;
  shippingAddress: ShippingAddress;
  createdAt: string;
};

export type RegisterUserInput = {
  username: string;
  email: string;
  password: string;
  plan: UserPlan;
  shippingAddress: ShippingAddress;
};
