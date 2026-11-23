import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getAllProducts, createProduct, updateProduct, deleteProduct } from '@/db/api';
import { uploadProductImage, deleteProductImage } from '@/lib/imageUpload';
import type { Product, CartItem } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShoppingCart, Plus, Minus, Package, Edit, Trash2, ImageIcon, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('');

  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadProducts();

    const handleUpdate = () => {
      loadProducts();
    };
    window.addEventListener('products-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('products-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (productId: string, delta: number, maxStock: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const newValue = Math.max(0, Math.min(maxStock, current + delta));
      return { ...prev, [productId]: newValue };
    });
  };

  const setQuantity = (productId: string, value: number, maxStock: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, Math.min(maxStock, value))
    }));
  };

  const addToCart = () => {
    const cartItems: CartItem[] = products
      .filter(product => (quantities[product.id] || 0) > 0)
      .map(product => ({
        type: 'product' as const,
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantities[product.id],
        stock: product.stock_quantity
      }));

    if (cartItems.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    const existingCart = JSON.parse(sessionStorage.getItem('cart') || '[]');
    const updatedCart = [...existingCart, ...cartItems];
    sessionStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cart-updated'));

    toast.success(`Added ${cartItems.length} product(s) to cart`);
    navigate('/checkout');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, GIF, WEBP, or AVIF images.');
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormStock('');
    setFormCategory('');
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(0);
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description || '');
    setFormPrice(product.price.toString());
    setFormStock(product.stock_quantity.toString());
    setFormCategory(product.category);
    setImageFile(null);
    setImagePreview(product.image_url || null);
    setUploadProgress(0);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName || !formPrice || !formStock || !formCategory) {
      toast.error('Please fill in all required fields');
      return;
    }

    const price = parseFloat(formPrice);
    const stock = parseInt(formStock);

    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (isNaN(stock) || stock < 0) {
      toast.error('Please enter a valid stock quantity');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = editingProduct?.image_url || null;

      if (imageFile) {
        const result = await uploadProductImage(imageFile, setUploadProgress);
        imageUrl = result.url;

        if (result.compressed) {
          toast.info(
            `Image compressed from ${(result.originalSize / 1024).toFixed(0)}KB to ${(result.finalSize / 1024).toFixed(0)}KB`
          );
        }

        if (editingProduct?.image_url) {
          await deleteProductImage(editingProduct.image_url);
        }
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formName,
          description: formDescription || null,
          price,
          stock_quantity: stock,
          category: formCategory,
          image_url: imageUrl
        });
        toast.success('Product updated successfully');
      } else {
        await createProduct({
          name: formName,
          description: formDescription,
          price,
          stock_quantity: stock,
          category: formCategory,
          image_url: imageUrl || undefined
        });
        toast.success('Product created successfully');
      }

      setDialogOpen(false);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      if (productToDelete.image_url) {
        await deleteProductImage(productToDelete.image_url);
      }

      await deleteProduct(productToDelete.id);
      toast.success('Product deleted successfully');
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProducts = normalizedQuery
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(normalizedQuery) ||
          product.category.toLowerCase().includes(normalizedQuery) ||
          (product.description || '').toLowerCase().includes(normalizedQuery)
      )
    : products;

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-surface glass-header-bar glass-section">
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Select products for checkout</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32 bg-muted" />
                <Skeleton className="h-4 w-24 bg-muted" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-surface glass-header-bar glass-section flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage products and inventory' : 'Select products for checkout'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={openCreateDialog} size="lg" className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          )}
          <Button onClick={addToCart} size="lg" variant="default" className="cursor-pointer">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>

      {/* Glass Search Bar */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="glass-surface glass-section rounded-2xl border border-slate-200/80 dark:border-white/15 p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name, category, or description..."
            className="pl-9 pr-9 h-10 rounded-xl border-2 border-emerald-500/30 focus-visible:ring-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear product search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            className="h-10 px-4 rounded-xl cursor-pointer whitespace-nowrap shrink-0"
          >
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          {searchQuery && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setSearchQuery('')}
              className="h-10 px-3 rounded-xl cursor-pointer whitespace-nowrap shrink-0"
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {Object.keys(groupedProducts).length === 0 ? (
        <Card className="border-2 border-emerald-500/30 rounded-xl shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <Search className="h-12 w-12 text-muted-foreground opacity-50" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">No matching products found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? `No products matched "${searchQuery}".`
                  : 'No products available in inventory.'}
              </p>
            </div>
            {searchQuery && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearchQuery('')}
                className="cursor-pointer"
              >
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold capitalize flex items-center gap-2">
            <Package className="h-5 w-5 text-success" />
            {category}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categoryProducts.map((product, idx) => (
              <Card
                key={product.id}
                style={{ animationDelay: `${Math.min(idx, 5) * 45}ms` }}
                className="border-2 border-emerald-500/35 dark:border-emerald-400/35 hover:border-emerald-500 rounded-xl shadow-xs hover:shadow-md overflow-hidden"
              >
                {product.image_url && (
                  <div className="w-full aspect-square overflow-hidden rounded-t-lg bg-muted/40 border-b-2 border-emerald-500/20 flex items-center justify-center p-2">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-base font-semibold">{product.name}</span>
                    <Badge className="bg-success text-success-foreground hover:bg-success/90 tabular-nums shadow-2xs">
                      GH₵{product.price.toFixed(2)}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {product.description}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={product.stock_quantity > 10 ? 'default' : 'destructive'}
                        className={
                          product.stock_quantity > 10
                            ? 'bg-success text-success-foreground'
                            : ''
                        }
                      >
                        Stock: {product.stock_quantity}
                      </Badge>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(product.id, -1, product.stock_quantity)}
                      disabled={(quantities[product.id] || 0) === 0}
                      className="border-2 border-emerald-500/35 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      max={product.stock_quantity}
                      value={quantities[product.id] || 0}
                      onChange={(e) =>
                        setQuantity(
                          product.id,
                          parseInt(e.target.value) || 0,
                          product.stock_quantity
                        )
                      }
                      className="text-center border-2 border-emerald-500/35 focus-visible:ring-emerald-500 tabular-nums font-semibold rounded-lg"
                      disabled={product.stock_quantity === 0}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(product.id, 1, product.stock_quantity)}
                      disabled={(quantities[product.id] || 0) >= product.stock_quantity}
                      className="border-2 border-emerald-500/35 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {(quantities[product.id] || 0) > 0 && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold text-center tabular-nums">
                      Subtotal: GH₵{((quantities[product.id] || 0) * product.price).toFixed(2)}
                    </p>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-2 border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg"
                        onClick={() => openEditDialog(product)}
                      >
                        <Edit className="h-4 w-4 mr-1 text-emerald-600 dark:text-emerald-400" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-2 border-border hover:border-destructive/60 rounded-lg"
                        onClick={() => {
                          setProductToDelete(product);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Add / Edit Product Popup Window */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingProduct(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col glass-surface border-2 border-emerald-500/35 dark:border-emerald-400/30 rounded-2xl shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 mb-0 border-b border-border/60 shrink-0">
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product details below.' : 'Enter details to create a new product.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-image">Product Image</Label>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-32 h-32 aspect-square border border-border rounded-lg overflow-hidden bg-muted/40 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 border border-border rounded-lg flex items-center justify-center bg-muted shrink-0">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Input
                      id="product-image"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                      onChange={handleImageSelect}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max 1MB. Larger images will be compressed automatically.
                    </p>
                  </div>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <Progress value={uploadProgress} className="w-full" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Wireless Mouse"
                    required
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Product description..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (GH₵) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g., accessories, storage, cables"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/60 shrink-0 flex gap-2 justify-end bg-card/40">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
                {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
