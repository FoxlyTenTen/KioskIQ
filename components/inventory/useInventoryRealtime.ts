'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { mapSupabaseToKioskData } from './supabaseInventoryMapper';
import type { KioskData } from './types';

export function useInventoryRealtime(locationId: string) {
  const [kioskData, setKioskData] = useState<KioskData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [stockRes, expiryRes, locRes] = await Promise.all([
      supabase.from('inventory_stock').select('*').eq('location_id', locationId),
      supabase.from('inventory_expiry').select('item_name, expiry_date').eq('location_id', locationId),
      supabase.from('locations').select('location_id, location_name').eq('location_id', locationId).single(),
    ]);

    if (stockRes.data) {
      setKioskData(mapSupabaseToKioskData(
        stockRes.data,
        expiryRes.data ?? [],
        locationId,
        locRes.data?.location_name ?? locationId,
      ));
    }
    setLoading(false);
  }, [locationId]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`inventory_realtime_${locationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_stock' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_expiry' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, locationId]);

  return { kioskData, loading };
}
