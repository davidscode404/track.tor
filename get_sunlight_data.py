import urllib.request
import json

url = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=54.43892"
    "&longitude=-2.825593"
    "&hourly=temperature_2m,apparent_temperature"
    "&forecast_days=16"
    "&timezone=Europe/London"
)

with urllib.request.urlopen(url) as response:
    data = json.loads(response.read())

hourly = data["hourly"]

print(f"{'Time':<20} {'Temperature (°C)':<20} {'Feels Like (°C)'}")
print("-" * 55)
for i, time in enumerate(hourly["time"]):
    print(
        f"{time:<20} "
        f"{hourly['temperature_2m'][i]:<20} "
        f"{hourly['apparent_temperature'][i]}"
    )