import { z } from "zod";

export const ToolCallSchema = z.object({
  name: z.string(),
  arguments: z.record(z.unknown()),
  result: z.unknown().optional(),
});

export const SampleSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid().optional(),
  turnIndex: z.number().int().nonnegative().optional(),
  input: z.string(),
  context: z.string().optional(),
  output: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.coerce.date(),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;
export type Sample = z.infer<typeof SampleSchema>;
