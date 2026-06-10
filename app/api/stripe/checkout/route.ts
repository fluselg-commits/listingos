import Stripe from "stripe";
import { createSupabaseAdminClient } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const PRICE_IDS = {
  creator: process.env.STRIPE_CREATOR_PRICE_ID,
  power_seller: process.env.STRIPE_POWER_SELLER_PRICE_ID,
};

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

    const body = (await req.json()) as { plan?: "creator" | "power_seller" };
const plan = body.plan;

    if (plan !== "creator" && plan !== "power_seller") {
      return Response.json(
        { error: "Ungültiger Plan." },
        { status: 400 }
      );
    }

    const priceId = PRICE_IDS[plan];

    if (!priceId) {
      return Response.json(
        { error: "Stripe Price ID fehlt." },
        { status: 500 }
      );
    }

    const origin = req.headers.get("origin") || "https://listingos-96og.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}?checkout=success`,
      cancel_url: `${origin}?checkout=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Checkout konnte nicht gestartet werden.",
      },
      { status: 500 }
    );
  }
}
