"""Database Agent (ADK + A2A Protocol)

This agent handles CRUD operations for the financial database (transactions, etc.).
It exposes an A2A Protocol endpoint and can be called by the Orchestrator.
"""
import uvicorn
import os
import json
from datetime import datetime
from uuid import uuid4
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

# A2A Imports
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.utils import new_agent_text_message

# ADK Imports
from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService
from google.adk.artifacts import InMemoryArtifactService
from google.adk.tools import ToolContext
from google.genai import types

# ========================================
# MongoDB Connection
# ========================================

def get_database():
    """Get MongoDB database connection"""
    uri = os.getenv("MONGODB_ATLAS_CLUSTER_URI")
    if not uri:
        raise ValueError("MONGODB_ATLAS_CLUSTER_URI not found in .env file")
    
    client = MongoClient(uri)
    return client["financial_system"]  # Database name

# ========================================
# TOOLS
# ========================================

def add_transaction(
    tool_context: ToolContext,
    amount: float,
    category: str,
    date: str,
    name: str,
    description: str = "",
    type: str = "expense"
) -> dict:
    """
    Add a new transaction (expense or income).
    """
    try:
        # In A2A demo context, we might rely on the a2a_user_id or mock it
        user_id = getattr(tool_context.session, 'user_id', 'demo_user')
        
        db = get_database()
        
        transaction = {
            "transaction_id": f"txn_{uuid4().hex[:12]}",
            "user_id": user_id,
            "amount": float(amount),
            "category": category,
            "date": datetime.fromisoformat(date),
            "name": name,
            "description": description,
            "type": type,
            "created_at": datetime.now()
        }
        
        db.transactions.insert_one(transaction)
        
        return {
            "status": "success",
            "message": f"Added ${amount} {type} for {name}",
            "transaction_id": transaction["transaction_id"]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_user_transactions(
    tool_context: ToolContext,
    start_date: str = None,
    end_date: str = None,
    category: str = None,
    name: str = None,
    description: str = None,
    search_term: str = None
) -> dict:
    """
    Only use this tools whenever you need to get user's transactions with optional filters.
    Can search by start_data, end_date, category, name, description, search_term
    """
    try:
        user_id = getattr(tool_context.session, 'user_id', 'demo_user')
        db = get_database()
        query = {"user_id": user_id}
        
        if start_date or end_date:
            query["date"] = {}
            if start_date:
                query["date"]["$gte"] = datetime.fromisoformat(start_date)
            if end_date:
                query["date"]["$lte"] = datetime.fromisoformat(end_date)
        
        if category:
            query["category"] = category
            
        if description or search_term or name:
            term = description or search_term or name
            # Simple case-insensitive regex for description or name
            query["$or"] = [
                {"description": {"$regex": term, "$options": "i"}},
                {"name": {"$regex": term, "$options": "i"}}
            ]
        
        transactions = list(db.transactions.find(query).sort([("date", -1), ("created_at", -1)]))
        
        for txn in transactions:
            txn["_id"] = str(txn["_id"])
            # Friendly date: "28 Jan 2026"
            txn["date"] = txn["date"].strftime("%d %b %Y")
            if "created_at" in txn:
                # Date only, no time
                txn["created_at"] = txn["created_at"].strftime("%d %b %Y")
        
        total = sum(txn.get("amount", 0) for txn in transactions)
        
        return {
            "status": "success",
            "transactions": transactions,
            "total_amount": total,
            "count": len(transactions)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_all_user_data(tool_context: ToolContext) -> dict:
    """
    Get ALL data associated with the current user ID (transactions, etc).
    Useful for full data dumps or comprehensive summaries.
    """
    try:
        user_id = getattr(tool_context.session, 'user_id', 'demo_user')
        db = get_database()
        
        # 1. Get Transactions
        transactions = list(db.transactions.find({"user_id": user_id}).sort([("date", -1), ("created_at", -1)]))
        for txn in transactions:
            txn["_id"] = str(txn["_id"])
            # Friendly date: "28 Jan 2026"
            txn["date"] = txn["date"].strftime("%d %b %Y")
            if "created_at" in txn:
                # Date only, no time
                txn["created_at"] = txn["created_at"].strftime("%d %b %Y")
                
        # 2. Get Budgets (if any exist in a 'budgets' collection)
        # Note: The tool for adding budgets isn't in this file yet, but we check anyway
        budgets = list(db.budgets.find({"user_id": user_id}))
        for b in budgets:
            b["_id"] = str(b["_id"])
            
        return {
            "status": "success",
            "user_id": user_id,
            "data": {
                "transactions": transactions,
                "budgets": budgets,
                "transaction_count": len(transactions),
                "budget_count": len(budgets)
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def delete_transaction_by_details(
    tool_context: ToolContext, 
    amount: float = None, 
    name: str = None,
    description: str = None, 
    category: str = None,
    date: str = None
) -> dict:
    """
    Delete a transaction by matching its details (Amount, Description, etc.) instead of ID.
    Useful when user says "Delete the $50 Starbucks expense".
    If multiple matches found, it will ask for clarification.
    """
    try:
        user_id = getattr(tool_context.session, 'user_id', 'demo_user')
        db = get_database()
        
        query = {"user_id": user_id, "is_deleted": {"$ne": True}}
        if amount:
            query["amount"] = float(amount)
        if name:
             query["name"] = {"$regex": name, "$options": "i"}
        if description:
            query["description"] = {"$regex": description, "$options": "i"}
        if category:
            query["category"] = category
        if date:
            query["date"] = datetime.fromisoformat(date)
            
        matches = list(db.transactions.find(query))
        
        if len(matches) == 0:
             return {"status": "error", "message": "No matching transaction found to delete."}
        
        if len(matches) > 1:
            # Too many matches
            details = [f"{m['date']} - ${m['amount']} ({m.get('name', 'No Name')})" for m in matches]
            return {
                "status": "error", 
                "message": f"Found {len(matches)} matching transactions. Please be more specific.",
                "matches": details
            }
            
        # Exactly one match - delete it
        txn_id = matches[0]["transaction_id"]
        result = db.transactions.delete_one(
            {"transaction_id": txn_id, "user_id": user_id}
        )
        
        if result.deleted_count > 0:
            return {
                "status": "success", 
                "message": f"Deleted transaction: {matches[0]['date']} - ${matches[0]['amount']} ({matches[0].get('name', '')})"
            }
        else:
             return {"status": "error", "message": "Failed to delete transaction."}

    except Exception as e:
        return {"status": "error", "message": str(e)}

def delete_transaction(tool_context: ToolContext, transaction_id: str) -> dict:
    """Delete a transaction by its specific ID."""
    try:
        user_id = getattr(tool_context.session, 'user_id', 'demo_user')
        db = get_database()
        
        result = db.transactions.delete_one(
             {"transaction_id": transaction_id, "user_id": user_id}
        )
        
        if result.deleted_count > 0:
            return {"status": "success", "message": f"Deleted transaction {transaction_id}"}
        else:
            return {"status": "error", "message": "Transaction not found or not owned by user"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- Agent Class ---
class DatabaseAgent:
    def __init__(self):
        self._agent = self._build_agent()
        self._user_id = 'demo_user' # Use demo_user to match tools default
        self._runner = Runner(
            app_name=self._agent.name,
            agent=self._agent,
            artifact_service=InMemoryArtifactService(),
            session_service=InMemorySessionService(),
            memory_service=InMemoryMemoryService(),
        )

    def _build_agent(self) -> LlmAgent:
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        
        return LlmAgent(
            model=model_name,
            name='database_agent',
            description='Manages financial database (transactions, budgets, plans).',
            instruction="""
You are the DATABASE AGENT.
You are the DATABASE AGENT.
Your job is to strictly perform CRUD operations on the financial database.

**TOOL VALIDATION**:
- You have access to: [`add_transaction`, `get_user_transactions`, `get_all_user_data`, `delete_transaction`, `delete_transaction_by_details`].
- USE ONLY these tools.
- Do NOT hallucinate tool names.

RULES:
1. To GET transactions: Use `get_user_transactions` (with optional filters) or `get_all_user_data`. You do **NOT** need a transaction ID to list/search transactions. Just call the tool directly.
2. To DELETE transactions: If the user provides details (like "delete the Starbucks coffee"), use `delete_transaction_by_details` directly. Do NOT search for an ID first.
3. To ADD transactions: Use `add_transaction`.

When asked to update, delete, or retrieve data:
1. Identify the correct tool.
2. Call the tool with the necessary parameters.
3. Return the result in a clear, text-based format unless JSON is requested.
4. IMPORTANT: After successfully ADDING or DELETING a transaction, you MUST immediately call `get_user_transactions` (or `get_all_user_data`) to return the updated list to the user. Do not ask for permission, just show the updated data.
            """,
            tools=[
                add_transaction,
                get_user_transactions,
                get_all_user_data,
                delete_transaction,
                delete_transaction_by_details,
            ],
        )

    async def invoke(self, query: str, session_id: str) -> str:
        session = await self._runner.session_service.get_session(
            app_name=self._agent.name, user_id=self._user_id, session_id=session_id
        )
        content = types.Content(role='user', parts=[types.Part.from_text(text=query)])
        
        if not session:
             session = await self._runner.session_service.create_session(
                app_name=self._agent.name, user_id=self._user_id, state={}, session_id=session_id
            )

        response_text = ''
        async for event in self._runner.run_async(user_id=self._user_id, session_id=session.id, new_message=content):
            if event.is_final_response() and event.content:
                response_text = getattr(event.content.parts[0], 'text', '')
                break
            
        return response_text

# --- Server Setup ---
port = int(os.getenv("DATABASE_PORT", 9008))

skill = AgentSkill(
    id='database_agent',
    name='Database Manager',
    description='Updates and retrieves financial data',
    tags=['database', 'finance', 'crud'],
    examples=['Add a $50 expense for food', 'Show my transactions'],
)

public_agent_card = AgentCard(
    name='Database Agent',
    description='Manages financial data operations.',
    url=f'http://localhost:{port}/',
    version='1.0.0',
    defaultInputModes=['text'],
    defaultOutputModes=['text'],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill]
)

class DatabaseExecutor(AgentExecutor):
    def __init__(self):
        self.agent = DatabaseAgent()
    
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        result = await self.agent.invoke(context.get_user_input(), getattr(context, 'context_id', 'default'))
        await event_queue.enqueue_event(new_agent_text_message(result))

    async def cancel(self, context, event_queue): pass

def main():
    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=DefaultRequestHandler(DatabaseExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Database Agent on port {port}")
    uvicorn.run(server.build(), host='0.0.0.0', port=port)

if __name__ == '__main__':
    main()
