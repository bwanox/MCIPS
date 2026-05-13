import { z } from "zod";

export const eventSchema = z.object({
  type: z.enum(["SMS", "EMAIL", "TEXT", "LOGIN_ATTEMPT"]),
  content: z.string().trim().min(1),
  source: z.enum(["manual", "simulation", "external"]).default("external"),
  ipAddress: z.string().optional(),
  country: z.string().optional(),
  device: z.string().optional(),
  userAgent: z.string().optional()
});

export type EventSchemaInput = z.input<typeof eventSchema>;
export type EventSchemaOutput = z.output<typeof eventSchema>;
