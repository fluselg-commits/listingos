import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { PHOTO_OPTIMIZER_PROMPT } from "../../../prompts/photoOptimizerPrompt";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const notes = String(formData.get("notes") || "").trim();

    const validFiles = files.filter((file) => file.type.startsWith("image/"));

    if (!validFiles.length) {
      return Response.json(
        { error: "Bitte lade mindestens ein Produktbild hoch." },
        { status: 400 }
      );
    }

    const sourceFile = validFiles[0];
    const buffer = Buffer.from(await sourceFile.arrayBuffer());

    const image = await toFile(buffer, sourceFile.name || "product.png", {
      type: sourceFile.type || "image/png",
    });

    const prompt = `
${PHOTO_OPTIMIZER_PROMPT}

Zusatzinfos des Nutzers:
${notes || "keine"}
`;

    const result = await client.images.edit({
      model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      image,
      prompt,
      size: "1024x1536",
      quality: "medium",
    });

    const b64 = result.data?.[0]?.b64_json;

    if (!b64) {
      return Response.json(
        { error: "Kein Bild von der API erhalten." },
        { status: 500 }
      );
    }

    return Response.json({ image: `data:image/png;base64,${b64}` });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Foto-Optimierung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
