import { z } from "zod";

export const IssueStatusSchema = z.enum([
  "open",
  "triaged",
  "resolved",
  "regressed",
]);

export const EvalCriteriaSchema = z.object({
  evaluatorId: z.string(),
  verdict: z.string(),
  description: z.string(),
});

export const IssueSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: IssueStatusSchema,
  sampleIds: z.array(z.string().uuid()),
  evalCriteria: z.array(EvalCriteriaSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type IssueStatus = z.infer<typeof IssueStatusSchema>;
export type EvalCriteria = z.infer<typeof EvalCriteriaSchema>;
export type Issue = z.infer<typeof IssueSchema>;
