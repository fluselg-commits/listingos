import OpenAI from "openai";
import { LISTING_PROMPT } from "../../../prompts/listing-prompt";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY fehlt in .env.local." },
        { status: 500 }
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
          content: [
            { type: "input_text", text: prompt },
            ...imageInputs,
          ],
        },
      ],
    });

    const json = extractJson(response.output_text);
    return Response.json(json);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Analyse fehlgeschlagen." },
      { status: 500 }
    );
  }
}
