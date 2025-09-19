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

    // Create checkout session with tax configuration
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/profile?tab=subscription&status=cancelled`,
      metadata: {
        firebaseUID: uid,
        plan,
        interval,
      },
      // Enable automatic tax calculation
      automatic_tax: {
        enabled: true,
      },
      // Set customer's tax exempt status (if applicable)
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      // Enable tax ID collection for business customers
      tax_id_collection: {
        enabled: true,
      },
      // Configure billing address collection
      billing_address_collection: 'required',
    });

    // SECURITY FIX: Do NOT update Firebase database here!
    // The subscription tier should ONLY be updated by the webhook after successful payment.
    // Updating it here allows users to get premium access without paying.
    
    console.log(`[Checkout] Created checkout session ${session.id} for user ${uid}. Database will only be updated after successful payment via webhook.`);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
