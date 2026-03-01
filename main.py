import urllib.request
import json
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

app = FastAPI(
    title="Weather API",
    description="Rainfall and temperature forecasts via Open-Meteo",
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

    _save("sunlight_data.txt", results)
    return results