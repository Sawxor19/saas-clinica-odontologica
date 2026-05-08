import Stripe from "stripe";
import { getEnv } from "@/server/config/env";

const env = getEnv();

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});
