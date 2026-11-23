import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProducts, getAllServices } from '@/db/api';
import type { CartItem, Product, Service } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Package, Wrench, ShoppingCart, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface SearchItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FilterType = 'all' | 'product' | 'service';

interface UnifiedSearchItem {
  type: 'product' | 'service';
  id: string;
  name: string;
  description: string;
  price: number;
  meta: string;
  barcode?: string | null;
  stock?: number;
  unit?: string;
  imageUrl?: string | null;
}

export default function SearchItemsDialog({ open, onOpenChange }: SearchItemsDialogProps) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const loadCatalog = async () => {
    try {
      const [prods, srvs] = await Promise.all([getAllProducts(), getAllServices()]);
      setProducts(prods || []);
      setServices(srvs || []);
    } catch (err) {
      console.error('Error loading search catalog:', err);
    }
  };

  useEffect(() => {
    if (open) {
      loadCatalog();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
    }
  }, [open]);

  useEffect(() => {
    const handleRefresh = () => {
      if (open) loadCatalog();
    };
    window.addEventListener('products-updated', handleRefresh);
    window.addEventListener('services-updated', handleRefresh);
    return () => {
      window.removeEventListener('products-updated', handleRefresh);
      window.removeEventListener('services-updated', handleRefresh);
    };
  }, [open]);

  const allItems = useMemo<UnifiedSearchItem[]>(() => {
    const prodItems: UnifiedSearchItem[] = products.map((p) => ({
      type: 'product',
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price || 0),
      meta: `${p.category} · Stock: ${p.stock_quantity}${p.barcode ? ` · ${p.barcode}` : ''}`,
      barcode: p.barcode,
      stock: p.stock_quantity,
      imageUrl: p.image_url,
    }));

    const srvItems: UnifiedSearchItem[] = services.map((s) => ({
      type: 'service',
      id: s.id,
      name: s.name,
      description: s.description || '',
      price: Number(s.base_price || 0),
      meta: `Service · ${s.unit}`,
      unit: s.unit,
    }));

    return [...prodItems, ...srvItems];
  }, [products, services]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.meta.toLowerCase().includes(q) ||
        (item.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [allItems, query, filterType]);

  const handleAddToCart = (item: UnifiedSearchItem) => {
    if (item.type === 'product' && (item.stock ?? 0) <= 0) {
      toast.error(`${item.name} is out of stock`);
      return;
    }

    try {
      const existingCart: CartItem[] = JSON.parse(sessionStorage.getItem('cart') || '[]');
      const existingIndex = existingCart.findIndex(
        (c) => c.id === item.id && c.type === item.type
      );

      if (existingIndex !== -1) {
        const currentQty = existingCart[existingIndex].quantity || 0;
        if (item.type === 'product' && item.stock !== undefined && currentQty + 1 > item.stock) {
          toast.error(`Only ${item.stock} unit(s) available for ${item.name}`);
          return;
        }
        existingCart[existingIndex] = {
          ...existingCart[existingIndex],
          quantity: currentQty + 1,
        };
      } else {
        existingCart.push({
          type: item.type,
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          unit: item.unit,
          stock: item.stock,
        });
      }

      sessionStorage.setItem('cart', JSON.stringify(existingCart));
      window.dispatchEvent(new Event('cart-updated'));
      toast.success(`Added "${item.name}" to cart`);
    } catch (err) {
      console.error('Error adding searched item to cart:', err);
      toast.error('Failed to add item to cart');
    }
  };

  const handleGoToItemPage = (item: UnifiedSearchItem) => {
    onOpenChange(false);
    navigate(item.type === 'product' ? '/products' : '/services');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inputRef.current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col glass-surface glass-section border-2 border-sky-500/35 dark:border-sky-400/30 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            Search Items
          </DialogTitle>
          <DialogDescription>
            Find products and services by name, category, or description
          </DialogDescription>
        </DialogHeader>

        {/* Search Input & Submit Button */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, cables, printing, PC station..."
              className="pl-9 pr-9 h-10 rounded-xl border-2 border-sky-500/30 focus-visible:ring-sky-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" className="h-10 px-4 rounded-xl shrink-0 cursor-pointer">
            <Search className="h-4 w-4 mr-1.5" />
            Search
          </Button>
        </form>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between gap-2 pt-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/60">
            {(
              [
                { id: 'all', label: `All (${allItems.length})` },
                { id: 'product', label: `Products (${products.length})` },
                { id: 'service', label: `Services (${services.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterType === tab.id
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground tabular-nums">
            {filteredItems.length} result{filteredItems.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Results List */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[50vh]">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Search className="h-10 w-10 mx-auto text-muted-foreground opacity-50" />
              <div>
                <p className="font-semibold text-foreground">No matching items found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Try another keyword or clear your search filter.
                </p>
              </div>
              {query && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setFilterType('all');
                  }}
                  className="cursor-pointer"
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const outOfStock = item.type === 'product' && (item.stock ?? 0) <= 0;
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="glass-surface glass-animated flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-white/15"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.type === 'product' && item.imageUrl ? (
                      <div className="h-12 w-12 aspect-square rounded-lg border border-border bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${
                          item.type === 'product'
                            ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                            : 'bg-sky-500/12 text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {item.type === 'product' ? (
                          <Package className="h-5 w-5" />
                        ) : (
                          <Wrench className="h-5 w-5" />
                        )}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {item.meta}
                      </p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground/85 truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <span className="font-bold text-sm tabular-nums text-foreground mr-1">
                      GH₵{item.price.toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGoToItemPage(item)}
                      className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                    >
                      View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={outOfStock}
                      onClick={() => handleAddToCart(item)}
                      className="h-8 px-3 text-xs rounded-lg cursor-pointer"
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                      {outOfStock ? 'Out of Stock' : 'Add'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-3 mt-2 border-t border-border flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Tip: Press Ctrl+K / ⌘K anytime to search items
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              navigate('/checkout');
            }}
            className="ml-auto rounded-xl cursor-pointer"
          >
            Go to Checkout
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
