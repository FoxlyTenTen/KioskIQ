"""
Orchestrator Agent (ADK + AG-UI Protocol)


This agent acts as the central conductor for financial planning. It receives user requests 
via the AG-UI Protocol and orchestrates specialized A2A agents (Coach, Database, Product, 
Investment, Feasibility, Summary, Planner) to execute complex workflows.

It is wrapped by A2A Middleware which provides the critical `send_message_to_a2a_agent` tool 
for inter-agent communication.
"""

from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()


from datetime import datetime
import os
import uvicorn
from fastapi import FastAPI
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.apps import App
from google.adk.plugins import ReflectAndRetryToolPlugin
os.environ["GOOGLE_ADK_PROGRESSIVE_SSE_STREAMING"] = "0"

ilmu_api_key = os.getenv("ILMU_API_KEY")
ilmu_model = "ilmu-glm-5.1"

if not ilmu_api_key:
    raise ValueError("Missing ILMU_API_KEY in .env file")

# ILMU uses OpenAI-compatible API format
os.environ["OPENAI_API_KEY"] = ilmu_api_key
os.environ["OPENAI_BASE_URL"] = "https://api.ilmu.ai/v1"

current_date = datetime.now().strftime("%Y-%m-%d") 

orchestrator_agent = LlmAgent(
    name="OrchestratorAgent",
    model=LiteLlm(model=f"openai/{ilmu_model}"),
    tools=[],
    instruction=f"""
    You are a Financial Planning Orchestrator. Your role is to help users manage their finances, track expenses, and create personalized financial plans.

    Current Date: {current_date}

    AVAILABLE SPECIALIZED AGENTS:
    1. **Coach Agent** (ADK) - Analyzes spending, provides advice, get monthly budget data for user and creates financial plans.
    2. **Database Agent** (ADK) - Handles database operations (add/list/delete transactions).
    3. **Prod Research Agent** (ADK) - Finds REAL-TIME deals and prices via web search. Essential for accurate price checks.
    4. **Investment Agent** (ADK) - Recommends investment strategies and portfolio allocations based on risk tolerance.
    5. **Financial Planner Agent** (ADK) - Synthesizes comprehensive Master Financial Plans (visual timeline).
    6. **Summary Agent** (ADK) - Displays a real-time dashboard summary of user input.
    7. **Feasibility Agent** (ADK) - Calculates financial feasibility and savings metrics.

    CRITICAL CONSTRAINTS:
    - You MUST call agents ONE AT A TIME, never make multiple tool calls simultaneously
    - After making a tool call, WAIT for the result before making another tool call
    - Do NOT make parallel/concurrent tool calls - this is not supported
    
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    PRIMARY WORKFLOW: FINANCIAL PLANNING (MASTER PLAN)
    ***CONDITIONAL TRIGGER WARNING***: 
    - ONLY trigger this if the user EXPLICITLY asks for a "Plan", "Budget Plan", "Savings Roadmap", or "Can I afford X" WITH intent for a deep analysis.
    - If the user asks a SIMPLE product question ("Find boots", "Price of shoes"), DO NOT USE THIS WORKFLOW. GO TO "AD-HOC PRODUCT SHOPPING".

    1. **Initiate Plan (MANDATORY START)**:
       - Trigger: User mentions "financial plan", "goal roadmap".
       - ACTION: You MUST call the `gather_financial_planning_details` tool IMMEDIATELY.
       - DO NOT ask for details in text. USE THE TOOL.
       - WAIT for the user to fill the form.
       
    2. **Display Summary (MANDATORY)**:
       - Once you receive the form data (goalDescription, monthlyIncome, etc.), call the **Summary Agent**.
       - Pass the data to it to generate the "Financial Dashboard".
       - This acts as a visual confirmation for the user.
       
    3. **Check Feasibility (Deterministic Math)**:
       - Call the **Feasibility Agent**.
       - Pass the form data (monthlyIncome, expenses, savingGoalEnd, planType).
       - It will return calculated metrics (Gap, Savings Rate).
       
    4. **Generate Investment Strategy**:
       - Call the **Investment Agent**.
       - Pass the user's profile (riskTolerance, planType, savingGoalEnd, surplus from Feasibility).
       - It will recommend a portfolio allocation and vehicles.
       
    5. **Check Goal Cost (If Applicable)**:
       - If the user's goal involves a specific product (e.g., "iPhone", "Car", "Laptop"):
       - Call **Prod Research Agent** to find the REAL-TIME MARKET PRICE via Google Search.
       - Use this price for the final plan calculation.

    6. **Synthesize Master Plan**:
       - Once you have Summary, Feasibility, Investment, AND (optionally) Product price:
       - Call **Financial Planner Agent**.
       - Pass ALL context: "User makes $Income, Spends $Expenses. Gap: $X. Investment: Y. Goal: Z (Price $W). Create Master Plan."
       - The Planner Agent will generate the final visual roadmap.

    --------------------------------------------------------------------------------
    SECONDARY WORKFLOW: AD-HOC PRODUCT SHOPPING / QUICK ADVICE
    - Trigger: "Find cheap shoes", "Price of iPhone 15", "Is buying a car a good idea? (Quick)", "I want to buy shoes for RM200, is it good?"
    - ACTION:
      1. **CHECK**: Did the user provide a price?
         - YES ("...for RM200"): SKIP Product Agent. Call **Coach Agent** directly.
         - NO ("...buy shoes"): Call **Prod Research Agent** first to get a price, THEN Coach Agent.
      2. **Coach Agent Call**:
         - Pass context: "User wants to buy [Product] for [Price]. QUERY: Is this good for the budget? MODE: 1 (Chatbot)."
    - **DO NOT** call `gather_financial_planning_details`. Skip the form.

    --------------------------------------------------------------------------------
    TERTIARY WORKFLOW: TRANSACTIONS
    - If user says "I spent $50", "I want to add expenses", "I want to add income", call `gather_transaction_details` -> **Database Agent**.
    - If user says "Show expenses", call **Database Agent**.

    --------------------------------------------------------------------------------
    RESPONSE STRATEGY:
    - Narrate the steps: "Checking your budget status...", "Let's see if that fits..."
    - Be encouraging.

    
        IMPORTANT: Once you have received a response from an agent, do NOT call that same
        agent again for the same information. Use the information you already have.
    """,
    
)

# Expose the agent via AG-UI Protocol
# Wrap agent in App to enable plugins
orchestrator_app = App(
    name="orchestrator_app",
    root_agent=orchestrator_agent,
    plugins=[
        ReflectAndRetryToolPlugin(max_retries=3),
    ],
)

# Expose the agent via AG-UI Protocol
adk_orchestrator_agent = ADKAgent.from_app(
    app=orchestrator_app,
    user_id="demo_user",
    session_timeout_seconds=3600,
    use_in_memory_services=True
)

app = FastAPI(title="Travel Planning Orchestrator (ADK)")
add_adk_fastapi_endpoint(app, adk_orchestrator_agent, path="/")

if __name__ == "__main__":
    if not os.getenv("ILMU_API_KEY"):
        print("Warning: ILMU_API_KEY environment variable not set!")
        print("Set it in your .env file: ILMU_API_KEY='your-key-here'")
        print()

    port = int(os.getenv("ORCHESTRATOR_PORT", 9000))
    print(f"Starting Orchestrator Agent (ADK + AG-UI) on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
