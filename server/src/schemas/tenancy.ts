import { z } from "zod";

export const assignSchema = z.object({
  propertyId: z.string().min(1),
  tenantEmail: z.string().email(),
});

export type AssignInput = z.infer<typeof assignSchema>;
