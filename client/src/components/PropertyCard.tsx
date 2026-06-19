import type { ReactNode } from "react";
import type { Property } from "../lib/properties";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card className="overflow-hidden" onClick={onClick}>
      {property.imageUrls[0] && (
        <img src={property.imageUrls[0]} alt={property.title} className="h-40 w-full object-cover" />
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{property.title}</CardTitle>
          <Badge variant={property.status === "AVAILABLE" ? "default" : "secondary"}>
            {property.status === "AVAILABLE" ? "Available" : "Rented"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{property.city}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="font-semibold">${property.rentAmount.toLocaleString()}/mo</p>
        <p className="text-sm text-muted-foreground">
          {property.bedrooms} bed · {property.bathrooms} bath
        </p>
        {actions && <div className="flex gap-2 pt-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}
