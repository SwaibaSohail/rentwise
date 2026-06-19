import { z } from "zod";

export const createPropertySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  rentAmount: z.number().int().positive(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  imageUrls: z.array(z.string().url()).default([]),
});

export const updatePropertySchema = createPropertySchema.partial();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
