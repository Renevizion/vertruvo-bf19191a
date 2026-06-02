import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Minus, 
  Trash2, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  FileText,
  Ticket,
  Wallet,
  MoreHorizontal,
  ShoppingCart,
  User
} from "lucide-react";
import { toast } from "sonner";
import { SalesReceiptDialog } from "./SalesReceiptDialog";

type PaymentMethod = 'cash' | 'check' | 'card' | 'card_on_file' | 'charge_to_account' | 'coupon' | 'other';

interface CartItem {
  item_id: string;
  title: string;
  unit_price: number;
  quantity: number;
  discount: number;
}

interface PointOfSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    value?: number;
  } | null;
  initialItems?: { item_id: string; quantity?: number }[];
  onSaleCompleted?: (sale: { id: string }) => void;
}

export function PointOfSaleDialog({ open, onOpenChange, lead, initialItems, onSaleCompleted }: PointOfSaleDialogProps) {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [notes, setNotes] = useState("");
  const didPrefillRef = useRef(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    sale: any;
    items: any[];
    customer: any;
    business: any;
  } | null>(null);

  const { data: items } = useQuery({
    queryKey: ['items-active'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .single();
      
      if (!profile) return [];

      const { data: workspace } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', profile.id)
        .single();

      if (!workspace) return [];

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('workspace_id', workspace.workspace_id)
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      return data;
    },
    enabled: open
  });

  useEffect(() => {
    if (!open) {
      didPrefillRef.current = false;
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!items) return;
    if (!initialItems || initialItems.length === 0) return;
    if (didPrefillRef.current) return;

    didPrefillRef.current = true;

    setCart((prev) => {
      // If the caller opens POS for a booking, start with a fresh cart.
      const next: CartItem[] = [];
      for (const ii of initialItems) {
        const found = items.find((it) => it.id === ii.item_id);
        if (!found) continue;
        next.push({
          item_id: found.id,
          title: found.title,
          unit_price: Number(found.price ?? 0),
          quantity: Math.max(1, ii.quantity ?? 1),
          discount: 0,
        });
      }
      return next.length ? next : prev;
    });
  }, [open, items, initialItems]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const itemTotal = (item.unit_price * item.quantity) - item.discount;
      return sum + itemTotal;
    }, 0);
  }, [cart]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - overallDiscount);
  }, [subtotal, overallDiscount]);

  const addToCart = (item: { id: string; title: string; price: number }) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) {
        return prev.map(c => 
          c.item_id === item.id 
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, {
        item_id: item.id,
        title: item.title,
        unit_price: item.price,
        quantity: 1,
        discount: 0,
      }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(c => {
        if (c.item_id === itemId) {
          const newQty = Math.max(1, c.quantity + delta);
          return { ...c, quantity: newQty };
        }
        return c;
      });
    });
  };

  const updateItemDiscount = (itemId: string, discount: number) => {
    setCart(prev => {
      return prev.map(c => 
        c.item_id === itemId 
          ? { ...c, discount: Math.max(0, discount) }
          : c
      );
    });
  };

  const updateItemPrice = (itemId: string, price: number) => {
    setCart(prev => {
      return prev.map(c => 
        c.item_id === itemId 
          ? { ...c, unit_price: Math.max(0, price) }
          : c
      );
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item_id !== itemId));
  };

  const completeSale = useMutation({
    mutationFn: async () => {
      if (!paymentMethod) throw new Error("Select a payment method");
      if (cart.length === 0) throw new Error("Cart is empty");

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .single();
      
      if (!profile) throw new Error("No profile found");

      const { data: workspace } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', profile.id)
        .single();

      if (!workspace) throw new Error("No workspace found");

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          workspace_id: workspace.workspace_id,
          lead_id: lead?.id || null,
          status: 'paid',
          payment_method: paymentMethod,
          subtotal: subtotal,
          discount_amount: overallDiscount,
          total: total,
          notes: notes || null,
          paid_at: new Date().toISOString(),
          created_by: profile.id,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        item_id: item.item_id,
        item_title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: (item.unit_price * item.quantity) - item.discount,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      return sale;
    },
    onSuccess: async (sale) => {
      // Log activity linking sale to lead
      if (lead?.id) {
        const { data: profile } = await supabase.from('profiles').select('id').single();
        const { data: workspace } = profile
          ? await supabase.from('workspace_members').select('workspace_id').eq('user_id', profile.id).single()
          : { data: null };

        if (workspace) {
          await supabase.from('activities').insert({
            lead_id: lead.id,
            type: 'sale',
            title: `Sale completed - $${total.toFixed(2)}`,
            description: `Payment: ${paymentMethod}. Items: ${cart.map(c => `${c.title} x${c.quantity}`).join(', ')}`,
            created_by: profile?.id,
            workspace_id: workspace.workspace_id,
          });

          await supabase.from('leads')
            .update({ value: (lead.value || 0) + total })
            .eq('id', lead.id);

          // Also promote lead to customer on successful sale
          await supabase.from('leads')
            .update({ contact_type: 'customer' })
            .eq('id', lead.id);
        }
      }

      // Fetch business info for receipt
      let businessInfo = null;
      try {
        const { data: profile } = await supabase.from('profiles').select('id').single();
        if (profile) {
          const { data: ws } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', profile.id).single();
          if (ws) {
            const { data: biz } = await supabase.from('business_settings').select('business_name, business_phone, business_email, city, state_province, postal_code').eq('workspace_id', ws.workspace_id).single();
            if (biz) businessInfo = { name: biz.business_name, phone: biz.business_phone, email: biz.business_email, city: biz.city, state_province: biz.state_province, postal_code: biz.postal_code };
          }
        }
      } catch {}

      // Show receipt
      setReceiptData({
        sale: { ...sale, payment_method: paymentMethod },
        items: cart.map(c => ({ item_title: c.title, quantity: c.quantity, unit_price: c.unit_price, discount: c.discount, total: (c.unit_price * c.quantity) - c.discount })),
        customer: lead ? { name: lead.name, email: lead.email, phone: lead.phone } : null,
        business: businessInfo,
      });

      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success("Sale completed successfully!");
      onSaleCompleted?.({ id: sale.id });
      onOpenChange(false);
      setReceiptOpen(true);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const resetAndClose = () => {
    setCart([]);
    setOverallDiscount(0);
    setPaymentMethod(null);
    setNotes("");
    onOpenChange(false);
  };

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'cash', label: 'Cash', icon: <Banknote className="h-4 w-4" /> },
    { value: 'card', label: 'Card', icon: <CreditCard className="h-4 w-4" /> },
    { value: 'card_on_file', label: 'Card on File', icon: <Wallet className="h-4 w-4" /> },
    { value: 'check', label: 'Check', icon: <FileText className="h-4 w-4" /> },
    { value: 'charge_to_account', label: 'Charge to Account', icon: <DollarSign className="h-4 w-4" /> },
    { value: 'coupon', label: 'Coupon', icon: <Ticket className="h-4 w-4" /> },
    { value: 'other', label: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> },
  ];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Point of Sale
            {lead && (
              <Badge variant="secondary" className="ml-2">
                <User className="h-3 w-3 mr-1" />
                {lead.name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          {/* Items Selection */}
          <div className="flex flex-col overflow-hidden">
            <h3 className="font-medium mb-2">Select Items</h3>
            <ScrollArea className="flex-1 border rounded-lg p-2">
              <div className="grid grid-cols-2 gap-2">
                {items?.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="p-3 text-left border rounded-lg hover:bg-accent hover:border-primary/50 transition-colors"
                  >
                    <div className="font-medium text-sm truncate">{item.title}</div>
                    <div className="text-xs text-muted-foreground capitalize">{item.item_type}</div>
                    <div className="font-semibold text-primary mt-1">${item.price.toFixed(2)}</div>
                  </button>
                ))}
                {(!items || items.length === 0) && (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    No active items. Add items in Settings.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Cart & Checkout */}
          <div className="flex flex-col overflow-hidden">
            <h3 className="font-medium mb-2">Cart ({cart.length} items)</h3>
            <div className="flex-1 border rounded-lg flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Select items to add to cart
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <Card key={item.item_id} className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm">{item.title}</div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeFromCart(item.item_id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <Label className="text-xs">Qty</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.item_id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.item_id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => updateItemPrice(item.item_id, parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Discount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.discount || ""}
                              onChange={(e) => updateItemDiscount(item.item_id, parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="text-right mt-2 font-medium">
                          ${((item.unit_price * item.quantity) - item.discount).toFixed(2)}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Totals & Payment */}
              <div className="border-t p-3 space-y-3 bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Overall Discount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={overallDiscount || ""}
                    onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                    className="h-8"
                    placeholder="0.00"
                  />
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {paymentMethods.map((pm) => (
                      <Button
                        key={pm.value}
                        variant={paymentMethod === pm.value ? "default" : "outline"}
                        size="sm"
                        className="h-auto py-2 flex flex-col gap-1"
                        onClick={() => setPaymentMethod(pm.value)}
                      >
                        {pm.icon}
                        <span className="text-[10px]">{pm.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a note..."
                  />
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={cart.length === 0 || !paymentMethod || completeSale.isPending}
                  onClick={() => completeSale.mutate()}
                >
                  {completeSale.isPending ? "Processing..." : `Complete Sale - $${total.toFixed(2)}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      <SalesReceiptDialog
        open={receiptOpen}
        onOpenChange={(v) => {
          setReceiptOpen(v);
          if (!v) resetAndClose();
        }}
        sale={receiptData?.sale ?? null}
        items={receiptData?.items ?? []}
        customer={receiptData?.customer ?? null}
        business={receiptData?.business ?? null}
      />
    </>
  );
}
