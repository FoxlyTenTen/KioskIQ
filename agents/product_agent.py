"""
Product Research Agent (ADK + A2A Protocol)

This agent performs real-time searches to find best deals, prices, and reviews for products.
It exposes an A2A Protocol endpoint and can be called by the Orchestrator.
"""
import uvicorn
import os
import json
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List

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
from google.genai import types

# --- Data Models ---
class ProductDeal(BaseModel):
    retailer: str
    price: float
    link: str

class ProductResult(BaseModel):
    product_name: str
    rating: str
    key_feature: str
    description: str
    best_deal: ProductDeal

class ResearchResult(BaseModel):
    query: str
    results: List[ProductResult]

# --- Agent Class ---
class ProductResearchAgent:
    def __init__(self):
        self._agent = self._build_agent()
        self._user_id = 'remote_agent'
        self._runner = Runner(
            app_name=self._agent.name,
            agent=self._agent,
            artifact_service=InMemoryArtifactService(),
            session_service=InMemorySessionService(),
            memory_service=InMemoryMemoryService(),
        )

    def _build_agent(self) -> LlmAgent:
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        
        from google.adk.tools import google_search 
        
        return LlmAgent(
            model=model_name,
            name='product_research_agent',
            description='Specialist in researching products, prices, reviews, and alternatives.',
            instruction="""


            You are the PRODUCT RESEARCH AGENT.
            Your job is to find the best products, prices, and reviews based on the user's request using REAL-TIME SEARCH.

            INSTRUCTIONS:
            1. You MUST use the `google_search` tool to find real-time prices and retailers.
            2. Search for the specific product model or general category requested.
            3. Identify the retailer offering the best price (prioritize Malaysian Ringgit MYR).
            4. Synthesize the findings into the required JSON format.
            5. Return ONLY the valid JSON object.

            Search Logic:
            - If user asks for "iPhone 15", search specifically for "iPhone 15 price Malaysia".
            - If user asks for "best gaming laptop", search for reviews and top rated models first, then prices.

            Return ONLY valid JSON with this structure:
            {
              "query": "original user query",
              "results": [
                {
                  "product_name": "Product Name",
                  "rating": "4.5/5",
                  "key_feature": "Feature description",
                  "description": "Brief description",
                  "best_deal": {
                    "retailer": "Retailer Name",
                    "price": 1234.00,
                    "link": "https://example.com"
                  }
                }
              ]
            }
            """,
            tools=[google_search], 
        )

    async def invoke(self, query: str, session_id: str) -> str:
        # Standard ADK invocation pattern
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
            if event.is_final_response():
                if event.content and event.content.parts and event.content.parts[0].text:
                    response_text = '\n'.join([p.text for p in event.content.parts if p.text])
                break
        
        # Clean JSON
        content_str = response_text.strip()
        
        if "```json" in content_str:
            content_str = content_str.split("```json")[1].split("```")[0].strip()
        elif "```" in content_str:
            content_str = content_str.split("```")[1].split("```")[0].strip()
            
        try:
            # Parse and Validate using Pydantic (Like Restaurant Agent)
            structured_data = json.loads(content_str)
            validated_result = ResearchResult(**structured_data)
            final_response = json.dumps(validated_result.model_dump(), indent=2)
            print("Successfully created structured product research results")
            return final_response
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Content: {content_str}")
            return json.dumps({
                "error": "Failed to generate structured product results",
                "raw_content": content_str[:200]
            })
        except Exception as e:
            print(f"Validation error: {e}")
            return json.dumps({
                "error": f"Validation failed: {str(e)}"
            })

# --- Server Setup ---
port = int(os.getenv("PRODUCT_PORT", 9006))

skill = AgentSkill(
    id='product_agent',
    name='Product Research',
    description='Finds prices and reviews for travel gear',
    tags=['product', 'research', 'shopping'],
    examples=['Find travel adapters for France'],
)

public_agent_card = AgentCard(
    name='Prod Research Agent',
    description='Finds best deals on travel equipment.',
    url=f'http://localhost:{port}/',
    version='1.0.0',
    defaultInputModes=['text'],
    defaultOutputModes=['text'],
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill],
    supportsAuthenticatedExtendedCard=False,
)

class ProductExecutor(AgentExecutor):
    def __init__(self):
        self.agent = ProductResearchAgent()
    
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        query = context.get_user_input()
        session_id = getattr(context, 'context_id', 'default_session')
        result = await self.agent.invoke(query, session_id)
        await event_queue.enqueue_event(new_agent_text_message(result))

    async def cancel(self, context, event_queue): pass

def main():
    if not os.getenv("GOOGLE_API_KEY") and not os.getenv("GEMINI_API_KEY"):
        print("Warning: No Google API key found!")

    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=DefaultRequestHandler(ProductExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Product Agent on port {port}")
    uvicorn.run(server.build(), host='0.0.0.0', port=port)

if __name__ == '__main__':
    main()
