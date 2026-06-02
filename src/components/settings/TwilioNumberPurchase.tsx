import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Search, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface AvailableNumber {
  phone_number: string;
  friendly_name: string;
  locality: string;
  region: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
}

interface TwilioNumberPurchaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TwilioNumberPurchase({ open, onOpenChange, onSuccess }: TwilioNumberPurchaseProps) {
  const [areaCode, setAreaCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);

  const handleSearch = async () => {
    if (!areaCode && areaCode.length !== 3) {
      toast.error("Please enter a valid 3-digit area code");
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-search-numbers', {
        body: { areaCode }
      });

      if (error) throw error;

      if (data.numbers && data.numbers.length > 0) {
        setAvailableNumbers(data.numbers);
        toast.success(`Found ${data.numbers.length} available numbers`);
      } else {
        toast.error("No numbers found in this area code");
        setAvailableNumbers([]);
      }
    } catch (error: any) {
      console.error('Error searching numbers:', error);
      toast.error(error.message || "Failed to search numbers");
    } finally {
      setSearching(false);
    }
  };

  const handlePurchase = async (phoneNumber: string) => {
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('twilio-purchase-number', {
        body: { 
          phoneNumber,
          friendlyName: `Business Line (${phoneNumber})`
        }
      });

      if (error) throw error;

      toast.success("Phone number purchased successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error purchasing number:', error);
      toast.error(error.message || "Failed to purchase number");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Twilio Phone Number</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label>Area Code (Optional)</Label>
              <Input
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="e.g., 415"
                maxLength={3}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={searching}>
                <Search className="w-4 h-4 mr-2" />
                {searching ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>

          {availableNumbers.length === 0 && !searching && (
            <Card className="p-8 text-center">
              <Phone className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                Search for available phone numbers by area code, or leave empty to see any available numbers
              </p>
            </Card>
          )}

          {availableNumbers.length > 0 && (
            <div className="space-y-2">
              <Label>Available Numbers</Label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {availableNumbers.map((number) => (
                  <Card key={number.phone_number} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">{number.phone_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {number.locality}, {number.region}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {number.capabilities.voice && (
                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">Voice</span>
                          )}
                          {number.capabilities.SMS && (
                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">SMS</span>
                          )}
                          {number.capabilities.MMS && (
                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">MMS</span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handlePurchase(number.phone_number)}
                        disabled={purchasing}
                        size="sm"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Purchase
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
