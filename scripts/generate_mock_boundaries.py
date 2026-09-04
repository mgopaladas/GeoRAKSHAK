import json
import os

BOUNDARIES_DIR = "data/processed/boundaries"
os.makedirs(BOUNDARIES_DIR, exist_ok=True)

# Coarse bounding boxes for Mock purposes (until real Survey of India shapefiles are ingested)
# India bounding box roughly
india_geojson = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "properties": {"name": "India", "level": 0},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[68.7, 8.4], [97.2, 8.4], [97.2, 37.6], [68.7, 37.6], [68.7, 8.4]]]
        }
    }]
}

# Meghalaya roughly
states_geojson = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "properties": {"name": "Meghalaya", "level": 1},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[89.8, 25.0], [92.8, 25.0], [92.8, 26.1], [89.8, 26.1], [89.8, 25.0]]]
        }
    },
    {
        "type": "Feature",
        "properties": {"name": "Assam", "level": 1},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[89.7, 24.1], [96.0, 24.1], [96.0, 27.9], [89.7, 27.9], [89.7, 24.1]]]
        }
    }]
}

# East Khasi Hills (District)
districts_geojson = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "properties": {"name": "East Khasi Hills", "level": 2},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[91.5, 25.2], [92.1, 25.2], [92.1, 25.7], [91.5, 25.7], [91.5, 25.2]]]
        }
    }]
}

with open(f"{BOUNDARIES_DIR}/india_boundary.geojson", "w") as f:
    json.dump(india_geojson, f)

with open(f"{BOUNDARIES_DIR}/state_boundaries.geojson", "w") as f:
    json.dump(states_geojson, f)

with open(f"{BOUNDARIES_DIR}/district_boundaries.geojson", "w") as f:
    json.dump(districts_geojson, f)

print("Mock boundary GeoJSONs generated successfully.")
