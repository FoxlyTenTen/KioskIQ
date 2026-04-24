import math
import requests
from typing import Dict, Any

def calculate_competition(lat: float, lng: float, base_footfall: int, business_type: str) -> Dict[str, Any]:
    """
    Finds real competitors using the OpenStreetMap Overpass API.
    """
    bt_lower = business_type.lower()
    
    # Map business type to OSM tags
    if "cafe" in bt_lower:
        query_tag = '["amenity"="cafe"]'
    elif "restaurant" in bt_lower:
        query_tag = '["amenity"="restaurant"]'
    elif "laundry" in bt_lower:
        query_tag = '["shop"="laundry"]'
    else:
        query_tag = '["shop"]' # Generic retail
        
    # Overpass Query: Search within roughly 2000 meters.
    query = f"""
    [out:json];
    node{query_tag}(around:2000, {lat}, {lng});
    out 5;
    """
    
    competitors = []
    num_competitors = 0
    
    try:
        url = "https://overpass-api.de/api/interpreter"
        res = requests.post(url, data={"data": query}, headers={"User-Agent": "KioskIQ-Hackathon"})
        if res.status_code == 200:
            data = res.json()
            for node in data.get("elements", []):
                name = node.get("tags", {}).get("name", f"Rival {business_type.capitalize()}")
                c_lat = node.get("lat", lat)
                c_lng = node.get("lon", lng)
                
                # Rough distance calc
                dist_m = int(math.sqrt((lat - c_lat)**2 + (lng - c_lng)**2) * 111000)
                
                competitors.append({
                    "name": name,
                    "distance": f"{dist_m}m",
                    "coordinates": {"lat": c_lat, "lng": c_lng}
                })
            
            num_competitors = len(competitors)
    except Exception as e:
        print(f"Overpass API error: {e}")
        pass
        
    # Fallback to simulated if Overpass is severely rate limited
    if num_competitors == 0:
        return _simulate_competition(lat, lng, base_footfall, business_type)
        
    # Real Competitor Score 0-100 (100 means highly saturated)
    competitor_score = min(100, (num_competitors / 5) * 100.0)
    
    level = "Low"
    if competitor_score > 66:
        level = "High"
    elif competitor_score > 33:
        level = "Medium"
        
    return {
        "score": competitor_score,
        "level": level,
        "list": sorted(competitors, key=lambda x: int(x["distance"].replace("m", "")))
    }

def _simulate_competition(lat: float, lng: float, base_footfall: int, business_type: str) -> Dict[str, Any]:
    """Fallback simulation if Overpass fails."""
    import random
    num_competitors = max(1, min(5, int((base_footfall / 1000) * 5) + random.randint(-1, 2)))
    competitors = []
    for i in range(num_competitors):
        offset_lat = random.uniform(-0.005, 0.005)
        offset_lng = random.uniform(-0.005, 0.005)
        dist_m = int(math.sqrt(offset_lat**2 + offset_lng**2) * 111000)
        competitors.append({
            "name": f"Rival {business_type.capitalize()} {i+1} (Simulated)",
            "distance": f"{dist_m}m",
            "coordinates": {"lat": lat + offset_lat, "lng": lng + offset_lng}
        })
    competitor_score = min(100, (num_competitors / 5) * 100.0)
    level = "Low"
    if competitor_score > 66: level = "High"
    elif competitor_score > 33: level = "Medium"
    
    return {
        "score": competitor_score,
        "level": level,
        "list": sorted(competitors, key=lambda x: int(x["distance"].replace("m", "")))
    }
