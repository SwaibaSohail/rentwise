import type { CreatePropertyInput } from "../schemas/property";

export const SAMPLE_PROPERTIES: CreatePropertyInput[] = [
  {
    title: "Sunny 2-Bed Apartment",
    description: "Bright apartment near the city center with a balcony.",
    address: "12 Marina Road",
    city: "Lagos",
    rentAmount: 1200,
    bedrooms: 2,
    bathrooms: 1,
    imageUrls: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
  },
  {
    title: "Modern Studio Loft",
    description: "Open-plan studio with high ceilings and great light.",
    address: "8 Allen Avenue",
    city: "Ikeja",
    rentAmount: 800,
    bedrooms: 1,
    bathrooms: 1,
    imageUrls: ["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"],
  },
  {
    title: "Family Townhouse",
    description: "Spacious 3-bedroom townhouse with a small garden.",
    address: "5 Lekki Phase 1",
    city: "Lagos",
    rentAmount: 2500,
    bedrooms: 3,
    bathrooms: 2,
    imageUrls: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800"],
  },
  {
    title: "Cozy 1-Bed Flat",
    description: "Quiet 1-bedroom flat close to public transit.",
    address: "21 Adeola Odeku",
    city: "Victoria Island",
    rentAmount: 1500,
    bedrooms: 1,
    bathrooms: 1,
    imageUrls: ["https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"],
  },
];
