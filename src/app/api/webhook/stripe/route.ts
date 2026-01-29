import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserSubscription, removeUserSubscription } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const discordWebhookUrl = process.env.DISCORD_OPERATIONS_WEBHOOK_URL;

async function notifyDiscord(message: {
  title: string;
  description: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
}) {
  if (!discordWebhookUrl) return;

  try {
    await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Stripe',
        embeds: [
          {
            title: message.title,
            description: message.description,
            color: message.color,
            fields: message.fields || [],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (error) {
    console.error('Discord notification failed:', error);
  }
}

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

        await notifyDiscord({
          title: 'New Subscriber',
          description: `A new subscription has been created`,
          color: 0x00ff00, // Green
          fields: [
            { name: 'Subscription ID', value: subscription.id, inline: true },
            { name: 'Status', value: subscription.status, inline: true },
            {
              name: 'Customer',
              value: subscription.customer as string,
              inline: true,
            },
          ],
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await removeUserSubscription(subscription.metadata.userId!);

        await notifyDiscord({
          title: 'Subscription Canceled',
          description: `A subscription has been canceled`,
          color: 0xff0000, // Red
          fields: [
            { name: 'Subscription ID', value: subscription.id, inline: true },
            {
              name: 'Customer',
              value: subscription.customer as string,
              inline: true,
            },
          ],
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const amountRefunded = (charge.amount_refunded / 100).toFixed(2);

        await notifyDiscord({
          title: 'Refund Issued',
          description: `A refund of $${amountRefunded} ${charge.currency.toUpperCase()} has been processed`,
          color: 0xffa500, // Orange
          fields: [
            { name: 'Charge ID', value: charge.id, inline: true },
            {
              name: 'Amount',
              value: `$${amountRefunded} ${charge.currency.toUpperCase()}`,
              inline: true,
            },
            {
              name: 'Customer',
              value: (charge.customer as string) || 'N/A',
              inline: true,
            },
          ],
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
