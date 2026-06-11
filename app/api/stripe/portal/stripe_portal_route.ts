import Stripe from "stripe";
import { createSupabaseAdminClient } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

async function findStripeCustomerByEmail(email: string) {
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  });

  return customers.data[0] || null;
}

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json(
        { error: "STRIPE_SECRET_KEY fehlt." },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json(
        { error: "Bitte logge dich ein." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseAdminClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user?.email) {
      return Response.json(
        { error: "Login konnte nicht geprüft werden." },
        { status: 401 }
      );
    }

    const customer = await findStripeCustomerByEmail(user.email);

    if (!customer) {
      return Response.json(
        {
          error:
            "Für diesen Account wurde noch kein Stripe-Kunde gefunden. Kaufe zuerst ein Abo oder kontaktiere den Support.",
        },
        { status: 404 }
      );
    }

    const origin = req.headers.get("origin") || "https://listingos-96og.vercel.app";

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: origin,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Kundenportal konnte nicht erstellt werden.",
      },
      { status: 500 }
    );
  }
}
