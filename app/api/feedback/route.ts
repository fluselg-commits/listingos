import { Resend } from "resend";

export const runtime = "nodejs";

const SUPPORT_EMAIL = "support.listingos@gmail.com";

export async function POST(req: Request) {
  try {
    const { rating, message, email, plan } = await req.json();

    const cleanMessage = String(message || "").trim();
    const numericRating = Number(rating);

    if (!cleanMessage) {
      return Response.json(
        { error: "Bitte schreibe ein Feedback." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return Response.json(
        { error: "Ungültige Sternebewertung." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json(
        { error: "RESEND_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "ListingOS Feedback <onboarding@resend.dev>",
      to: SUPPORT_EMAIL,
      subject: `Neues ListingOS Feedback: ${numericRating}/5 Sterne`,
      text: `
Neues Feedback für ListingOS

Bewertung: ${numericRating}/5 Sterne
Nutzer-E-Mail: ${email || "nicht angegeben"}
Plan: ${plan || "unbekannt"}

Feedback:
${cleanMessage}
      `.trim(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Feedback konnte nicht gesendet werden.",
      },
      { status: 500 }
    );
  }
}
