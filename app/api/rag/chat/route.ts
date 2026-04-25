import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ILMU uses OpenAI-compatible format
const glm = new OpenAI({
  apiKey: process.env.ILMU_API_KEY,
  baseURL: 'https://api.ilmu.ai/v1',
});

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();

  // 1. Embed the user query using OpenAI
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: message,
  });
  const queryEmbedding = embeddingRes.data[0].embedding;

  // 2. Retrieve relevant chunks via Supabase vector search
  const supabase = createServiceClient();
  const { data: chunks, error } = await supabase.rpc('match_rag_documents', {
    query_embedding: queryEmbedding,
    match_count: 6,
    match_threshold: 0.3,
  });

  if (error) {
    return new Response(`Error retrieving context: ${error.message}`, { status: 500 });
  }

  const context = (chunks ?? [])
    .map((c: { content: string; source_table: string }) => `[${c.source_table}] ${c.content}`)
    .join('\n');

  const systemPrompt = `You are KioskIQ's AI assistant. You help kiosk operators understand their inventory, sales, and demand trends.

Use the following retrieved data to answer the user's question accurately and concisely.
If the data does not contain enough information to answer, say so clearly.

Retrieved context:
${context || 'No relevant data found. The user may need to click Sync Data first.'}`;

  // 3. Stream response from GLM via ILMU OpenAI-compatible endpoint
  const stream = await glm.chat.completions.create({
    model: 'ilmu-glm-5.1',
    max_tokens: 1024,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
