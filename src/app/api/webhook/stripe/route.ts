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

    console.log('[Webhook] Received Stripe webhook request');

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );

    console.log('[Webhook] Event type:', event.type);
    console.log(
      '[Webhook] Event data:',
      JSON.stringify(event.data.object, null, 2),
    );

    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('[Webhook] Processing subscription:', {
          id: subscription.id,
          status: subscription.status,
          metadata: subscription.metadata,
          billing_cycle_anchor: subscription.billing_cycle_anchor,
        });

        // Calculate end date from billing cycle
        const endDate = new Date(subscription.billing_cycle_anchor * 1000);
        endDate.setMonth(endDate.getMonth());

        console.log('[Webhook] Calculated end date:', endDate);

        await updateUserSubscription(subscription.metadata.userId!, {
          subscription_status:
            subscription.status === 'active' ? 'PRO' : 'FREE',
          subscription_id: subscription.id,
          subscription_period_end: endDate,
          stripe_customer_id: subscription.customer as string,
        });

        console.log(
          '[Webhook] Updated user subscription for:',
          subscription.metadata.userId,
        );
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;
        console.log('[Webhook] Processing failed charge:', {
          id: charge.id,
          metadata: charge.metadata,
        });

        await updateUserSubscription(charge.metadata.userId, {
          subscription_status: 'FREE',
          subscription_period_end: new Date(),
        });

        console.log(
          '[Webhook] Updated subscription to FREE for:',
          charge.metadata.userId,
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('[Webhook] Processing subscription deletion:', {
          id: subscription.id,
          status: subscription.status,
          metadata: subscription.metadata,
        });

        await removeUserSubscription(subscription.metadata.userId!);

        console.log(
          '[Webhook] Removed subscription for user:',
          subscription.metadata.userId,
        );
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription & {
          current_period_end: number;
        };

        console.log('[Webhook] Processing subscription update:', {
          id: subscription.id,
          status: subscription.status,
          metadata: subscription.metadata,
        });

        // Handle cancellation at period end
        if (subscription.cancel_at_period_end) {
          console.log('[Webhook] Subscription scheduled for cancellation');
        }

        // Update subscription status
        await updateUserSubscription(subscription.metadata.userId!, {
          subscription_status:
            subscription.status === 'active' ? 'PRO' : 'FREE',
          subscription_id: subscription.id,
          subscription_period_end: new Date(
            subscription.current_period_end * 1000,
          ),
          stripe_customer_id: subscription.customer as string,
        });

        console.log(
          '[Webhook] Updated subscription for user:',
          subscription.metadata.userId,
        );
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 },
    );
  }
}
