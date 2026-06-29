import { useState } from "react";
import type { Property, PropertyInput } from "../lib/properties";
import { uploadsApi } from "../lib/uploads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PropertyForm({
  initial,
  onSubmit,
}: {
  initial?: Property;
  onSubmit: (data: PropertyInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [rentAmount, setRentAmount] = useState(String(initial?.rentAmount ?? ""));
  const [bedrooms, setBedrooms] = useState(String(initial?.bedrooms ?? ""));
  const [bathrooms, setBathrooms] = useState(String(initial?.bathrooms ?? ""));
  const [imageUrl, setImageUrl] = useState(initial?.imageUrls?.[0] ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        title, description, address, city,
        rentAmount: Number(rentAmount),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        imageUrls: imageUrl ? [imageUrl] : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handle} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="city">City</Label>
        <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="rent">Rent ($/mo)</Label>
          <Input id="rent" type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input id="bedrooms" type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input id="bathrooms" type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} required />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="propertyImage">Property image (optional)</Label>
        <input
          id="propertyImage"
          type="file"
          accept="image/*"
          aria-label="Property image"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const { url } = await uploadsApi.image(file);
              setImageUrl(url);
            } catch {
              setError("Image upload failed");
            } finally {
              setUploading(false);
            }
          }}
          className="text-sm"
        />
        {uploading && <p className="text-sm text-muted-foreground">Uploading…</p>}
        {imageUrl && !uploading && (
          <img src={imageUrl} alt="Property preview" className="mt-1 h-24 w-full rounded-md object-cover" />
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting || uploading}>{submitting ? "Saving…" : "Save"}</Button>
    </form>
  );
}
