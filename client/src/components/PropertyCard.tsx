import type { ReactNode } from "react";
import type { Property } from "../lib/properties";
import { BedDouble, Bath, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PropertyCard({
  property,
  actions,
  onClick,
}: {
  property: Property;
  actions?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`group overflow-hidden rounded-xl border border-border/60 shadow-sm transition-shadow duration-200 hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {property.imageUrls[0] ? (
          <img
            src={property.imageUrls[0]}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-4xl text-primary/30">&#9634;</span>
          </div>
        )}
        {/* Status badge overlay */}
        <span
          className={`absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow ${
            property.status === "AVAILABLE"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {property.status === "AVAILABLE" ? "Available" : "Rented"}
        </span>
      </div>

      <CardContent className="p-4 space-y-2">
        {/* Title */}
        <h3 className="font-semibold leading-tight text-foreground line-clamp-1">
          {property.title}
        </h3>

        {/* City */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{property.city}</span>
        </div>

        {/* Price */}
        <p className="text-xl font-bold text-foreground">
          ${property.rentAmount.toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground">/mo</span>
        </p>

        {/* Beds & baths */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            {property.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" />
            {property.bathrooms} bath
          </span>
        </div>

        {/* Actions slot */}
        {actions && <div className="flex gap-2 pt-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}
