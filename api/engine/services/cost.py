def calculate_cost_fit(base_rent: int, user_budget: float) -> float:
    """
    Calculates how well the location's estimated rent fits the user's budget.
    Returns a score 0-100.
    """
    if user_budget <= 0:
        return 0.0
        
    ratio = base_rent / user_budget
    
    # Perfect fit if rent is around 20-30% of total budget (standard business rule of thumb)
    # If rent is > 50% of budget, score drops sharply
    
    if ratio > 0.8:
        score = 10.0 # Very dangerous financially
    elif ratio > 0.5:
        score = 40.0
    elif ratio > 0.3:
        score = 75.0
    elif ratio >= 0.15:
        score = 100.0 # Ideal range
    else:
        score = 85.0 # Very cheap, might indicate lower quality but great for budget
        
    return score
