'use client';

import { useState, Fragment } from 'react';
import { Pencil, Download, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { InventoryItem } from './types';
import {
  calculateAlertStatus,
  getStatusBadgeClass,
  getStatusLabel,
  getStatusRowClass,
  formatRelativeExpiry,
  suggestReorder,
  exportReorderCSV,
} from './inventoryUtils';

interface StockTableProps {
  items: InventoryItem[];
  onUpdateStock: (item: InventoryItem) => void;
}

export function StockTable({ items, onUpdateStock }: StockTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showReorder, setShowReorder] = useState(false);

  const reorderList = suggestReorder(items);

  return (
    <>
      {/* Table header with actions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Inventory Items</h2>
        <button
          onClick={() => setShowReorder(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          Suggest Reorder
          {reorderList.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {reorderList.length}
            </span>
          )}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Item</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider hidden sm:table-cell">Category</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Stock</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider hidden md:table-cell">Min / Max</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider hidden lg:table-cell">Expires</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((item, index) => {
                const status = calculateAlertStatus(item);
                const expiry = formatRelativeExpiry(item.expiry_date);
                const stockPercent = Math.min(100, (item.current_stock / item.max_stock) * 100);
                const isExpanded = expandedId === item.item_id;

                return (
                  <Fragment key={item.item_id ?? index}>
                    <tr
                      className={`${getStatusRowClass(status)} hover:bg-accent/30 transition-colors cursor-pointer`}
                      onClick={() => setExpandedId(isExpanded ? null : item.item_id)}
                    >
                      {/* Item name + icon */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{item.icon}</span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.item_name}</p>
                            <p className="text-xs text-muted-foreground">{item.item_id}</p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3 text-muted-foreground ml-1" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{item.category}</span>
                      </td>

                      {/* Stock with mini bar */}
                      <td className="px-4 py-3">
                        <div className="space-y-1 min-w-[80px]">
                          <span className="text-sm font-semibold text-foreground">
                            {item.current_stock}
                            <span className="text-xs text-muted-foreground font-normal ml-1">{item.unit}</span>
                          </span>
                          <div className="h-1 bg-muted rounded-full overflow-hidden w-16">
                            <div
                              className={`h-full rounded-full ${
                                status === 'expired' || status === 'expiring_soon'
                                  ? 'bg-red-500'
                                  : status === 'low'
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${stockPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Min/Max */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          <span className="text-yellow-400">{item.min_stock}</span>
                          {' / '}
                          <span className="text-green-400">{item.max_stock}</span>
                        </span>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusBadgeClass(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs ${expiry.className}`}>{expiry.text}</span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onUpdateStock(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all font-medium"
                        >
                          <Pencil className="h-3 w-3" />
                          Update
                        </button>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr className={`${getStatusRowClass(status)} border-b border-border/30`}>
                        <td colSpan={7} className="px-6 pb-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 p-4 bg-muted/20 rounded-xl">
                            <div>
                              <p className="text-xs text-muted-foreground">Rack Position</p>
                              <p className="text-sm font-medium text-foreground">{item.rack_position}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Expiry Date</p>
                              <p className={`text-sm font-medium ${expiry.className}`}>{item.expiry_date}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Stock Level</p>
                              <p className="text-sm font-medium text-foreground">
                                {Math.round(stockPercent)}% of max
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Needs Restock</p>
                              <p className="text-sm font-medium text-foreground">
                                {item.current_stock < item.min_stock
                                  ? `+${item.max_stock - item.current_stock} ${item.unit}`
                                  : 'No'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reorder modal */}
      {showReorder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={e => e.target === e.currentTarget && setShowReorder(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border bg-muted/30">
              <div>
                <h3 className="font-semibold text-foreground">Suggested Reorder List</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{reorderList.length} items need restocking</p>
              </div>
              <button onClick={() => setShowReorder(false)} className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
              {reorderList.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">All items are sufficiently stocked!</p>
              ) : (
                reorderList.map(({ item, reorderQty }) => (
                  <div key={item.item_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">Current: {item.current_stock} / Min: {item.min_stock}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">+{reorderQty}</p>
                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 p-5 pt-0 border-t border-border">
              <button onClick={() => setShowReorder(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-accent text-sm font-medium transition-all">
                Close
              </button>
              <button
                onClick={() => { exportReorderCSV(reorderList); setShowReorder(false); }}
                disabled={reorderList.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 text-sm font-medium transition-all shadow-md"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
