import { z } from "zod";
export const startSchema = z.object({ withUserId: z.string().min(1) });
export const messageSchema = z.object({ body: z.string().min(1) });
