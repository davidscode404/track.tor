import urllib.request
import json

url = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=54.43892"
    "&longitude=-2.825593"
    "&hourly=precipitation,rain,snowfall"
    "&forecast_days=16"
    "&timezone=Europe/London"
)

with urllib.request.urlopen(url) as response:
    data = json.loads(response.read())

hourly = data["hourly"]

print(f"{'Time':<20} {'Precipitation (mm)':<22} {'Rain (mm)':<15} {'Snowfall (cm)'}")
print("-" * 70)
for i, time in enumerate(hourly["time"]):
    if "12:00" in time:
        print(
            f"{time:<20} "
            f"{hourly['precipitation'][i]:<22} "
            f"{hourly['rain'][i]:<15} "
            f"{hourly['snowfall'][i]}"
        )