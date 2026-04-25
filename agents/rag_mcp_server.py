import os
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from openai import OpenAI
from supabase import create_client

load_dotenv()

port = int(os.getenv("RAG_MCP_PORT", 9013))
mcp = FastMCP("KioskIQ RAG", host="0.0.0.0", port=port)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase_client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
)


@mcp.tool()
def search_business_data(query: str) -> str:
    """
    Search KioskIQ business data (inventory stock, expiry dates, POS orders, sales items)
    using semantic vector search. Use this for any question about stock levels,
    expiry alerts, sales trends, or order history.
    """
    res = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=query,
    )
    embedding = res.data[0].embedding

    result = supabase_client.rpc("match_rag_documents", {
        "query_embedding": embedding,
        "match_count": 6,
        "match_threshold": 0.3,
    }).execute()

    if not result.data:
        return "No relevant business data found. Make sure data has been synced first (use the Sync Data button on the Demand Forecasting page)."

    lines = [
        f"[{row['source_table']}] {row['content']}"
        for row in result.data
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    print(f"Starting KioskIQ RAG MCP Server on http://0.0.0.0:{port}/sse")
    mcp.run(transport="sse")
