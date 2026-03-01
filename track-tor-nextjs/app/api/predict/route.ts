import { NextResponse } from "next/server";

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const crop = formData.get("crop");
    const file = formData.get("file");

    if (!crop || typeof crop !== "string") {
      return NextResponse.json(
        { error: "crop is required (lettuce or potato)" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    const proxyFormData = new FormData();
    proxyFormData.set("crop", crop.trim().toLowerCase());
    proxyFormData.set("file", file);

    const res = await fetch(`${BASE_URL}/predict`, {
      method: "POST",
      body: proxyFormData,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail ?? data.error ?? "Prediction failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reach prediction service. Ensure the Python API is running.",
      },
      { status: 500 }
    );
  }
}
