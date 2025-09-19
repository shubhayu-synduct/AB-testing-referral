import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { action, userId, sessionId } = await req.json();

    if (action === 'check-test-subscriptions') {
      // Find all subscriptions created with test cards in live mode
      const subscriptionLogs = await db.collection('subscription_logs')
        .where('success', '==', true)
        .where('livemode', '==', true)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      const testSubscriptions = [];
      
      for (const doc of subscriptionLogs.docs) {
        const logData = doc.data();
        
        // Check if this was created with a test card
        try {
          const session = await stripe.checkout.sessions.retrieve(logData.sessionId);
          if (session.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
            if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
              const charge = paymentIntent.charges.data[0];
              if (charge.payment_method_details?.card?.last4 === '4242') {
                testSubscriptions.push({
                  logId: doc.id,
                  userId: logData.userId,
                  sessionId: logData.sessionId,
                  subscriptionTier: logData.subscriptionTier,
                  timestamp: logData.timestamp,
                  paymentStatus: logData.paymentStatus
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error checking session ${logData.sessionId}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        testSubscriptions,
        count: testSubscriptions.length
      });

    } else if (action === 'revert-subscription' && userId) {
      // Revert a specific user's subscription back to free
      const userRef = db.collection('users').doc(userId);
      
      await userRef.set({
        subscriptionTier: 'free',
        subscription: {
          status: 'cancelled',
          reason: 'reverted_due_to_test_card_usage',
          revertedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Log the reversion
      await db.collection('subscription_logs').add({
        event: 'subscription_reverted',
        userId,
        reason: 'test_card_usage_in_live_mode',
        timestamp: new Date().toISOString(),
        success: true
      });

      return NextResponse.json({
        success: true,
        message: `Subscription reverted for user ${userId}`
      });

    } else if (action === 'revert-all-test-subscriptions') {
      // Revert all subscriptions created with test cards
      const subscriptionLogs = await db.collection('subscription_logs')
        .where('success', '==', true)
        .where('livemode', '==', true)
        .get();

      let revertedCount = 0;
      const errors = [];

      for (const doc of subscriptionLogs.docs) {
        const logData = doc.data();
        
        try {
          const session = await stripe.checkout.sessions.retrieve(logData.sessionId);
          if (session.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
            if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
              const charge = paymentIntent.charges.data[0];
              if (charge.payment_method_details?.card?.last4 === '4242') {
                // Revert this subscription
                const userRef = db.collection('users').doc(logData.userId);
                await userRef.set({
                  subscriptionTier: 'free',
                  subscription: {
                    status: 'cancelled',
                    reason: 'reverted_due_to_test_card_usage',
                    revertedAt: new Date().toISOString()
                  },
                  updatedAt: new Date().toISOString()
                }, { merge: true });

                // Log the reversion
                await db.collection('subscription_logs').add({
                  event: 'subscription_reverted',
                  userId: logData.userId,
                  sessionId: logData.sessionId,
                  reason: 'test_card_usage_in_live_mode',
                  timestamp: new Date().toISOString(),
                  success: true
                });

                revertedCount++;
              }
            }
          }
        } catch (error) {
          errors.push({
            userId: logData.userId,
            sessionId: logData.sessionId,
            error: error.message
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Reverted ${revertedCount} subscriptions`,
        revertedCount,
        errors
      });

    } else {
      return NextResponse.json({
        error: 'Invalid action. Use: check-test-subscriptions, revert-subscription, or revert-all-test-subscriptions'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in cleanup-subscriptions:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
