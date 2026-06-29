import { z } from "zod";

export const applySchema = z.object({
  propertyId: z.string().min(1),
});

export type ApplyInput = z.infer<typeof applySchema>;
