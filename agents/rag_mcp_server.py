"""
RAG MCP Server — KioskIQ
Semantic search over embedded business documents.
Use ONLY for: general context, narrative descriptions, trend explanations,
AI insights, and overview summaries.
Do NOT use for: revenue totals, order counts, stock quantities, comparisons,
or any question that needs an exact number — use the SQL MCP server for those.
"""

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
def search_business_context(query: str) -> str:
    """
    Search for narrative context, AI insights, and general overview information
    about the kiosk business using semantic vector search.

    Use this ONLY for:
    - General business overview ("how is the business doing?")
    - AI-generated insights and recommendations
    - Narrative descriptions of trends ("why is stock low?")
    - Background context about items or categories

    Do NOT use this for exact numbers, totals, counts, or comparisons.
    For revenue, orders, stock quantities, or expiry dates — use the SQL tools instead.
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
        return "No relevant context found. The user may need to sync data first."

    lines = [
        f"[{row['source_table']}] {row['content']}"
        for row in result.data
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    print(f"Starting KioskIQ RAG MCP Server on http://0.0.0.0:{port}/sse")
    mcp.run(transport="sse")
