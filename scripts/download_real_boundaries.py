import urllib.request
import json
import os

BOUNDARIES_DIR = "public/data/boundaries"
os.makedirs(BOUNDARIES_DIR, exist_ok=True)

try:
    print("Downloading global GeoJSON...")
    url = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        
    india_feature = None
    for feature in data.get('features', []):
        props = feature.get('properties', {})
        if 'India' in str(props.values()) or props.get('ISO_A3') == 'IND':
            india_feature = feature
            break
            
    if india_feature:
        india_feature['properties']['level'] = 0
        india_geom = {
            "type": "FeatureCollection",
            "features": [india_feature]
        }
        
        path = f"{BOUNDARIES_DIR}/india.geojson"
        with open(path, "w") as f:
            json.dump(india_geom, f)
        print(f"Successfully saved accurate India boundary to {path}")
    else:
        print("Could not find India. First feature props: ", data.get('features', [])[0].get('properties'))
except Exception as e:
    print(f"Error fetching boundaries: {e}")
