"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function RagChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [embedding, setEmbedding] = useState(false);
  const [embedCount, setEmbedCount] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleEmbed = async () => {
    setEmbedding(true);
    try {
      const res = await fetch('/api/rag/embed', { method: 'POST' });
      const data = await res.json();
      if (data.embedded != null) setEmbedCount(data.embedded);
    } finally {
      setEmbedding(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages([...next, assistantMsg]);

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: next.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: full };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Inventory & Demand AI
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ask about stock levels, sales trends, expiry alerts, and more
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEmbed}
          disabled={embedding}
          className="text-xs"
        >
          {embedding ? (
            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Embedding...</>
          ) : (
            'Sync Data'
          )}
        </Button>
      </div>

      {embedCount !== null && (
        <div className="px-4 py-2 bg-green-50 border-b border-green-100 shrink-0">
          <p className="text-xs text-green-700">
            ✓ Synced {embedCount} records into vector store.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-muted-foreground">
            <Database className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">Ask anything about your business data</p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'What items are critically low?',
                'What sold the most today?',
                'Which items expire soon?',
                'What is today\'s revenue?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-xs opacity-60 mt-2">Click <strong>Sync Data</strong> first to load your latest data.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <Badge variant="outline" className="mr-2 self-start mt-1 text-[10px] shrink-0">
                AI
              </Badge>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && msg.content === '' && (
                <Loader2 className="h-3 w-3 animate-spin inline" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about inventory, sales, demand..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
