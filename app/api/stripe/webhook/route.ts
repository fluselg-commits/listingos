import Stripe from "stripe";
import { createSupabaseAdminClient } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const CREATOR_PRICE_ID = process.env.STRIPE_CREATOR_PRICE_ID;
const POWER_SELLER_PRICE_ID = process.env.STRIPE_POWER_SELLER_PRICE_ID;

function getPlanFromPriceId(priceId?: string | null) {
  if (!priceId) return null;

  if (priceId === CREATOR_PRICE_ID) {
    return {
      plan: "creator",
      monthly_limit: 150,
    };
  }

  if (priceId === POWER_SELLER_PRICE_ID) {
    return {
      plan: "power_seller",
      monthly_limit: 500,
    };
  }

  return null;
}

async function updateUserPlanByEmail(email: string, plan: string, monthlyLimit: number) {
  const supabase = createSupabaseAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,email")
    .ilike("email", email)
    .limit(1);

  const profile = profiles?.[0];

  if (!profile) {
    console.warn("Kein Supabase-Profil für Stripe-E-Mail gefunden:", email);
    return;
  }

  await supabase
    .from("profiles")
    .update({
      plan,
      monthly_limit: monthlyLimit,
    })
    .eq("id", profile.id);
}

async function getCustomerEmail(customerId: string) {
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    return null;
  }

  return customer.email;
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return Response.json(
      { error: "STRIPE_WEBHOOK_SECRET fehlt." },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return Response.json(
      { error: "Stripe-Signatur fehlt." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? `Webhook-Signatur ungültig: ${error.message}`
            : "Webhook-Signatur ungültig.",
      },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const email = session.customer_details?.email || session.customer_email;

      if (!email) {
        return Response.json({ received: true, warning: "Keine E-Mail in Checkout Session." });
      }

      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 1,
      });

      const priceId = lineItems.data[0]?.price?.id;
      const plan = getPlanFromPriceId(priceId);

      if (!plan) {
        return Response.json({ received: true, warning: "Unbekannte Price ID." });
      }

      await updateUserPlanByEmail(email, plan.plan, plan.monthly_limit);
    }

    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = getPlanFromPriceId(priceId);

      if (plan && typeof subscription.customer === "string") {
        const email = await getCustomerEmail(subscription.customer);

        if (email) {
          await updateUserPlanByEmail(email, plan.plan, plan.monthly_limit);
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      if (typeof subscription.customer === "string") {
        const email = await getCustomerEmail(subscription.customer);

        if (email) {
          await updateUserPlanByEmail(email, "free", 5);
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe Webhook konnte nicht verarbeitet werden.",
      },
      { status: 500 }
    );
  }
}
