'use server';

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createStripeSession({
  userId,
  productId,
  returnUrl,
  metadata,
}: {
  userId: string;
  productId: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}) {
  const session = await stripe.checkout.sessions.create({
    line_items: [{ price: productId, quantity: 1 }],
    mode: 'payment',
    success_url: `${returnUrl}?success=true`,
    cancel_url: `${returnUrl}?canceled=true`,
    metadata: {
      userId,
      ...metadata,
    },
    payment_intent_data: {
      metadata: {
        userId,
        ...metadata,
      },
    },
  });

  return { url: session.url as string };
}
