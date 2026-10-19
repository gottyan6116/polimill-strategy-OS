import { z } from "zod";
const text = z.string().trim().min(1).max(200);
const base = {
  id: z.string().min(1).max(100),
  version: z.number().int().positive(),
};
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(1).max(256),
    remember: z.boolean().optional(),
  })
  .strict();
export const editSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...base,
      kind: z.literal("goals"),
      title: text,
      hypothesis: z.string().trim().min(1).max(2000),
      owner: text,
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("kpis"),
      name: text,
      actual: z.number().finite().min(0).max(1e12),
      target: z.number().finite().positive().max(1e12),
      unit: z.string().trim().min(1).max(20),
      direction: z.enum(["up", "down"]),
    })
    .strict(),
  z
    .object({
      ...base,
      kind: z.literal("initiatives"),
      title: text,
      owner: text,
      progress: z.number().int().min(0).max(100),
      status: z.enum(["planned", "active", "blocked", "done"]),
      due_date: z.iso.date(),
    })
    .strict()
    .refine((x) => x.status !== "done" || x.progress === 100, {
      message: "完了の場合は進捗を100%にしてください。",
    }),
]);
