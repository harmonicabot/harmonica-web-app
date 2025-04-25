import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserSubscription, removeUserSubscription } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature')!;

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;

        // Calculate end date from billing cycle
        const endDate = new Date(subscription.billing_cycle_anchor * 1000);
        endDate.setMonth(endDate.getMonth());

        await updateUserSubscription(subscription.metadata.userId!, {
          subscription_status:
            subscription.status === 'active' ? 'PRO' : 'FREE',
          subscription_id: subscription.id,
          subscription_period_end: endDate,
          stripe_customer_id: subscription.customer as string,
        });
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;

        await updateUserSubscription(charge.metadata.userId, {
          subscription_status: 'FREE',
          subscription_period_end: new Date(),
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 },
    );
  }
}
