# Stripe Integration Guide for Kiruvo Platform Admins

This guide explains how to set up Stripe to charge users who use Kiruvo as their CRM platform.

## Overview

Kiruvo uses Stripe to process subscription payments from your users. As the platform owner, you'll charge your users for using the CRM, not set up payments for them.

## Setup Steps

### 1. Create Stripe Products

Go to your [Stripe Products](https://dashboard.stripe.com/products) and create subscription products for your pricing tiers:

**Example Tiers:**

- **Basic Plan** - $29/month
  - Up to 100 leads
  - Basic AI features
  - Email support

- **Pro Plan** - $99/month
  - Unlimited leads
  - Advanced AI features
  - Priority support
  - Custom integrations

### 2. Generate Payment Links

For each product:

1. Click on the product in Stripe Dashboard
2. Create a price (monthly/yearly)
3. Generate a payment link
4. Copy the price ID (starts with `price_`)

### 3. Configure Your Application

Store your price IDs in your application code:

```typescript
const PRICING_TIERS = {
  basic: {
    priceId: 'price_xxxxxxxxxxxxx',
    name: 'Basic Plan',
    price: '$29/mo',
  },
  pro: {
    priceId: 'price_xxxxxxxxxxxxx',
    name: 'Pro Plan',
    price: '$99/mo',
  },
};
```

### 4. Stripe Secret Key

Your Stripe secret key is already configured in the environment variables:

- `STRIPE_SECRET_KEY` - Used by backend functions to process payments

**Never share your secret key or commit it to version control.**

## Implementation

### Backend Functions

The following edge functions handle Stripe operations:

- **create-checkout** - Creates checkout sessions for new subscriptions
- **check-subscription** - Verifies active subscriptions
- **customer-portal** - Allows users to manage their subscriptions

### User Flow

1. User signs up for Kiruvo
2. User selects a pricing tier
3. User is redirected to Stripe Checkout
4. After payment, user gains access to platform features
5. Users can manage subscriptions via Customer Portal

## Testing

Use Stripe test mode for development:

- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC

## Stripe Customer Portal

Enable the [Stripe Customer Portal](https://docs.stripe.com/customer-management/activate-no-code-customer-portal) to allow users to:

- Update payment methods
- Cancel subscriptions
- View billing history
- Download invoices

## Resources

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Checkout Documentation](https://docs.stripe.com/checkout/quickstart)
- [Subscription Billing Guide](https://docs.stripe.com/billing/subscriptions/overview)
- [Testing Documentation](https://docs.stripe.com/testing)

## Support

For technical issues:

- Check edge function logs in the Cloud tab
- Review Stripe Dashboard for payment errors
- Contact Stripe support for payment processing issues

---

**Location:** Connecticut 06850  
**Last Updated:** January 2026
