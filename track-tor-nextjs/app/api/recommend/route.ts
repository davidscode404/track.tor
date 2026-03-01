import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 180;

const recommendSchema = z.object({
  temperature_data: z.string().min(1),
  rainfall_data: z.string().min(1),
  crop: z.enum(["lettuce", "potato"]).default("lettuce"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = recommendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_BASE_API_URL ?? "http://127.0.0.1:8000"
    ).replace(/\/$/, "");

    const analyseRes = await fetch(`${baseUrl}/analyse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(180_000),
    });

    if (!analyseRes.ok) {
      const detail = await analyseRes.text().catch(() => "");
      return NextResponse.json(
        { error: `LLM analysis failed (${analyseRes.status}): ${detail}` },
        { status: 502 },
      );
    }

    const data = (await analyseRes.json()) as { recommendation?: string };

    return NextResponse.json({
      recommendation: data.recommendation ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to get recommendation",
      },
      { status: 500 },
    );
  }
}
