import { useMemo } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, Mail, Receipt, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface SaleReceiptItem {
  item_title: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

interface SaleReceipt {
  id: string;
  created_at: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  payment_method: string | null;
  notes: string | null;
  created_by_name?: string;
}

interface CustomerInfo {
  name: string;
  email?: string;
  phone?: string;
  card_last_four?: string | null;
  card_brand?: string | null;
}

interface BusinessInfo {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
}

interface SalesReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleReceipt | null;
  items: SaleReceiptItem[];
  customer: CustomerInfo | null;
  business?: BusinessInfo | null;
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  card_on_file: "Card on File",
  check: "Check",
  charge_to_account: "Account",
  coupon: "Coupon",
  other: "Other",
};

export function SalesReceiptDialog({ open, onOpenChange, sale, items, customer, business }: SalesReceiptDialogProps) {
  const paymentLabel = sale?.payment_method ? paymentMethodLabels[sale.payment_method] ?? sale.payment_method : "—";

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    if (!customer?.email) {
      toast.error("No email address on file for this customer");
      return;
    }
    toast.success(`Receipt would be emailed to ${customer.email}`);
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg print:max-w-full print:shadow-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Sales Receipt
          </DialogTitle>
        </DialogHeader>

        {/* Success banner */}
        <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Transaction completed successfully
        </div>

        <div className="space-y-4 text-sm">
          {/* Business + Customer header */}
          <div className="flex justify-between gap-4">
            <div className="space-y-0.5">
              {business?.name && <div className="font-semibold">{business.name}</div>}
              {(business?.city || business?.state_province) && (
                <div className="text-muted-foreground">
                  {[business.city, business.state_province, business.postal_code].filter(Boolean).join(", ")}
                </div>
              )}
              {business?.phone && <div className="text-muted-foreground">{business.phone}</div>}
            </div>

            {customer && (
              <div className="text-right rounded-md border p-2.5 space-y-0.5 min-w-[160px]">
                <div className="text-xs font-medium text-muted-foreground">Customer</div>
                <div className="font-medium">{customer.name}</div>
                {customer.email && <div className="text-muted-foreground text-xs">{customer.email}</div>}
                {customer.phone && <div className="text-muted-foreground text-xs">{customer.phone}</div>}
              </div>
            )}
          </div>

          <Separator />

          {/* Line items table */}
          <div>
            <div className="grid grid-cols-[1fr_60px_80px_80px] gap-2 text-xs font-medium text-muted-foreground pb-1 border-b">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Total</span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_80px_80px] gap-2 py-1.5 border-b border-dashed last:border-0">
                <span className="truncate">{item.item_title}</span>
                <span className="text-center">{item.quantity}</span>
                <span className="text-right">${item.unit_price.toFixed(2)}</span>
                <span className="text-right">${item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-right">
            <div className="flex justify-end gap-8">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="w-20">${sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount_amount > 0 && (
              <div className="flex justify-end gap-8">
                <span className="text-muted-foreground">Discount</span>
                <span className="w-20 text-destructive">-${sale.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-end gap-8 font-bold text-base pt-1 border-t">
              <span>Total</span>
              <span className="w-20">${sale.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-end gap-8 text-xs text-muted-foreground">
              <span>Payment</span>
              <span className="w-20">{paymentLabel}</span>
            </div>
            {customer?.card_last_four && sale.payment_method === "card_on_file" && (
              <div className="flex justify-end gap-8 text-xs text-muted-foreground">
                <span>Card</span>
                <span className="w-20 uppercase">{customer.card_brand} ····{customer.card_last_four}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Sale details */}
          <div className="rounded-md border p-3 space-y-1 text-xs">
            <div className="font-medium text-sm mb-1">Sale Details</div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{format(new Date(sale.created_at), "MM/dd/yyyy h:mm a")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sale ID</span>
              <span className="font-mono">{sale.id.slice(0, 8).toUpperCase()}</span>
            </div>
            {sale.created_by_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sold By</span>
                <span>{sale.created_by_name}</span>
              </div>
            )}
            {sale.notes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notes</span>
                <span className="text-right max-w-[200px] truncate">{sale.notes}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleEmail} disabled={!customer?.email}>
              <Mail className="h-4 w-4 mr-1" /> Email
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
