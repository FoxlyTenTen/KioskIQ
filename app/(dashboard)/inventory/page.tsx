'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as Tabs from '@radix-ui/react-tabs';
import { Box, LayoutDashboard, Loader2, Radio } from 'lucide-react';
import { useInventoryRealtime } from '@/components/inventory/useInventoryRealtime';
import { LocationSelector } from '@/components/inventory/LocationSelector';
import { RackDetailsPanel } from '@/components/inventory/RackDetailsPanel';
import { UpdateStockDialog } from '@/components/inventory/UpdateStockDialog';
import { StockSummary } from '@/components/inventory/StockSummary';
import { StockTable } from '@/components/inventory/StockTable';
import { supabase } from '@/lib/supabase';
import type { InventoryItem, Rack } from '@/components/inventory/types';

const ThreeDStoreView = dynamic(
  () => import('@/components/inventory/ThreeDStoreView'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full bg-[#0a0a18] rounded-xl">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading 3D Store...</p>
        </div>
      </div>
    ),
  }
);

export default function InventoryPage() {
  const [selectedLocation, setSelectedLocation] = useState('outlet-1');
  const { kioskData, loading } = useInventoryRealtime(selectedLocation);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [updateTarget, setUpdateTarget] = useState<InventoryItem | null>(null);
  const [flashRackId, setFlashRackId] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedRack: Rack | null = kioskData?.racks.find(r => r.rack_id === selectedRackId) ?? null;
  const rackItems = selectedRack && kioskData
    ? kioskData.items.filter(item => selectedRack.items.includes(item.item_id))
    : [];

  const handleUpdateStock = useCallback(async (itemId: string, newQty: number) => {
    const item = kioskData?.items.find(i => i.item_id === itemId);
    const threshold = item?.min_stock ?? 0;
    const newStatus = newQty <= 0 || newQty < threshold * 0.5
      ? 'critical'
      : newQty < threshold
      ? 'warning'
      : 'ok';

    await supabase
      .from('inventory_stock')
      .update({ current_qty: newQty, status: newStatus })
      .eq('id', itemId);

    const rack = kioskData?.racks.find(r => r.items.includes(itemId));
    if (rack) {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlashRackId(rack.rack_id);
      flashTimerRef.current = setTimeout(() => setFlashRackId(null), 600);
    }
  }, [kioskData]);

  if (loading || !kioskData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Box className="h-6 w-6 text-primary" />
            Inventory & Waste
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{kioskData.kiosk_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <LocationSelector
            selectedLocation={selectedLocation}
            onSelect={(id) => { setSelectedLocation(id); setSelectedRackId(null); }}
          />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-500 text-xs font-medium">
            <Radio className="h-3 w-3 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="3d" className="flex flex-col flex-1 min-h-0">
        <Tabs.List className="flex gap-1 p-1 rounded-xl bg-muted w-fit shrink-0">
          <Tabs.Trigger
            value="3d"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Box className="h-4 w-4" />
            3D Store View
          </Tabs.Trigger>
          <Tabs.Trigger
            value="dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <LayoutDashboard className="h-4 w-4" />
            Stock Dashboard
          </Tabs.Trigger>
        </Tabs.List>

        {/* 3D View Tab */}
        <Tabs.Content value="3d" className="flex-1 min-h-0 mt-3">
          <div className="relative h-full min-h-[500px] rounded-xl overflow-hidden border border-border">
            <ThreeDStoreView
              kioskData={kioskData}
              onRackSelect={setSelectedRackId}
              selectedRackId={selectedRackId}
              flashRackId={flashRackId}
            />
            <RackDetailsPanel
              rack={selectedRack}
              items={rackItems}
              onClose={() => setSelectedRackId(null)}
              onUpdateStock={setUpdateTarget}
            />
          </div>
        </Tabs.Content>

        {/* Dashboard Tab */}
        <Tabs.Content value="dashboard" className="flex-1 min-h-0 mt-3 overflow-y-auto">
          <div className="space-y-6 pb-6">
            <StockSummary items={kioskData.items} />
            <StockTable items={kioskData.items} onUpdateStock={setUpdateTarget} />
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Update stock dialog */}
      <UpdateStockDialog
        item={updateTarget}
        onSave={handleUpdateStock}
        onClose={() => setUpdateTarget(null)}
      />
    </div>
  );
}
