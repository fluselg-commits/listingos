import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { STUDIO_PROMPT } from "../../../prompts/studio-prompt";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ViewMode = "auto" | "front" | "back";

function getPerspectiveRules(viewMode: ViewMode) {
  if (viewMode === "front") {
    return `
PERSPEKTIVE:
- ERZWINGE VORDERANSICHT.
- Das Model muss von vorne gezeigt werden.
- Die Vorderseite des Kleidungsstücks muss sichtbar sein.
- Keine Rückenansicht, auch wenn ein Rückseitenfoto hochgeladen wurde.
- Das Gesicht darf trotzdem nicht sichtbar sein: Kopf leicht nach unten, Cap tief, Gesicht verdeckt oder oberhalb des Bildausschnitts.
`;
  }

  if (viewMode === "back") {
    return `
PERSPEKTIVE:
- ERZWINGE RÜCKENANSICHT.
- Das Model muss von hinten gezeigt werden.
- Die Rückseite des Kleidungsstücks muss sichtbar sein.
- Nutze diese Ansicht besonders für Backprints, große Rückenmotive oder relevante Rückseiten-Details.
- Gesicht darf nicht sichtbar sein.
`;
  }

  return `
PERSPEKTIVE — IDIOTENSICHERE AUTO-REGEL:
- Die VORDERANSICHT ist der absolute Standard.
- Wähle IMMER die Vorderansicht, außer es gibt einen eindeutig sichtbaren Backprint.
- Ein hochgeladenes Foto von der Rückseite bedeutet NICHT, dass die Rückseite gezeigt werden soll.
- Eine schlichte Rückseite ohne Druck, Logo, Schriftzug, Grafik oder auffälliges Designmerkmal darf NIEMALS als Rückenansicht dargestellt werden.
- Rückenansicht ist NUR erlaubt, wenn auf der Rückseite klar und groß erkennbar ein Print, Schriftzug, Logo, Motiv oder relevantes Hauptdesign vorhanden ist.
- Wenn Vorderseite und Rückseite beide schlicht sind: IMMER Vorderansicht.
- Wenn du unsicher bist: IMMER Vorderansicht.
- Wenn nur Nähte, Kragen, Falten, Etikett oder normale Stoffstruktur sichtbar sind: KEIN Backprint, also Vorderansicht.
`;
}

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
    const rawViewMode = String(formData.get("viewMode") || "auto");
    const viewMode: ViewMode = ["auto", "front", "back"].includes(rawViewMode)
      ? (rawViewMode as ViewMode)
      : "auto";

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
${STUDIO_PROMPT}

${getPerspectiveRules(viewMode)}

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
      { error: error instanceof Error ? error.message : "Studio-Bild fehlgeschlagen." },
      { status: 500 }
    );
  }
}
