import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  type AddressParts,
  getCurrentAddress,
  loadSavedAddresses,
  deleteSavedAddress,
  fullAddress,
  type SavedAddress,
} from "@/lib/location";

type Props = {
  address: AddressParts;
  onChange: (a: AddressParts) => void;
  onMapsLink?: (link: string) => void;
};

const NEW_ADDRESS = "__new__";

export function AddressFields({ address, onChange, onMapsLink }: Props) {
  const [locating, setLocating] = useState(false);
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string>(NEW_ADDRESS);

  useEffect(() => {
    setSaved(loadSavedAddresses());
  }, []);

  const update = (k: keyof AddressParts, v: string) => {
    onChange({ ...address, [k]: v });
    if (selectedId !== NEW_ADDRESS) setSelectedId(NEW_ADDRESS);
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const a = await getCurrentAddress();
      onChange({
        apartment: a.apartment || address.apartment,
        street: a.street || address.street,
        city: a.city || address.city,
        state: a.state || address.state,
        pincode: a.pincode || address.pincode,
      });
      if (a.mapsLink && onMapsLink) onMapsLink(a.mapsLink);
      setSelectedId(NEW_ADDRESS);
      toast.success("Location added. Please verify your address.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not get your location.");
    } finally {
      setLocating(false);
    }
  };

  const handlePickSaved = (id: string) => {
    setSelectedId(id);
    if (id === NEW_ADDRESS) return;
    const entry = saved.find((s) => s.id === id);
    if (!entry) return;
    onChange(entry.address);
    if (entry.mapsLink && onMapsLink) onMapsLink(entry.mapsLink);
  };

  const handleDeleteSaved = () => {
    if (selectedId === NEW_ADDRESS) return;
    const updated = deleteSavedAddress(selectedId);
    setSaved(updated);
    setSelectedId(NEW_ADDRESS);
    toast.success("Saved address removed.");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Delivery Address</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={locating}
          onClick={useCurrentLocation}
          className="border-gold-deep text-gold-deep hover:bg-accent"
        >
          <MapPin className="mr-1 h-4 w-4" />
          {locating ? "Locating…" : "Use current location"}
        </Button>
      </div>

      {saved.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/30 p-3">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Saved addresses
          </Label>
          <div className="flex items-center gap-2">
            <Select value={selectedId} onValueChange={handlePickSaved}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a saved address" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_ADDRESS}>+ Enter a new address</SelectItem>
                {saved.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-medium">{s.label || "Saved"}</span>
                    <span className="ml-2 text-muted-foreground">
                      · {fullAddress(s.address)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedId !== NEW_ADDRESS && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleDeleteSaved}
                aria-label="Remove saved address"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          aria-label="Apartment or suite name (optional)"
          placeholder="Apartment / Suite Name (Optional)"
          value={address.apartment}
          onChange={(e) => update("apartment", e.target.value)}
        />
        <Input
          aria-label="Street"
          placeholder="Street / Road"
          required
          value={address.street}
          onChange={(e) => update("street", e.target.value)}
        />
        <Input
          aria-label="City"
          placeholder="City"
          required
          value={address.city}
          onChange={(e) => update("city", e.target.value)}
        />
        <Input
          aria-label="State"
          placeholder="State"
          required
          value={address.state}
          onChange={(e) => update("state", e.target.value)}
        />
        <Input
          aria-label="Pincode"
          placeholder="Pincode"
          inputMode="numeric"
          required
          value={address.pincode}
          onChange={(e) => update("pincode", e.target.value)}
          className="sm:col-span-2"
        />
      </div>
    </div>
  );
}

type SaveProps = {
  saveAddress: boolean;
  onToggle: (v: boolean) => void;
  label: string;
  onLabelChange: (v: string) => void;
};

/** Optional checkbox + label for saving the entered address. */
export function SaveAddressToggle({ saveAddress, onToggle, label, onLabelChange }: SaveProps) {
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border/60 p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={saveAddress}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 accent-[oklch(0.6_0.12_75)]"
        />
        Save this address for next time
      </label>
      {saveAddress && (
        <Input
          placeholder="Label (e.g. Home, Office)"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
        />
      )}
    </div>
  );
}
