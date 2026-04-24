import random
from typing import Dict, Any

def calculate_demand(base_footfall: int, business_type: str) -> float:
    """
    Calculate demand score (0-100) based on base footfall data and business type multipliers.
    Simulates Google Maps Popular Times API.
    """
    # Normalize 0-1000 base_footfall to 0-100 scale
    normalized = min(100, max(0, base_footfall / 10))
    
    # Simple multipliers based on business type affinity with high footfall areas
    multiplier = 1.0
    bt_lower = business_type.lower()
    
    if "cafe" in bt_lower or "boba" in bt_lower:
        multiplier = 1.1 # Thrives in high footfall
    elif "laundry" in bt_lower:
        multiplier = 0.8 # Steady demand regardless of extreme footfall
    elif "retail" in bt_lower:
        multiplier = 1.0
        
    final_score = min(100, normalized * multiplier)
    
    # Add slight random noise for realistic variability
    noise = random.uniform(-3, 3)
    return round(min(100, max(0, final_score + noise)), 1)
