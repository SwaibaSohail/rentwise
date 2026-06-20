import { z } from "zod";

export const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(["PLUMBING", "ELECTRICAL", "APPLIANCE", "STRUCTURAL", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

export const addUpdateSchema = z
  .object({
    message: z.string().min(1).optional(),
    newStatus: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  })
  .refine((d) => d.message || d.newStatus, { message: "message or newStatus required" });

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type AddUpdateInput = z.infer<typeof addUpdateSchema>;
