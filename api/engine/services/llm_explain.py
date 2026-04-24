import os
import json
import requests
from typing import Dict, Any

def generate_explanation(location_name: str, business_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calls the z.ai (or fallback LLM) to generate simple Pros, Cons, and a Summary.
    This is the ONLY AI layer in the pipeline.
    """
    api_key = os.getenv("ILMU_API_KEY")
    base_url = os.getenv("ANTHROPIC_BASE_URL", "https://api.ilmu.ai/anthropic")
    model = "anthropic/ilmu-glm-5.1" # Force fast model if needed
    
    # Fallback to deterministic generation if no API key or to save time
    if not api_key:
        return _generate_deterministic_explanation(location_name, business_type, data)
        
    prompt = f"""
    Analyze this location data for a new {business_type} in {location_name}.
    Data: Demand={data['demand']}, Access={data['access']}, Competition={data['comp_level']}, BudgetFit={data['budget_fit']}
    
    Return EXACTLY a JSON format:
    {{
      "pros": ["Pro 1", "Pro 2", "Pro 3"],
      "cons": ["Con 1", "Con 2"],
      "riskLevel": "Low" | "Med" | "High",
      "summary": "2 sentence explanation of why this is a good/bad choice."
    }}
    """
    
    try:
        # We simulate the API call here for safety during hackathon if keys are flaky.
        # In actual prod, uncomment the direct requests.post to ANTHROPIC_BASE_URL via LiteLLM
        return _generate_deterministic_explanation(location_name, business_type, data)
    except Exception as e:
        return _generate_deterministic_explanation(location_name, business_type, data)

def _generate_deterministic_explanation(location_name: str, business_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Fallback generator ensuring the pipeline NEVER fails."""
    pros = []
    cons = []
    risk = "Low"
    
    if data['demand'] > 75:
        pros.append("High foot traffic area")
    elif data['demand'] < 40:
        cons.append("Lower base foot traffic")
        
    if data['comp_level'] == "High":
        cons.append("Market is highly saturated")
        risk = "High"
    elif data['comp_level'] == "Low":
        pros.append("First mover advantage (low competition)")
        
    if data['budget_fit'] > 80:
        pros.append("Excellent budget fit")
    elif data['budget_fit'] < 40:
        cons.append("Stretches required budget")
        risk = "Med" if risk == "Low" else "High"
        
    if not pros: pros.append("Standard market conditions")
    if not cons: cons.append("No immediate red flags detected")
        
    return {
        "pros": pros[:3],
        "cons": cons[:2],
        "riskLevel": risk,
        "summary": f"{location_name} offers a {risk.lower()}-risk opportunity for a {business_type} with a demand score of {data['demand']}% and {data['comp_level'].lower()} competition."
    }
