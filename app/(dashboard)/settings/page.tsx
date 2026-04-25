'use client';

import { useState } from 'react';
import { Database, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type SyncStatus = 'idle' | 'running' | 'success' | 'error';

export default function SettingsPage() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [embedded, setEmbedded] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('rag_last_sync') : null,
  );

  const handleSync = async () => {
    setStatus('running');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/rag/embed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setEmbedded(data.embedded);
      setStatus('success');
      const now = new Date().toLocaleString('en-MY');
      setLastSync(now);
      localStorage.setItem('rag_last_sync', now);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage AI data sync and application configuration</p>
      </div>

      {/* Vector DB Sync Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Vector Database Sync
          </CardTitle>
          <CardDescription>
            Sync all current inventory, sales, and demand data into the vector store so the RAG
            chatbot always answers from the latest records. Duplicates are automatically replaced.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Status:</span>
            {status === 'idle' && <Badge variant="outline">Not synced yet this session</Badge>}
            {status === 'running' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Syncing...
              </Badge>
            )}
            {status === 'success' && (
              <Badge className="bg-green-500/20 text-green-600 border-green-500/30 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Synced — {embedded} records
              </Badge>
            )}
            {status === 'error' && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" /> Failed
              </Badge>
            )}
          </div>

          {lastSync && (
            <p className="text-xs text-muted-foreground">Last synced: {lastSync}</p>
          )}

          {errorMsg && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {errorMsg}
            </p>
          )}

          {/* What gets synced */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What gets synced</p>
            <ul className="space-y-1 text-sm">
              {[
                ['inventory_stock', 'Current stock levels + status for all locations'],
                ['inventory_expiry', 'Near-expiry items for all locations'],
                ['pos_orders', 'Last 30 days of order headers'],
                ['pos_order_items', 'Line items linked to those orders'],
                ['pos_orders_daily', 'Last 90 days of actual vs predicted trends'],
              ].map(([table, desc]) => (
                <li key={table} className="flex items-start gap-2">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-primary shrink-0 mt-0.5">{table}</span>
                  <span className="text-muted-foreground">{desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            onClick={handleSync}
            disabled={status === 'running'}
            className="w-full sm:w-auto"
          >
            {status === 'running' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing to Vector DB...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> Sync Now</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
