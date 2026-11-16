import { z } from 'zod/v4'

export const payInvoiceSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0').max(1_000_000_000),
  paymentMethod: z.enum(['efectivo', 'tarjeta', 'transferencia']).optional(),
}).strict()

export const invoiceParamsSchema = z.object({
  id: z.string().min(1).max(64),
}).strict()

export const listInvoicesQuerySchema = z.object({
  status: z.enum(['pagada', 'parcial', 'pendiente']).optional(),
  guestId: z.string().max(64).optional(),
}).strict()

export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>
