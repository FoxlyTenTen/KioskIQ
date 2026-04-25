import type { KioskData, InventoryItem, Rack } from './types';

interface StockRow {
  item_id?: string;
  id?: string;
  item_name: string;
  category?: string;
  unit: string;
  current_qty: number;
  threshold_qty: number;
}

interface ExpiryRow {
  item_name: string;
  expiry_date: string;
}

function getCategory(name: string): string {
  const n = name.toLowerCase();
  if (/chicken|beef|egg|tofu|meat|pork|lamb/.test(n)) return 'Protein';
  if (/shrimp|fish|prawn|crab|squid|salmon/.test(n)) return 'Seafood';
  if (/milk|cheese|mozzarella|yogurt|cream|butter/.test(n)) return 'Dairy';
  if (/lettuce|tomato|basil|spinach|carrot|onion|cabbage|broccoli/.test(n)) return 'Vegetable';
  if (/ice cream|frozen|fries|nugget/.test(n)) return 'Frozen';
  if (/rice|flour|noodle|bread|bun|pasta|oat/.test(n)) return 'Grain';
  if (/sauce|ketchup|soy|oil|vinegar|sambal|mayo/.test(n)) return 'Sauce';
  if (/latte|coffee|drink|cola|juice|tea|water/.test(n)) return 'Beverage';
  return 'default';
}

function getIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('egg')) return '🥚';
  if (n.includes('chicken')) return '🍗';
  if (n.includes('beef')) return '🥩';
  if (n.includes('shrimp') || n.includes('prawn')) return '🍤';
  if (n.includes('fish') || n.includes('salmon')) return '🐟';
  if (n.includes('milk')) return '🥛';
  if (n.includes('cheese') || n.includes('mozzarella')) return '🧀';
  if (n.includes('tomato')) return '🍅';
  if (n.includes('lettuce') || n.includes('spinach')) return '🥬';
  if (n.includes('basil')) return '🌿';
  if (n.includes('carrot')) return '🥕';
  if (n.includes('rice') || n.includes('flour')) return '🌾';
  if (n.includes('noodle') || n.includes('pasta')) return '🍜';
  if (n.includes('bread') || n.includes('bun')) return '🍞';
  if (n.includes('sauce') || n.includes('sambal')) return '🌶️';
  if (n.includes('ketchup')) return '🍅';
  if (n.includes('soy') || n.includes('oil')) return '🫙';
  if (n.includes('latte') || n.includes('coffee')) return '☕';
  if (n.includes('drink') || n.includes('cola') || n.includes('juice')) return '🥤';
  if (n.includes('ice cream')) return '🍦';
  if (n.includes('fries') || n.includes('frozen')) return '🍟';
  return '📦';
}

const RACKS: Rack[] = [
  { rack_id: 'rack_fridge_protein', rack_name: 'Protein & Seafood Fridge', type: 'fridge', location_3d: { x: -4, y: 0, z: -3 }, items: [] },
  { rack_id: 'rack_fridge_fresh',   rack_name: 'Fresh & Dairy Fridge',     type: 'fridge', location_3d: { x: -4, y: 0, z:  2 }, items: [] },
  { rack_id: 'rack_freezer',        rack_name: 'Freezer',                  type: 'freezer', location_3d: { x:  5, y: 0, z:  2 }, items: [] },
  { rack_id: 'rack_shelf_dry',      rack_name: 'Dry Goods Shelf',          type: 'shelf',   location_3d: { x:  1, y: 0, z: -3 }, items: [] },
  { rack_id: 'rack_shelf_sauce',    rack_name: 'Sauce & Beverages Shelf',  type: 'shelf',   location_3d: { x:  5, y: 0, z: -3 }, items: [] },
];

function getRackId(category: string): string {
  if (category === 'Protein' || category === 'Seafood') return 'rack_fridge_protein';
  if (category === 'Vegetable' || category === 'Dairy') return 'rack_fridge_fresh';
  if (category === 'Frozen') return 'rack_freezer';
  if (category === 'Grain' || category === 'Bakery') return 'rack_shelf_dry';
  return 'rack_shelf_sauce';
}

export function mapSupabaseToKioskData(
  stockRows: StockRow[],
  expiryRows: ExpiryRow[],
  kioskId = 'main_store',
  kioskName = 'Main Store',
): KioskData {
  const expiryMap = new Map<string, string>();
  for (const row of expiryRows) {
    expiryMap.set(row.item_name.toLowerCase(), row.expiry_date);
  }

  const items: InventoryItem[] = stockRows.map((row, index) => {
    const category = getCategory(row.item_name);
    return {
      item_id: row.item_id ?? row.id ?? `item-${index}`,
      item_name: row.item_name,
      category,
      unit: row.unit || 'pcs',
      icon: getIcon(row.item_name),
      current_stock: row.current_qty,
      min_stock: row.threshold_qty,
      max_stock: row.threshold_qty * 3,
      expiry_date: expiryMap.get(row.item_name.toLowerCase()) ?? '',
      rack_position: getRackId(category),
    };
  });

  const racks: Rack[] = RACKS.map(rack => ({
    ...rack,
    items: items
      .filter(item => item.rack_position === rack.rack_id)
      .map(item => item.item_id),
  }));

  return {
    kiosk_id: kioskId,
    kiosk_name: kioskName,
    items,
    racks,
  };
}
