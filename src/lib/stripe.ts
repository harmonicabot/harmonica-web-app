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
    const session = await stripe.checkout.sessions.create({
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
      },
    });
    console.log('[Server] Stripe session created successfully:', session.id);
    return { url: session.url as string };
  } catch (error) {
    console.error('[Server] Error creating Stripe session:', error);
    throw error;
  }
}
