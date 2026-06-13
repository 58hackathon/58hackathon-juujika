import "dotenv/config";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

const apiKey = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";

if (!apiKey || apiKey === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
  console.error("NG: GEMINI_API_KEY is not configured in backend/.env");
  process.exit(1);
}

const result = await checkGeminiConnection(apiKey, model);

if (result.ok) {
  console.log(`OK: Gemini API connected`);
  console.log(`model: ${model}`);
  console.log(`response: ${result.text}`);
  process.exit(0);
}

console.error("NG: Gemini API connection failed");
console.error(`model: ${model}`);
console.error(`status: ${result.status}`);
console.error(`message: ${result.message}`);
process.exit(1);

async function checkGeminiConnection(
  key: string,
  modelName: string
): Promise<
  | {
      ok: true;
      text: string;
    }
  | {
      ok: false;
      status: number | string;
      message: string;
    }
> {
  const modelPath = modelName.startsWith("models/")
    ? modelName
    : `models/${modelName}`;
  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent`
  );
  endpoint.searchParams.set("key", key);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Return only this JSON: {"ok":true}',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = (await response.json()) as GeminiGenerateContentResponse;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: data.error?.message ?? response.statusText,
      };
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? "";

    if (!text) {
      return {
        ok: false,
        status: "empty_response",
        message: "Gemini returned an empty response.",
      };
    }

    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      status: "request_error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
