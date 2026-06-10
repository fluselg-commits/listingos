import OpenAI from "openai";
import { LISTING_PROMPT } from "../../../prompts/listing-prompt";
import { createSupabaseAdminClient } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ADMIN_EMAILS = ["connerkohls@gmail.com"];

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("Keine JSON-Antwort gefunden.");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

type ImageInput = {
  type: "input_image";
  image_url: string;
  detail: "auto";
};

type Profile = {
  id: string;
  email: string | null;
  plan: string;
  monthly_limit: number;
  listings_used: number;
  reset_at: string | null;
};

function shouldResetMonthlyCounter(resetAt: string | null) {
  if (!resetAt) return true;

  const lastReset = new Date(resetAt);
  const now = new Date();

  const oneMonthLater = new Date(lastReset);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

  return now >= oneMonthLater;
}

async function getUserAndProfile(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: "Bitte logge dich ein, bevor du ein Listing erstellst.",
      status: 401,
    } as const;
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createSupabaseAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return {
      error: "Deine Sitzung ist abgelaufen. Bitte logge dich erneut ein.",
      status: 401,
    } as const;
  }

  const email = user.email || "";
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  let profile: Profile;

  if (!existingProfile) {
    profile = {
      id: user.id,
      email,
      plan: isAdmin ? "admin" : "free",
      monthly_limit: isAdmin ? 999999 : 5,
      listings_used: 0,
      reset_at: new Date().toISOString(),
    };

    await supabase.from("profiles").insert(profile);
  } else {
    profile = existingProfile as Profile;
  }

  if (isAdmin && profile.plan !== "admin") {
    profile = {
      ...profile,
      plan: "admin",
      monthly_limit: 999999,
    };

    await supabase
      .from("profiles")
      .update({
        plan: "admin",
        monthly_limit: 999999,
      })
      .eq("id", user.id);
  }

  if (shouldResetMonthlyCounter(profile.reset_at)) {
    profile = {
      ...profile,
      listings_used: 0,
      reset_at: new Date().toISOString(),
    };

    await supabase
      .from("profiles")
      .update({
        listings_used: 0,
        reset_at: profile.reset_at,
      })
      .eq("id", user.id);
  }

  return { user, profile, supabase } as const;
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY fehlt in .env.local." },
        { status: 500 }
      );
    }

    const authResult = await getUserAndProfile(req);

    if ("error" in authResult) {
      return Response.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user, profile, supabase } = authResult;

    if (profile.listings_used >= profile.monthly_limit) {
      return Response.json(
        {
          error:
            profile.plan === "free"
              ? "Deine 5 kostenlosen Listings für diesen Monat sind aufgebraucht. Upgrade auf Creator oder Power Seller."
              : "Dein monatliches Listing-Kontingent ist aufgebraucht.",
          profile,
        },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("images") as File[];
    const extraNotes = String(formData.get("notes") || "").trim();

    const validFiles = files.filter((file) => file.type.startsWith("image/"));

    if (!validFiles.length) {
      return Response.json(
        { error: "Bitte lade mindestens ein Bild hoch." },
        { status: 400 }
      );
    }

    const imageInputs: ImageInput[] = await Promise.all(
      validFiles.slice(0, 3).map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");

        return {
          type: "input_image",
          image_url: `data:${file.type};base64,${base64}`,
          detail: "auto",
        };
      })
    );

    const prompt = `
${LISTING_PROMPT}

ZUSATZINFOS VOM NUTZER:
${extraNotes || "keine"}

AUSGABE:
Gib ausschließlich valides JSON zurück, ohne Markdown und ohne Erklärung.

JSON-Schema:
{
  "analysis": {
    "category": "",
    "brand": "",
    "size": "",
    "color": "",
    "pattern": "",
    "material": "",
    "condition": "",
    "visible_flaws": "",
    "style": "",
    "keywords": []
  },
  "listing": {
    "title": "",
    "description": "",
    "hashtags": [],
    "priceSuggestion": "",
    "kleinanzeigenTitle": "",
    "kleinanzeigenDescription": ""
  },
  "questionsForSeller": []
}
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }, ...imageInputs],
        },
      ],
    });

    const json = extractJson(response.output_text);
    const newListingsUsed = profile.listings_used + 1;

    await supabase
      .from("profiles")
      .update({
        listings_used: newListingsUsed,
      })
      .eq("id", user.id);

    return Response.json({
      ...json,
      usage: {
        plan: profile.plan,
        listings_used: newListingsUsed,
        monthly_limit: profile.monthly_limit,
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Analyse fehlgeschlagen.",
      },
      { status: 500 }
    );
  }
}
