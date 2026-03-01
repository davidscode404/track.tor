import os
import urllib.request
import json
from datetime import datetime

import fal_client
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

load_dotenv()

FAL_KEY = os.getenv("FAL_KEY")

app = FastAPI(
    title="Weather API",
    description="Rainfall and temperature forecasts via Open-Meteo, with LLM fertiliser analysis",
    version="1.0.0",
)

DEFAULT_TZ = "Europe/London"
FORECAST_DAYS = 16


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


class AnalysisResponse(BaseModel):
    generated_at: str
    recommendation: str


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


def _read(filepath: str) -> str:
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read().strip()


def _analyse_with_llm(sunlight_data: str, rainfall_data: str) -> str:
    now = datetime.now()
    prompt = f"""Based on this sunlight and rainfall data alone, what fertiliser usage would you recommend for a potato field?

Date: {now.strftime("%A, %B %d, %Y")} at {now.strftime("%H:%M:%S")}

Sunlight Data:
{sunlight_data}

Rainfall Data:
{rainfall_data}
"""

    def on_queue_update(update):
        if isinstance(update, fal_client.InProgress):
            for log in update.logs:
                print(log["message"])

    result = fal_client.subscribe(
        "openrouter/router",
        arguments={
            "prompt": prompt,
            "model": "nvidia/nemotron-nano-9b-v2:free",
        },
        with_logs=True,
        on_queue_update=on_queue_update,
    )

    return result.get("output", "")


# ── individual endpoints ───────────────────────────────────────────────────────
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

    _save("sunlight_data.txt", results)
    return results


# ── combined analysis endpoint ─────────────────────────────────────────────────
@app.get("/analyse", response_model=AnalysisResponse, summary="Fetch weather data and get LLM fertiliser recommendation")
def analyse(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    timezone: str = Query(DEFAULT_TZ, description="IANA timezone string"),
    midday_only: bool = Query(True, description="Rainfall: return only the 12:00 reading per day"),
):
    """
    1. Fetches rainfall data → saves to **rainfall_data.txt**
    2. Fetches temperature data → saves to **sunlight_data.txt**
    3. Passes both files to the LLM and returns a fertiliser recommendation.
    """
    # Step 1 — rainfall
    get_rainfall(latitude=latitude, longitude=longitude, timezone=timezone, midday_only=midday_only)

    # Step 2 — temperature / sunlight
    get_temperature(latitude=latitude, longitude=longitude, timezone=timezone)

    # Step 3 — read saved files and analyse
    sunlight_data = _read("sunlight_data.txt")
    rainfall_data = _read("rainfall_data.txt")

    recommendation = _analyse_with_llm(sunlight_data, rainfall_data)

    return AnalysisResponse(
        generated_at=datetime.now().strftime("%A, %B %d, %Y at %H:%M:%S"),
        recommendation=recommendation,
    )