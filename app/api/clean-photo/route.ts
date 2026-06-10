import OpenAI from "openai";
import sharp from "sharp";
import { readFile } from "fs/promises";
import path from "path";

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

type ProductImageDecision = {
  index: number;
  useForProductPhoto: boolean;
  reason: string;
};

async function detectProductImages(files: File[]) {
  if (!process.env.OPENAI_API_KEY) {
    return files.map((_, index) => ({
      index,
      useForProductPhoto: true,
      reason: "Kein OpenAI-Key für Vorprüfung vorhanden.",
    }));
  }

  const imageInputs: ImageInput[] = await Promise.all(
    files.map(async (file) => {
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
Du bist ein Bildsortierer für Vinted-Produktfotos.

Entscheide für jedes hochgeladene Bild, ob es als Produktbild bereinigt werden soll.

Produktbilder sind:
- Vorderseite eines Kleidungsstücks
- Rückseite eines Kleidungsstücks
- getragenes oder liegendes Kleidungsstück
- sichtbares Kleidungsstück als Hauptmotiv

NICHT als Produktbild verwenden:
- reines Etikettfoto
- Waschzettel
- Größenlabel
- Nahaufnahme von Tag/Label ohne ganzen Artikel
- verschwommene Detailfotos
- Screenshots
- Verpackung ohne Kleidung

Antworte ausschließlich als JSON.

JSON-Schema:
{
  "images": [
    {
      "index": 0,
      "useForProductPhoto": true,
      "reason": "Vorderseite des Kleidungsstücks"
    }
  ]
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
  return (json.images || []) as ProductImageDecision[];
}

async function removeBackgroundWithPhotoRoom(file: File, apiKey: string) {
  const photoRoomForm = new FormData();
  photoRoomForm.append("image_file", file);
  photoRoomForm.append("format", "png");

  const response = await fetch("https://sdk.photoroom.com/v1/segment", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
    },
    body: photoRoomForm,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PhotoRoom Fehler: ${errorText || response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function placeOnListingOsFloor(productPng: Buffer) {
  const outputWidth = 1024;
  const outputHeight = 1365;

  const floorPath = path.join(process.cwd(), "public", "listingos-floor.png");
  const floorBuffer = await readFile(floorPath);

  const background = await sharp(floorBuffer)
    .resize(outputWidth, outputHeight, { fit: "cover" })
    .png()
    .toBuffer();

  const productMeta = await sharp(productPng).metadata();

  const maxProductWidth = Math.round(outputWidth * 0.84);
  const maxProductHeight = Math.round(outputHeight * 0.82);

  const product = await sharp(productPng)
    .resize(maxProductWidth, maxProductHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const resizedMeta = await sharp(product).metadata();
  const productWidth = resizedMeta.width || maxProductWidth;
  const productHeight = resizedMeta.height || maxProductHeight;

  const left = Math.round((outputWidth - productWidth) / 2);
  const top = Math.round((outputHeight - productHeight) / 2);

  const shadow = await sharp(product)
    .ensureAlpha()
    .extractChannel("alpha")
    .blur(18)
    .linear(0.34, 0)
    .toColourspace("b-w")
    .png()
    .toBuffer();

  const shadowSvg = Buffer.from(
    `<svg width="${productWidth}" height="${productHeight}">
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.32)"/>
    </svg>`
  );

  const shadowColored = await sharp(shadow)
    .composite([{ input: shadowSvg, blend: "in" }])
    .png()
    .toBuffer();

  return sharp(background)
    .composite([
      {
        input: shadowColored,
        left: left + 10,
        top: top + 16,
      },
      {
        input: product,
        left,
        top,
      },
    ])
    .png()
    .toBuffer();
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.PHOTOROOM_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "PHOTOROOM_API_KEY fehlt in .env.local." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("images") as File[];
    const validFiles = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 6);

    if (!validFiles.length) {
      return Response.json(
        { error: "Bitte lade mindestens ein Produktbild hoch." },
        { status: 400 }
      );
    }

    const decisions = await detectProductImages(validFiles);
    const allowedIndexes = decisions
      .filter((item) => item.useForProductPhoto)
      .map((item) => item.index);

    const productFiles = validFiles.filter((_, index) =>
      allowedIndexes.includes(index)
    );

    if (!productFiles.length) {
      return Response.json(
        {
          error:
            "Ich habe nur Label-/Detailbilder erkannt. Bitte lade mindestens ein ganzes Produktfoto hoch.",
          skipped: decisions,
        },
        { status: 400 }
      );
    }

    const images = await Promise.all(
      productFiles.map(async (file) => {
        const transparentProduct = await removeBackgroundWithPhotoRoom(file, apiKey);
        const finalImage = await placeOnListingOsFloor(transparentProduct);
        const base64 = finalImage.toString("base64");

        return {
          image: `data:image/png;base64,${base64}`,
          originalName: file.name,
        };
      })
    );

    return Response.json({
      images,
      skipped: decisions.filter((item) => !item.useForProductPhoto),
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Fotos konnten nicht bereinigt werden.",
      },
      { status: 500 }
    );
  }
}
