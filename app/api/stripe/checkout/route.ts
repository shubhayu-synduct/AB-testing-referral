import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const priceMap: Record<string, string> = {
  'student-monthly': process.env.STRIPE_PRICE_STUDENT_MONTHLY!,
  'student-yearly': process.env.STRIPE_PRICE_STUDENT_YEARLY!,
  'clinician-monthly': process.env.STRIPE_PRICE_CLINICIAN_MONTHLY!,
  'clinician-yearly': process.env.STRIPE_PRICE_CLINICIAN_YEARLY!,
  'clinician-biyearly': process.env.STRIPE_PRICE_CLINICIAN_BIYEARLY!,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan, interval, idToken } = body;

    if (!plan || !interval || !idToken) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify Firebase ID token
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email;

    if (!email) {
      return NextResponse.json({ error: 'Email not found in token' }, { status: 400 });
    }

    const priceId = priceMap[`${plan}-${interval}`];
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 });
    }

    // Create or retrieve Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      
      // Ensure existing customer has Firebase UID in metadata
      if (!customer.metadata.firebaseUID || customer.metadata.firebaseUID !== uid) {
        customer = await stripe.customers.update(customer.id, {
          metadata: { 
            ...customer.metadata,
            firebaseUID: uid 
          },
        });
        console.log(`Updated existing customer ${customer.id} with Firebase UID: ${uid}`);
      }
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { firebaseUID: uid },
      });
      console.log(`Created new customer ${customer.id} with Firebase UID: ${uid}`);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/profile?tab=subscription&status=cancelled`,
      metadata: {
        firebaseUID: uid,
        plan,
        interval,
      },
    });

    // Calculate expiry date based on interval
    const now = new Date();
    let expiryDate = null;
    
    if (interval === 'monthly') {
      expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).getTime();
    } else if (interval === 'yearly') {
      expiryDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).getTime();
    } else if (interval === 'biyearly') {
      expiryDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).getTime();
    }
    
    // Update Firebase with pending subscription status
    try {
      await db.collection('users').doc(uid).set({
        subscriptionTier: plan,
        subscription: {
          checkoutSessionId: session.id,
          createdAt: new Date().toISOString(),
          currentPeriodEnd: expiryDate,
          priceId: priceId
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`[Checkout] Updated Firebase for user ${uid} with pending ${plan} subscription, expires: ${expiryDate ? new Date(expiryDate).toISOString() : 'null'}`);
    } catch (firebaseError) {
      console.error('[Checkout] Firebase update error:', firebaseError);
      // Don't fail the checkout if Firebase update fails
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
