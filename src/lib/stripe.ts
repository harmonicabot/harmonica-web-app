'use server';

import Stripe from 'stripe';

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
    // Get the base URL from the current window location
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/stripe/create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        returnUrl,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const data = await response.json();
    return { url: data.url };
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    throw error;
  }
}

export async function createStripePortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    console.log('[Server] Stripe portal session created:', session.id);
    return { url: session.url };
  } catch (error) {
    console.error('[Server] Error creating portal session:', error);
    throw error;
  }
}
