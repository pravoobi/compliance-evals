import { z } from "zod";

export const AuditActionSchema = z.enum([
  "run-eval",
  "accept",
  "reject",
  "promote-issue",
  "export-evidence",
]);

export const AuditRecordSchema = z.object({
  id: z.string().uuid(),
  prevHash: z.string(),
  hash: z.string(),
  resultId: z.string().uuid(),
  actor: z.string(),
  action: AuditActionSchema,
  reason: z.string().optional(),
  createdAt: z.coerce.date(),
});

export type AuditAction = z.infer<typeof AuditActionSchema>;
export type AuditRecord = z.infer<typeof AuditRecordSchema>;
