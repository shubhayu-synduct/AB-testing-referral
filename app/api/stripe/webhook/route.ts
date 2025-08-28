import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Helper function to determine interval from price ID
const getIntervalFromPriceId = (priceId: string): string => {
  if (priceId === process.env.STRIPE_PRICE_STUDENT_MONTHLY || 
      priceId === process.env.STRIPE_PRICE_CLINICIAN_MONTHLY) {
    return 'monthly';
  } else if (priceId === process.env.STRIPE_PRICE_STUDENT_YEARLY || 
             priceId === process.env.STRIPE_PRICE_CLINICIAN_YEARLY) {
    return 'yearly';
  } else if (priceId === process.env.STRIPE_PRICE_CLINICIAN_BIYEARLY) {
    return 'biyearly';
  }
  return 'unknown';
};

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const sig = headersList.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('[Webhook] Signature error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    // Log to both console AND Firebase so you can see what's happening
    const webhookLog = {
      event: event.type,
      timestamp: new Date().toISOString(),
      message: `Webhook started processing ${event.type}`,
      data: {
        eventType: event.type,
        objectType: typeof event.data.object,
        objectKeys: Object.keys(event.data.object)
      }
    };
    
    console.log(`🚀🚀🚀 WEBHOOK STARTED - Processing event: ${event.type} 🚀🚀🚀`);
    console.log(`[Webhook] Event data object type:`, typeof event.data.object);
    console.log(`[Webhook] Event data object keys:`, Object.keys(event.data.object));
    
    // Also log to Firebase so you can see it in your database
    try {
      await db.collection('webhook_logs').add(webhookLog);
      console.log(`✅ Webhook log saved to Firebase`);
    } catch (logError) {
      console.error(`❌ Failed to save webhook log:`, logError);
    }
    
    // Handle invoice events
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Get customer to find Firebase UID and email
      const customer = await stripe.customers.retrieve(invoice.customer as string);
      const uid = (customer as any).metadata.firebaseUID;
      const customerEmail = (customer as any).email;

      console.log(`[Webhook] Invoice payment succeeded for customer: ${invoice.customer}, Firebase UID: ${uid}`);

      if (uid && customerEmail) {
        try {
          // Get user data from Firebase to get their name
          const userDoc = await db.collection('users').doc(uid).get();
          const userData = userDoc.data();
          const customerName = userData?.firstName && userData?.lastName 
            ? `${userData.firstName} ${userData.lastName}` 
            : userData?.displayName || customerEmail;

          // Send invoice via email using Stripe's invoice sending feature
          if (invoice.id) {
            await stripe.invoices.sendInvoice(invoice.id, {
              // Stripe will automatically send to the customer's email
            });
          }

          console.log(`[Webhook] Invoice ${invoice.id} sent successfully to ${customerEmail}`);
        } catch (invoiceError: any) {
          console.error('[Webhook] Error sending invoice:', invoiceError);
          // Don't fail the webhook for invoice sending errors
        }
      } else {
        console.log(`[Webhook] Skipping invoice send - missing UID (${uid}) or email (${customerEmail})`);
      }

      return NextResponse.json({ received: true });
    }

    // Handle invoice creation and other invoice events
    if (event.type === 'invoice.created' || event.type === 'invoice.finalized' || event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`[Webhook] Invoice event: ${event.type} for invoice: ${invoice.id}, amount: ${invoice.amount_due}, status: ${invoice.status}`);
      return NextResponse.json({ received: true });
    }
    
    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      console.log(`[Webhook] Processing checkout.session.completed event`);
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Get customer to find Firebase UID
      const customer = await stripe.customers.retrieve(session.customer as string);
      const uid = (customer as any).metadata.firebaseUID;
      
      if (!uid) {
        console.error('[Webhook] Missing Firebase UID for customer:', session.customer);
        return NextResponse.json({ error: 'Missing Firebase UID' }, { status: 400 });
      }
      
      // Get line items to determine plan and interval
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;
      
      if (!priceId) {
        console.error('[Webhook] Missing price ID from checkout session');
        return NextResponse.json({ error: 'Missing price ID' }, { status: 400 });
      }
      
      // Determine subscription tier and interval
      const interval = getIntervalFromPriceId(priceId);
      let subscriptionTier = 'free';
      
      if (priceId === process.env.STRIPE_PRICE_STUDENT_MONTHLY || 
          priceId === process.env.STRIPE_PRICE_STUDENT_YEARLY) {
        subscriptionTier = 'student';
      } else if (priceId === process.env.STRIPE_PRICE_CLINICIAN_MONTHLY || 
                 priceId === process.env.STRIPE_PRICE_CLINICIAN_YEARLY ||
                 priceId === process.env.STRIPE_PRICE_CLINICIAN_BIYEARLY) {
        subscriptionTier = 'clinician';
      }
      
      // Calculate expiry date using same logic as other webhook events
      const now = new Date();
      let expiryDate = null;
      
      if (interval === 'monthly') {
        expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).getTime();
      } else if (interval === 'yearly') {
        expiryDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).getTime();
      } else if (interval === 'biyearly') {
        expiryDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).getTime();
      }
      
      console.log(`[Webhook] Checkout completed - calculated expiry for ${subscriptionTier} ${interval}:`, {
        interval,
        now: now.toISOString(),
        expiryDate,
        expiryDateISO: expiryDate ? new Date(expiryDate).toISOString() : 'null'
      });
      
      // Update Firebase with complete subscription information
      const userRef = db.collection('users').doc(uid);
      await userRef.set({
        subscriptionTier,
        subscription: {
          status: 'active',
          checkoutSessionId: session.id,
          currentPeriodEnd: expiryDate,
          priceId,
          plan: subscriptionTier,
          interval: interval,
          cancelAtPeriodEnd: false,
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`[Webhook] Updated user ${uid} with complete subscription data: ${subscriptionTier} ${interval}, expires: ${expiryDate ? new Date(expiryDate).toISOString() : 'null'}`);
      return NextResponse.json({ received: true });
    }
    
    // Handle subscription events
    if (event.type === 'customer.subscription.created' || 
        event.type === 'customer.subscription.updated' || 
        event.type === 'customer.subscription.deleted') {
      
      const subscription = event.data.object as Stripe.Subscription;
      
      // Get customer to find Firebase UID
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      const uid = (customer as any).metadata.firebaseUID;

      console.log(`[Webhook] Customer ID: ${subscription.customer}, Firebase UID: ${uid}`);

      if (!uid) {
        console.error('[Webhook] Missing Firebase UID for customer:', subscription.customer);
        return NextResponse.json({ error: 'Missing Firebase UID' }, { status: 400 });
      }

      const userRef = db.collection('users').doc(uid);
      
      // Check if subscription has items data
      if (!subscription.items || !subscription.items.data || subscription.items.data.length === 0) {
        console.error('[Webhook] Subscription missing items data:', subscription.id);
        return NextResponse.json({ error: 'Subscription missing items data' }, { status: 400 });
      }
      
      const priceId = subscription.items.data[0].price.id;

      console.log(`[Webhook] Price ID: ${priceId}`);

      // Determine subscription tier based on price ID
      let subscriptionTier = 'free';
      if (
        priceId === process.env.STRIPE_PRICE_STUDENT_MONTHLY ||
        priceId === process.env.STRIPE_PRICE_STUDENT_YEARLY
      ) {
        subscriptionTier = 'student';
      } else if (
        priceId === process.env.STRIPE_PRICE_CLINICIAN_MONTHLY ||
        priceId === process.env.STRIPE_PRICE_CLINICIAN_YEARLY ||
        priceId === process.env.STRIPE_PRICE_CLINICIAN_BIYEARLY
      ) {
        subscriptionTier = 'clinician';
      }

      console.log(`[Webhook] Determined tier: ${subscriptionTier} for price ID: ${priceId}`);

      if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated'
      ) {
        // Handle payment failures - fallback to free
        if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
          console.log(`[Webhook] Payment failed for user ${uid}, falling back to free tier`);
          
          const updateData = {
            subscriptionTier: 'free',
            subscription: {
              id: subscription.id,
              status: subscription.status,
              plan: 'free',
              interval: 'none',
              updatedAt: new Date().toISOString()
            },
            updatedAt: new Date().toISOString(),
          };

          await userRef.set(updateData, { merge: true });
          console.log(`[Webhook] Successfully reset user ${uid} to free tier due to payment failure`);
          return NextResponse.json({ received: true });
        }
        // Use EXACTLY the same calculation method as checkout route
        const interval = getIntervalFromPriceId(priceId);
        const now = new Date();
        let expiryDate = null;
        
        if (interval === 'monthly') {
          expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).getTime();
        } else if (interval === 'yearly') {
          expiryDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).getTime();
        } else if (interval === 'biyearly') {
          expiryDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).getTime();
        }
        
        console.log(`[Webhook] Using checkout method - calculated expiry for ${subscriptionTier} ${interval}:`, {
          interval,
          now: now.toISOString(),
          expiryDate,
          expiryDateISO: expiryDate ? new Date(expiryDate).toISOString() : 'null'
        });
        
        // Determine the actual status to show in Firebase
        let displayStatus = subscription.status;
        if (subscription.cancel_at_period_end) {
          displayStatus = 'canceled'; // Override status to show as cancelled
        }

        const updateData = {
          subscriptionTier,
          subscription: {
            id: subscription.id,
            status: displayStatus, // Use our calculated status
            currentPeriodEnd: expiryDate,  // Use same variable name as checkout
            priceId,
            plan: subscriptionTier,
            interval: interval,
            cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
          },
          updatedAt: new Date().toISOString(),
        };

        console.log(`[Webhook] Updating user ${uid} with data:`, updateData);

        await userRef.set(updateData, { merge: true });
        
        console.log(`[Webhook] Successfully updated user ${uid} to tier: ${subscriptionTier}`);
      }

      if (event.type === 'customer.subscription.deleted') {
        const updateData = {
          subscriptionTier: 'free',
          subscription: null,
          updatedAt: new Date().toISOString(),
        };

        console.log(`[Webhook] Resetting user ${uid} to free tier`);

        await userRef.set(updateData, { merge: true });
        
        console.log(`[Webhook] Successfully reset user ${uid} to free tier`);
      }
    }

    // Log webhook completion
    const completionLog = {
      event: event.type,
      timestamp: new Date().toISOString(),
      message: `Webhook completed successfully for ${event.type}`,
      status: 'success'
    };
    
    try {
      await db.collection('webhook_logs').add(completionLog);
      console.log(`✅ Webhook completion log saved to Firebase`);
    } catch (logError) {
      console.error(`❌ Failed to save completion log:`, logError);
    }
    
    console.log(`🎉🎉🎉 WEBHOOK COMPLETED SUCCESSFULLY for ${event.type} 🎉🎉🎉`);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    // Log webhook errors
    const errorLog = {
      event: event.type || 'unknown',
      timestamp: new Date().toISOString(),
      message: `Webhook error: ${error.message}`,
      error: error.toString(),
      status: 'error'
    };
    
    try {
      await db.collection('webhook_logs').add(errorLog);
      console.log(`✅ Webhook error log saved to Firebase`);
    } catch (logError) {
      console.error(`❌ Failed to save error log:`, logError);
    }
    
    console.error('[Webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}