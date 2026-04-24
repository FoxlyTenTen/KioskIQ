import uuid
from typing import Dict, Any, List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import our pipeline services
from api.engine.services.mock_data import get_candidate_areas
from api.engine.services.demand import calculate_demand
from api.engine.services.competitor import calculate_competition
from api.engine.services.cost import calculate_cost_fit
from api.engine.services.scorer import calculate_final_score
from api.engine.services.llm_explain import generate_explanation

app = FastAPI(title="KioskIQ Location Intelligence Pipeline")

# Enable CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LocationRequest(BaseModel):
    area: str
    city: Optional[str] = None
    budget: float
    businessType: str

@app.post("/api/location/predict")
def predict_location(req: LocationRequest):
    """
    Main orchestration pipeline. No agents, just pure deterministic speed.
    """
    candidates = get_candidate_areas(req.area, req.city)
    
    results = []
    for cand in candidates:
        # 1. Demand Service
        demand_score = calculate_demand(cand["base_footfall"], req.businessType)
        
        # 2. Competitor Service
        comp_data = calculate_competition(cand["lat"], cand["lng"], cand["base_footfall"], req.businessType)
        
        # 3. Cost Service
        budget_score = calculate_cost_fit(cand["base_rent"], req.budget)
        
        # 4. Core Scoring Engine
        final_score = calculate_final_score(
            demand=demand_score,
            competition=comp_data["score"],
            budget_fit=budget_score
        )
        
        # 5. AI Explanation Service
        ai_data = generate_explanation(
            cand["name"], 
            req.businessType,
            {"demand": demand_score, "access": "N/A", "comp_level": comp_data["level"], "budget_fit": budget_score}
        )
        
        # Construct exact frontend schema
        loc_obj = {
            "id": str(uuid.uuid4()),
            "name": cand["name"],
            "imageUrl": cand["image_url"],
            "coordinates": {"lat": cand["lat"], "lng": cand["lng"]},
            "finalScore": final_score,
            "demandScore": demand_score,
            "competitionLevel": comp_data["level"],
            "costFit": budget_score,
            "baseRent": cand["base_rent"],
            "competitors": comp_data["list"],
            "pros": ai_data["pros"],
            "cons": ai_data["cons"],
            "riskLevel": ai_data["riskLevel"],
            "summary": ai_data["summary"]
        }
        results.append(loc_obj)
        
    # Sort by final score descending and return top 3
    results.sort(key=lambda x: x["finalScore"], reverse=True)
    return {"status": "success", "data": results[:3]}

if __name__ == "__main__":
    import uvicorn
    # Using 9100 to map directly to what we previously used
    uvicorn.run(app, host="0.0.0.0", port=9100)
