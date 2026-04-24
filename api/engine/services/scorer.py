def calculate_final_score(demand: float, competition: float, budget_fit: float) -> float:
    """
    Core Logic Engine (Transportation removed).
    Final Score = 0.5 × Demand + 0.3 × (1 - Competition) + 0.2 × Budget Fit
    """
    
    # Competition score is 0-100 where 100 is high competition. We want low competition to boost the score.
    # So we invert it for the formula: (100 - competition) / 100
    comp_factor = (100 - competition) / 100.0
    
    final = (0.5 * demand) + (0.3 * (comp_factor * 100)) + (0.2 * budget_fit)
    
    return round(final, 1)
