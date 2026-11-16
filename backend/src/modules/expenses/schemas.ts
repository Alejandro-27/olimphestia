import { z } from 'zod/v4'

export const createExpenseSchema = z.object({
  category: z.enum(['mantenimiento', 'limpieza', 'servicios', 'nominas', 'otros']),
  amount: z.number().nonnegative().max(1_000_000_000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  note: z.string().max(500).default(''),
}).strict()

export const expenseParamsSchema = z.object({
  id: z.string().min(1).max(64),
}).strict()

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
