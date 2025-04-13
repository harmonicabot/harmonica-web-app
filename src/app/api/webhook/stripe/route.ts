import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserSubscription, removeUserSubscription } from '@/lib/db';
import { sendNotification } from 'lib/notifications';

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

    // Log all webhook events
    console.log('[i] Stripe webhook event received:', {
      type: event.type,
      data: event.data.object,
    });

    switch (event.type) {
      //   case 'customer.subscription.created':
      //   case 'customer.subscription.updated': {
      //     const subscription = event.data.object as Stripe.Subscription & {
      //       current_period_end: number;
      //       status: string;
      //     };

      //     await updateUserSubscription(subscription.metadata.userId, {
      //       subscription_status:
      //         subscription.status === 'active' ? 'PRO' : 'FREE',
      //       subscription_id: subscription.id,
      //       subscription_period_end: new Date(
      //         subscription.current_period_end * 1000,
      //       ),
      //       stripe_customer_id: subscription.customer as string,
      //     });
      //     await sendNotification({
      //       userId: subscription.metadata.userId,
      //       title: 'Subscription Updated',
      //       message: `Your subscription is now ${subscription.status === 'active' ? 'active' : 'inactive'}`,
      //       type: 'success',
      //     });
      //     break;
      //   }

      //   case 'invoice.payment_failed': {
      //     const invoice = event.data.object as Stripe.Invoice & {
      //       subscription: string;
      //     };
      //     const subscription = await stripe.subscriptions.retrieve(
      //       invoice.subscription,
      //     );

      //     await updateUserSubscription(subscription.metadata.userId, {
      //       subscription_status: 'FREE',
      //       subscription_id: subscription.id,
      //       subscription_period_end: new Date(),
      //       stripe_customer_id: subscription.customer as string,
      //     });
      //     await sendNotification({
      //       userId: subscription.metadata.userId,
      //       title: 'Payment Failed',
      //       message:
      //         'Your subscription payment has failed. Please update your payment method.',
      //       type: 'error',
      //     });
      //     break;
      //   }

      //   case 'customer.subscription.deleted': {
      //     const subscription = event.data.object as Stripe.Subscription;
      //     await removeUserSubscription(subscription.metadata.userId);
      //     break;
      //   }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;

        // local testing
        // const charge = {
        //   ...(event.data.object as Stripe.Charge),
        //   metadata: {
        //     ...(event.data.object as Stripe.Charge).metadata,
        //     userId: 'google-oauth2|108710886764817686070',
        //   },
        // };

        // Check if we have userId in metadata
        if (!charge.metadata?.userId) {
          console.error('[Payment Success] No userId in metadata:', charge);
          return NextResponse.json(
            { error: 'Missing userId in charge metadata' },
            { status: 400 },
          );
        }

        // Calculate subscription end date (1 month from now)
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        await updateUserSubscription(charge.metadata.userId, {
          subscription_status: 'PRO',
          subscription_id: charge.id,
          subscription_period_end: endDate,
          stripe_customer_id: charge.customer as string,
        });

        console.log('[Payment Success]', {
          userId: charge.metadata.userId,
          chargeId: charge.id,
          amount: charge.amount,
          customer: charge.customer,
        });
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;

        await updateUserSubscription(charge.metadata.userId, {
          subscription_status: 'FREE',
          subscription_period_end: new Date(),
        });

        await sendNotification({
          userId: charge.metadata.userId,
          title: 'Payment Failed',
          message: 'Your payment failed. Please update your payment method.',
          type: 'error',
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
