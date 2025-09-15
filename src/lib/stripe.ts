'use server';

import Stripe from 'stripe';
import { getSession } from '@auth0/nextjs-auth0';
import { getUserById, upsertUser } from './db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createStripeSession({
  userId,
  priceId,
  returnUrl,
  metadata,
}: {
  userId: string;
  priceId: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}) {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.sub;
    const user = await getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await upsertUser({
        ...user,
        stripe_customer_id: stripeCustomerId,
      });
    }

    const stripeSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${returnUrl}?stripe_success=true`,
      cancel_url: `${returnUrl}?stripe_canceled=true`,
      metadata: {
        userId,
        ...metadata,
      },
      subscription_data: {
        metadata: {
          userId,
          ...metadata,
        },
        trial_period_days: 30,
      },
    });
    console.log(
      '[Server] Stripe session created successfully:',
      stripeSession.id,
    );
    return { url: stripeSession.url as string };
  } catch (error) {
    console.error('[Server] Error creating Stripe session:', error);
    throw error;
  }
}

export async function createStripePortalSession({
  returnUrl,
}: {
  returnUrl: string;
}) {
  try {
    const session = await getSession();
    if (!session?.user) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.sub;
    const user = await getUserById(userId);
    if (!user?.stripe_customer_id) {
      throw new Error('No Stripe customer found for user');
    }

    // Validate that the customer exists in Stripe
    const customer = await stripe.customers.retrieve(user.stripe_customer_id);
    if (!customer || customer.deleted) {
      throw new Error('Invalid or deleted Stripe customer');
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: returnUrl,
    });
    console.log('[Server] Stripe portal session created:', portalSession.id);
    return { url: portalSession.url };
  } catch (error) {
    console.error('[Server] Error creating portal session:', error);
    throw error;
  }
}
