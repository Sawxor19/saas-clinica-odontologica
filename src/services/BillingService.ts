import type Stripe from "stripe";
import { stripe } from "@/server/billing/stripe";
import { BillingRepository } from "@/repositories/BillingRepository";

type CreateCheckoutInput = {
  userId: string;
  email: string | null;
  appUrl: string;
  priceId: string;
};

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toIsoFromUnix(unix: number | null | undefined) {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

export class BillingService {
  constructor(private readonly repository = new BillingRepository()) {}

  async createCheckoutSession(input: CreateCheckoutInput) {
    const profile = await this.repository.getBillingProfile(input.userId);
    if (!profile) {
      throw new Error("Perfil nao encontrado.");
    }

    let stripeCustomerId = profile.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: input.email ?? undefined,
        metadata: {
          user_id: input.userId,
        },
      });
      stripeCustomerId = customer.id;
      await this.repository.setStripeCustomerId(input.userId, stripeCustomerId);
    }

    const shouldApplyTrial = !profile.trial_used;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      payment_method_collection: "always",
      metadata: {
        user_id: input.userId,
      },
      subscription_data: shouldApplyTrial
        ? {
            trial_period_days: 30,
            metadata: {
              user_id: input.userId,
            },
          }
        : {
            metadata: {
              user_id: input.userId,
            },
          },
      success_url: `${input.appUrl}/billing?checkout=success`,
      cancel_url: `${input.appUrl}/billing?checkout=cancelled`,
    });

    if (!session.url) {
      throw new Error("Falha ao criar URL de checkout.");
    }

    return session.url;
  }

  async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const subscriptionId = asString(session.subscription);
    const customerId = asString(session.customer);

    if (!subscriptionId || !customerId) {
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    let userId = asString(session.metadata?.user_id) || asString(subscription.metadata?.user_id);
    if (!userId) {
      userId = await this.repository.findUserIdByStripeCustomerId(customerId);
    }

    if (!userId) {
      throw new Error("user_id nao encontrado no metadata do checkout.");
    }

    await this.repository.setStripeCustomerId(userId, customerId);
    await this.repository.updateSubscriptionByUserId(userId, {
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      trial_end: toIsoFromUnix(subscription.trial_end),
      current_period_end: toIsoFromUnix(subscription.current_period_end),
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    });

    if (subscription.trial_end) {
      await this.repository.markTrialUsed(userId);
    }
  }

  async handleCustomerSubscriptionUpdatedOrDeleted(subscription: Stripe.Subscription) {
    const customerId = asString(subscription.customer);
    let userId = asString(subscription.metadata?.user_id);

    if (!userId && customerId) {
      userId = await this.repository.findUserIdByStripeCustomerId(customerId);
    }

    if (!userId) {
      throw new Error("user_id nao encontrado para atualizar assinatura.");
    }

    if (customerId) {
      await this.repository.setStripeCustomerId(userId, customerId);
    }

    await this.repository.updateSubscriptionByUserId(userId, {
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      trial_end: toIsoFromUnix(subscription.trial_end),
      current_period_end: toIsoFromUnix(subscription.current_period_end),
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    });

    if (subscription.trial_end) {
      await this.repository.markTrialUsed(userId);
    }
  }

  async hasProcessedEvent(eventId: string) {
    return this.repository.hasProcessedStripeEvent(eventId);
  }

  async markEventProcessed(eventId: string) {
    return this.repository.insertProcessedStripeEvent(eventId);
  }
}
