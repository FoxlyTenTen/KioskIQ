# Adding a Product Research Agent to AG-UI + A2A

This guide explains how to add a new `ProductResearchAgent` to the existing travel demo without modifying the core orchestrator logic or existing agents. We will simply "plug in" a new visualization.

## 1. Create the Agent Backend (`agents/product_agent.py`)

Create a new file `agents/product_agent.py`. This agent wraps your existing logic in the A2A server structure.

**Note:** You must install `google-search-results` or similar if using `google_search`. For this demo, we'll simulate the search tool to keep dependencies simple, or you can uncomment the real tool if you have the API key.

```python
"""
Product Research Agent (ADK + A2A Protocol)
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
    best_deal: ProductDeal
    rating: str
    key_feature: str
    description: str

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
        
        # NOTE: In a real app, import your google_search tool here
        # from google.adk.tools import google_search 
        
        return LlmAgent(
            model=model_name,
            name='product_research_agent',
            description='Specialist in researching products, prices, reviews, and alternatives.',
            instruction="""
You are the PRODUCT RESEARCH AGENT.
Your job is to find specialized travel gear (cameras, bags, adapters) matching the destination.

If the user is going to "Paris", recommend a "Travel Adapter (Type E)".
If "Tokyo", recommend a "Pasmo/Suica Card Holder" or "Compact Umbrella".

Return ONLY valid JSON:
{
  "query": "travel adapter for Paris",
  "results": [
    {
      "product_name": "Universal Travel Adapter Type E/F",
      "rating": "4.8/5",
      "key_feature": "USB-C Fast Charging",
      "description": "Essential for European power outlets.",
      "best_deal": {
        "retailer": "Amazon",
        "price": 24.99,
        "link": "https://amazon.com/..."
      }
    }
  ]
}
            """,
            tools=[], # Add [google_search] if you have the API key setup
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
            if event.is_final_response() and event.content:
                response_text = getattr(event.content.parts[0], 'text', '')
                break
        
        # Clean JSON
        content_str = response_text.strip()
        if "```json" in content_str:
            content_str = content_str.split("```json")[1].split("```")[0].strip()
        elif "```" in content_str:
            content_str = content_str.split("```")[1].split("```")[0].strip()
            
        return content_str

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
    name='Product Research Agent',
    description='Finds best deals on travel equipment.',
    url=f'http://localhost:{port}/',
    version='1.0.0',
    capabilities=AgentCapabilities(streaming=True),
    skills=[skill]
)

class ProductExecutor(AgentExecutor):
    def __init__(self):
        self.agent = ProductResearchAgent()
    
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        result = await self.agent.invoke(context.get_user_input(), getattr(context, 'context_id', 'default'))
        await event_queue.enqueue_event(new_agent_text_message(result))

    async def cancel(self, context, event_queue): pass

def main():
    server = A2AStarletteApplication(
        agent_card=public_agent_card,
        http_handler=DefaultRequestHandler(ProductExecutor(), InMemoryTaskStore()),
        extended_agent_card=public_agent_card,
    )
    print(f"Starting Product Agent on port {port}")
    uvicorn.run(server.build(), host='0.0.0.0', port=port)

if __name__ == '__main__':
    main()
```

---

## 2. Update `package.json`

Add the start script (Windows format):
```json
"dev:product": "agents\\.venv\\Scripts\\python agents/product_agent.py"
```
And add it to the `concurrently` command in `"dev"`.

---

## 3. Register in A2A Middleware (`app/api/copilotkit/route.ts`)

Tell the Frontend that this agent exists so the tool can route to it.

```typescript
// 1. Define URL
const productAgentUrl = process.env.PRODUCT_AGENT_URL || "http://localhost:9006";

// 2. Add to Middleware
const a2aMiddlewareAgent = new A2AMiddlewareAgent({
    agentUrls: [
        itineraryAgentUrl,
        restaurantAgentUrl,
        budgetAgentUrl,
        weatherAgentUrl,
        productAgentUrl, // <--- Added here
    ],
    // ...
    instructions: `
      // ... existing instructions ...
      
      5. Product Agent - Check for essential gear deals
         - Pass: destination city
         - Look for adapters, chargers, or weather-appropriate gear
         
      // ...
    `
});
```

---

## 4. Create the UI Component (`components/ProductCard.tsx`)

Create a visual card to display the `product_research_results`.

```tsx
import React from "react";

export interface ProductResult {
  product_name: string;
  rating: string;
  best_deal: { price: number; retailer: string };
}

export const ProductCard = ({ data }: { data: { query: string; results: ProductResult[] } }) => {
  return (
    <div className="bg-white/80 rounded-xl p-4 border-2 border-purple-200 mt-2">
      <h3 className="font-bold text-purple-900">🛍️ Recommended Gear for {data.query}</h3>
      <div className="mt-2 space-y-2">
        {data.results.map((p, i) => (
          <div key={i} className="flex justify-between items-center bg-white p-2 rounded border">
            <div>
              <div className="font-semibold">{p.product_name}</div>
              <div className="text-xs text-gray-500">⭐ {p.rating}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-green-600">${p.best_deal.price}</div>
              <div className="text-xs text-gray-400">@ {p.best_deal.retailer}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 5. Update Chat to Render It (`components/travel-chat.tsx`)

Finally, hook it up in the frontend logic.

```tsx
// 1. Import
import { ProductCard } from "./ProductCard";

// 2. Add State
const [productData, setProductData] = useState<any>(null);

// 3. Update Extraction Logic (inside useEffect)
// ... inside the loop ...
else if (parsed.query && parsed.results && Array.isArray(parsed.results)) {
    // Detects product schema
    setProductData(parsed); 
}

// 4. Update CopilotAction to Render
useCopilotAction({
    name: "display_product_research", // Call this tool if agent explicitly requests display
    // ... parameters ...
    render: ({ args }) => <ProductCard data={args.data} />
});

// 5. Or pass to <ProductCard /> in the main layout
```

## 6. Display on Front End

Now, when you ask "Plan a trip to Tokyo", you can instruct the Orchestrator to also "Check for essential travel gear deals for Tokyo", and it will route to your new independent agent.
