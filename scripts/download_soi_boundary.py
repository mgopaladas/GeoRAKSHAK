import urllib.request
import json
import os

BOUNDARIES_DIR = os.path.join("apps", "government-dashboard", "public", "data", "boundaries")
os.makedirs(BOUNDARIES_DIR, exist_ok=True)

# DataMeet SOI-derived India boundary — includes J&K and Ladakh per India's official claim
URL = "https://raw.githubusercontent.com/datameet/maps/master/Country/india-soi.geojson"

print(f"Downloading SOI-derived India boundary from DataMeet...")
req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read().decode('utf-8')
        data = json.loads(raw)

    # Tag with level=0 for our boundary renderer
    for feature in data.get('features', []):
        feature['properties']['level'] = 0
        feature['properties']['name'] = 'India'

    path = os.path.join(BOUNDARIES_DIR, "india_soi.geojson")
    with open(path, "w") as f:
        json.dump(data, f)
    
    n_features = len(data.get('features', []))
    geom_type = data['features'][0]['geometry']['type'] if n_features > 0 else 'unknown'
    print(f"Success! Saved {n_features} feature(s) of type '{geom_type}' to {path}")
    print(f"File size: {os.path.getsize(path) / 1024:.1f} KB")
except Exception as e:
    print(f"Error: {e}")
