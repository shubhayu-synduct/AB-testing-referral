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

    // Handle payment failures - CRITICAL: Never update database for failed payments
    if (event.type === 'payment_intent.payment_failed' || event.type === 'invoice.payment_failed') {
      console.log(`[Webhook] Payment failed event: ${event.type}`);
      
      let customerId = null;
      let sessionId = null;
      
      if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        customerId = paymentIntent.customer;
        console.log(`[Webhook] Payment intent failed for customer: ${customerId}`);
      } else if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object as Stripe.Invoice;
        customerId = invoice.customer;
        console.log(`[Webhook] Invoice payment failed for customer: ${customerId}`);
      }
      
      // Log the payment failure
      if (customerId) {
        try {
          const customer = await stripe.customers.retrieve(customerId as string);
          const uid = (customer as any).metadata.firebaseUID;
          
          if (uid) {
            await db.collection('subscription_logs').add({
              event: 'payment_failed',
              userId: uid,
              customerId,
              sessionId,
              eventType: event.type,
              timestamp: new Date().toISOString(),
              success: false,
              reason: 'Payment failed - no subscription created'
            });
            console.log(`[Webhook] Payment failure logged for user ${uid}`);
          }
        } catch (logError) {
          console.error(`[Webhook] Failed to log payment failure:`, logError);
        }
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
      
      // CRITICAL: Check if payment was actually successful
      if (session.payment_status !== 'paid') {
        console.error(`[Webhook] Payment not successful for session ${session.id}. Payment status: ${session.payment_status}`);
        
        // Log the failed payment attempt
        try {
          const customer = await stripe.customers.retrieve(session.customer as string);
          const uid = (customer as any).metadata.firebaseUID;
          
          if (uid) {
            await db.collection('subscription_logs').add({
              event: 'payment_failed',
              userId: uid,
              sessionId: session.id,
              paymentStatus: session.payment_status,
              livemode: session.livemode,
              timestamp: new Date().toISOString(),
              success: false,
              reason: `Payment failed with status: ${session.payment_status}`
            });
            console.log(`[Webhook] Failed payment logged for user ${uid}`);
          }
        } catch (logError) {
          console.error(`[Webhook] Failed to log failed payment:`, logError);
        }
        
        return NextResponse.json({ 
          error: `Payment not successful. Status: ${session.payment_status}` 
        }, { status: 400 });
      }
      
      // Additional validation: Check if this is a test session in live mode
      if (session.livemode && session.payment_intent) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
          if (paymentIntent.status !== 'succeeded') {
            console.error(`[Webhook] Payment intent not succeeded for session ${session.id}. Status: ${paymentIntent.status}`);
            return NextResponse.json({ 
              error: `Payment intent not succeeded. Status: ${paymentIntent.status}` 
            }, { status: 400 });
          }
          console.log(`[Webhook] Payment intent verified as succeeded for session ${session.id}`);
        } catch (piError) {
          console.error(`[Webhook] Error retrieving payment intent for session ${session.id}:`, piError);
          return NextResponse.json({ 
            error: 'Error verifying payment intent' 
          }, { status: 400 });
        }
      }
      
      console.log(`[Webhook] Payment successful for session ${session.id}. Payment status: ${session.payment_status}, Live mode: ${session.livemode}`);
      
      // Log tax information if available
      if (session.total_details) {
        console.log(`[Webhook] Session tax details:`, {
          amount_tax: session.total_details.amount_tax,
          amount_discount: session.total_details.amount_discount,
          amount_shipping: session.total_details.amount_shipping,
          breakdown: session.total_details.breakdown
        });
      }
      
      // Additional security: Check for test card usage in live mode
      if (session.livemode && session.payment_intent) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
          // Get charges for this payment intent
          const charges = await stripe.charges.list({
            payment_intent: session.payment_intent as string,
            limit: 1
          });
          
          if (charges.data.length > 0) {
            const charge = charges.data[0];
            if (charge.payment_method_details?.card?.last4 === '4242') {
              console.error(`[Webhook] Test card detected in live mode for session ${session.id}. Rejecting subscription.`);
              return NextResponse.json({ 
                error: 'Test cards are not allowed in live mode' 
              }, { status: 400 });
            }
          }
        } catch (testCardError) {
          console.error(`[Webhook] Error checking for test card usage:`, testCardError);
          // Don't fail the webhook for this check, just log it
        }
      }
      
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
      
      // CRITICAL SAFETY CHECK: Double-verify payment status before database update
      if (session.payment_status !== 'paid') {
        console.error(`[Webhook] CRITICAL: Payment status changed to ${session.payment_status} before database update. Aborting subscription creation.`);
        return NextResponse.json({ 
          error: `Payment status changed to ${session.payment_status}. Subscription not created.` 
        }, { status: 400 });
      }
      
      // Additional safety: Verify payment intent one more time
      if (session.payment_intent) {
        try {
          const finalPaymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
          if (finalPaymentIntent.status !== 'succeeded') {
            console.error(`[Webhook] CRITICAL: Payment intent status changed to ${finalPaymentIntent.status} before database update. Aborting subscription creation.`);
            return NextResponse.json({ 
              error: `Payment intent status changed to ${finalPaymentIntent.status}. Subscription not created.` 
            }, { status: 400 });
          }
          console.log(`[Webhook] Final payment verification successful: ${finalPaymentIntent.status}`);
        } catch (finalPiError) {
          console.error(`[Webhook] CRITICAL: Error in final payment verification:`, finalPiError);
          return NextResponse.json({ 
            error: 'Final payment verification failed. Subscription not created.' 
          }, { status: 400 });
        }
      }
      
      console.log(`[Webhook] All payment verifications passed. Proceeding with database update for user ${uid}`);
      
      // Update Firebase with complete subscription information
      try {
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
        
        console.log(`[Webhook] Successfully updated user ${uid} with complete subscription data: ${subscriptionTier} ${interval}, expires: ${expiryDate ? new Date(expiryDate).toISOString() : 'null'}`);
      } catch (dbError) {
        console.error(`[Webhook] CRITICAL: Database update failed for user ${uid}:`, dbError);
        return NextResponse.json({ 
          error: 'Database update failed. Subscription not created.' 
        }, { status: 500 });
      }
      
      // Log successful subscription creation for monitoring
      try {
        await db.collection('subscription_logs').add({
          event: 'subscription_created',
          userId: uid,
          sessionId: session.id,
          subscriptionTier,
          interval,
          priceId,
          paymentStatus: session.payment_status,
          livemode: session.livemode,
          timestamp: new Date().toISOString(),
          success: true
        });
        console.log(`[Webhook] Subscription creation logged for user ${uid}`);
      } catch (logError) {
        console.error(`[Webhook] Failed to log subscription creation:`, logError);
      }
      
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