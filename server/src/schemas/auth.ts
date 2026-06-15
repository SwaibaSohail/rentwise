import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.enum(["LANDLORD", "TENANT"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
