import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { logEdgeFunctionError } from "../_shared/server-error-logger.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

async function sendTransactionalEmail(supabase: any, templateName: string, recipientEmail: string, idempotencyKey: string, templateData: Record<string, any> = {}) {
  try {
    await supabase.functions.invoke('send-transactional-email', {
      body: { templateName, recipientEmail, idempotencyKey, templateData },
    });
    logStep(`Email sent: ${templateName}`, { recipientEmail });
  } catch (err) {
    logStep(`Email failed: ${templateName}`, { error: (err as Error).message });
  }
}

async function getCustomerEmail(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).email || null;
  } catch {
    return null;
  }
}

async function getCustomerName(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    return (customer as Stripe.Customer).name || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR: Missing secrets");
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    logStep("Signature verification failed", { error: (err as Error).message });
    return new Response("Invalid signature", { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        
        const userId = session.metadata?.user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        if (!userId) {
          logStep("No user_id in metadata, skipping");
          break;
        }

        logStep("Checkout completed", { userId, customerId, subscriptionId });

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const productId = subscription.items.data[0].price.product as string;

        const { data: plan } = await supabase
          .from("plans")
          .select("id, name")
          .eq("stripe_product_id", productId)
          .single();

        if (!plan) {
          logStep("No matching plan found", { productId });
          break;
        }

        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", userId)
          .limit(1)
          .maybeSingle();

        if (!workspace) {
          const { data: member } = await supabase
            .from("workspace_members")
            .select("workspace_id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();
          
          if (!member) {
            logStep("No workspace found for user", { userId });
            break;
          }
          
          await upsertSubscription(supabase, member.workspace_id, plan.id, subscription, customerId);
        } else {
          await upsertSubscription(supabase, workspace.id, plan.id, subscription, customerId);
        }

        // Send payment receipt email
        const customerEmail = await getCustomerEmail(stripe, customerId);
        const customerName = await getCustomerName(stripe, customerId);
        if (customerEmail) {
          const amount = subscription.items.data[0].price.unit_amount;
          await sendTransactionalEmail(supabase, 'payment-receipt', customerEmail, `receipt-checkout-${session.id}`, {
            customerName,
            amount: amount ? (amount / 100).toFixed(2) : '0.00',
            planName: plan.name || 'Subscription',
            date: new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
            nextBillingDate: new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', { dateStyle: 'long' }),
          });
        }

        logStep("Subscription synced to DB");
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionStatus(supabase, stripe, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from("subscriptions")
          .update({ 
            status: "canceled", 
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscription.id);
        
        if (error) logStep("Error canceling subscription", { error: error.message });
        else logStep("Subscription canceled", { subscriptionId: subscription.id });

        // Send subscription-cancelled email
        const cancelCustomerId = subscription.customer as string;
        const cancelEmail = await getCustomerEmail(stripe, cancelCustomerId);
        const cancelName = await getCustomerName(stripe, cancelCustomerId);
        if (cancelEmail) {
          const endDate = new Date(subscription.current_period_end * 1000)
            .toLocaleDateString('en-US', { dateStyle: 'long' });
          await sendTransactionalEmail(supabase, 'subscription-cancelled', cancelEmail, `sub-cancelled-${subscription.id}`, {
            name: cancelName,
            endDate,
          });
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        // Trial ending in ~3 days — send trial-expiring email
        const subscription = event.data.object as Stripe.Subscription;
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null;
        
        logStep("Trial ending soon", { 
          subscriptionId: subscription.id, 
          trialEnd: trialEnd?.toISOString(),
          customerId: subscription.customer 
        });

        const trialCustomerId = subscription.customer as string;
        const trialEmail = await getCustomerEmail(stripe, trialCustomerId);
        const trialName = await getCustomerName(stripe, trialCustomerId);
        if (trialEmail && trialEnd) {
          await sendTransactionalEmail(supabase, 'trial-expiring', trialEmail, `trial-expiring-${subscription.id}`, {
            name: trialName,
            daysLeft: 3,
            trialEndDate: trialEnd.toLocaleDateString('en-US', { dateStyle: 'long' }),
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await syncSubscriptionStatus(supabase, stripe, subscription);
          logStep("Subscription renewed via invoice", { subscriptionId: subscription.id });

          // Send payment receipt for renewals (not first checkout — that's handled above)
          if (invoice.billing_reason === 'subscription_cycle') {
            const renewCustomerId = subscription.customer as string;
            const renewEmail = await getCustomerEmail(stripe, renewCustomerId);
            const renewName = await getCustomerName(stripe, renewCustomerId);
            if (renewEmail) {
              const productId = subscription.items.data[0].price.product as string;
              const { data: plan } = await supabase
                .from("plans")
                .select("name")
                .eq("stripe_product_id", productId)
                .maybeSingle();

              await sendTransactionalEmail(supabase, 'payment-receipt', renewEmail, `receipt-${invoice.id}`, {
                customerName: renewName,
                amount: invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(2) : '0.00',
                planName: plan?.name || 'Subscription',
                invoiceId: invoice.number || invoice.id,
                date: new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
                nextBillingDate: new Date(subscription.current_period_end * 1000).toLocaleDateString('en-US', { dateStyle: 'long' }),
              });
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const { error } = await supabase
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", invoice.subscription as string);
          
          if (error) logStep("Error updating past_due", { error: error.message });
          else logStep("Subscription marked past_due", { subscriptionId: invoice.subscription });

          // Send payment-failed dunning email
          const failCustomerId = invoice.customer as string;
          const failEmail = await getCustomerEmail(stripe, failCustomerId as string);
          const failName = await getCustomerName(stripe, failCustomerId as string);
          if (failEmail) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const productId = subscription.items.data[0].price.product as string;
            const { data: plan } = await supabase
              .from("plans")
              .select("name")
              .eq("stripe_product_id", productId)
              .maybeSingle();

            await sendTransactionalEmail(supabase, 'payment-failed', failEmail, `payment-failed-${invoice.id}`, {
              customerName: failName,
              amount: invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : '0.00',
              planName: plan?.name || 'Subscription',
            });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    logStep("Error processing event", { error: (err as Error).message });
    await logEdgeFunctionError("stripe-webhook", err as Error, { eventType: event?.type });
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

async function upsertSubscription(
  supabase: any,
  workspaceId: string,
  planId: string,
  subscription: Stripe.Subscription,
  customerId: string
) {
  const status = subscription.status === "trialing" ? "trial" : subscription.status === "active" ? "active" : subscription.status;
  const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("subscriptions")
      .update({
        plan_id: planId,
        status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        trial_starts_at: trialStart,
        trial_ends_at: trialEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("subscriptions").insert({
      workspace_id: workspaceId,
      plan_id: planId,
      status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      trial_starts_at: trialStart,
      trial_ends_at: trialEnd,
    });
  }
}

async function syncSubscriptionStatus(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  const productId = subscription.items.data[0].price.product as string;
  
  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("stripe_product_id", productId)
    .single();

  if (!plan) {
    logStep("No matching plan for sync", { productId });
    return;
  }

  const status = subscription.status === "trialing" ? "trial" : subscription.status === "active" ? "active" : subscription.status;
  
  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: plan.id,
      status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) logStep("Error syncing subscription", { error: error.message });
  else logStep("Subscription synced", { subscriptionId: subscription.id, status });
}
