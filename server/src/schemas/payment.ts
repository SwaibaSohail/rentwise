import { z } from "zod";
export const confirmSchema = z.object({ sessionId: z.string().min(1) });
