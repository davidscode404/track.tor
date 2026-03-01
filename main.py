import io
import json
import urllib.request

import torch
import torch.nn as nn
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from torchvision import models, transforms

app = FastAPI(
    title="Track-Tor API",
    description="Weather forecasts, rainfall, temperature, and crop image inference",
    version="1.0.0",
)

# Allow Next.js dev server to call this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DEFAULT_TZ = "Europe/London"
FORECAST_DAYS = 16


# ── image inference ────────────────────────────────────────────────────────────
def load_model(ckpt_path: str):
    ckpt = torch.load(ckpt_path, map_location=DEVICE)
    classes = ckpt["classes"]
    img_size = ckpt["img_size"]

    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, len(classes))
    model.load_state_dict(ckpt["model_state"])
    model.eval().to(DEVICE)

    tfm = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    return model, classes, tfm


MODELS = {
    "lettuce": load_model("lettuce_efficientnetb0.pt"),
    "potato": load_model("potato_efficientnetb0.pt"),
}


# ── response models ────────────────────────────────────────────────────────────
class RainfallEntry(BaseModel):
    time: str
    precipitation_mm: float
    rain_mm: float
    snowfall_cm: float


class TemperatureEntry(BaseModel):
    time: str
    temperature_c: float
    feels_like_c: float


# ── helpers ────────────────────────────────────────────────────────────────────
def _fetch(url: str) -> dict:
    try:
        with urllib.request.urlopen(url) as response:
            return json.loads(response.read())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Upstream error: {exc}")


def _save(filename: str, records: list[BaseModel]) -> None:
    with open(filename, "w") as f:
        for record in records:
            f.write(record.model_dump_json() + "\n")


# ── endpoints ──────────────────────────────────────────────────────────────────
@app.get("/rainfall", response_model=list[RainfallEntry], summary="16-day rainfall forecast")
def get_rainfall(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    timezone: str = Query(DEFAULT_TZ, description="IANA timezone string"),
    midday_only: bool = Query(True, description="Return only the 12:00 reading per day"),
):
    """
    Returns hourly precipitation, rain, and snowfall data.
    Set **midday_only=false** to get all hourly readings.
    Results are also saved to rainfall_data.txt.
    """
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude}"
        f"&longitude={longitude}"
        "&hourly=precipitation,rain,snowfall"
        f"&forecast_days={FORECAST_DAYS}"
        f"&timezone={timezone}"
    )
    data = _fetch(url)
    hourly = data["hourly"]

    results = []
    for i, time in enumerate(hourly["time"]):
        if midday_only and "12:00" not in time:
            continue
        results.append(
            RainfallEntry(
                time=time,
                precipitation_mm=hourly["precipitation"][i],
                rain_mm=hourly["rain"][i],
                snowfall_cm=hourly["snowfall"][i],
            )
        )

    _save("rainfall_data.txt", results)
    return results


@app.get("/temperature", response_model=list[TemperatureEntry], summary="16-day temperature forecast")
def get_temperature(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    timezone: str = Query(DEFAULT_TZ, description="IANA timezone string"),
):
    """
    Returns hourly 2 m temperature and apparent (feels-like) temperature.
    Results are also saved to sunlight_data.txt.
    """
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude}"
        f"&longitude={longitude}"
        "&hourly=temperature_2m,apparent_temperature"
        f"&forecast_days={FORECAST_DAYS}"
        f"&timezone={timezone}"
    )
    data = _fetch(url)
    hourly = data["hourly"]

    results = [
        TemperatureEntry(
            time=time,
            temperature_c=hourly["temperature_2m"][i],
            feels_like_c=hourly["apparent_temperature"][i],
        )
        for i, time in enumerate(hourly["time"])
    ]


@app.get("/health")
def health():
    return {"status": "ok", "device": DEVICE}


@app.post("/predict")
@torch.no_grad()
async def predict(crop: str = Form(...), file: UploadFile = File(...)):
    crop = crop.lower().strip()
    if crop not in MODELS:
        raise HTTPException(
            status_code=400,
            detail="crop must be 'lettuce' or 'potato'",
        )

    model, classes, tfm = MODELS[crop]

    img_bytes = await file.read()
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    x = tfm(img).unsqueeze(0).to(DEVICE)
    logits = model(x)
    probs = torch.softmax(logits, dim=1)[0]
    idx = int(probs.argmax().item())

    return {
        "crop": crop,
        "prediction": classes[idx],
        "confidence": float(probs[idx]),
        "classes": classes,
    }

    _save("sunlight_data.txt", results)
    return results