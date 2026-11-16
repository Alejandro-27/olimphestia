import { z } from 'zod/v4'

export const createProductSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(120),
  category: z.enum(['desayunos', 'almuerzos', 'cenas', 'snacks', 'bebidas']),
  price: z.number().nonnegative().max(1_000_000),
  currentStock: z.number().int().min(0).max(1_000_000).default(0),
  minStock: z.number().int().min(0).max(1_000_000).default(0),
  image: z.string().max(2048).default(''),
}).strict()

export const updateProductSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(120).optional(),
  category: z.enum(['desayunos', 'almuerzos', 'cenas', 'snacks', 'bebidas']).optional(),
  price: z.number().nonnegative().max(1_000_000).optional(),
  currentStock: z.number().int().min(0).max(1_000_000).optional(),
  minStock: z.number().int().min(0).max(1_000_000).optional(),
  image: z.string().max(2048).optional(),
  active: z.boolean().optional(),
}).strict()

export const updateStockSchema = z.object({
  currentStock: z.number().int().min(0).max(1_000_000),
}).strict()

export const productParamsSchema = z.object({
  id: z.string().min(1).max(64),
}).strict()

export const saleItemSchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(10_000),
  // Se acepta por compatibilidad con el cliente, pero el precio real se lee de la BD.
  unitPrice: z.number().nonnegative().max(1_000_000).optional(),
}).strict()

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'Debe incluir al menos un item').max(100),
  paymentMethod: z.enum(['efectivo', 'tarjeta', 'cargo_habitacion']),
  roomId: z.string().max(64).nullable().optional(),
}).strict()

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type UpdateStockInput = z.infer<typeof updateStockSchema>
export type CreateSaleInput = z.infer<typeof createSaleSchema>

export const listProductsQuerySchema = z.object({
  category: z.enum(['desayunos', 'almuerzos', 'cenas', 'snacks', 'bebidas']).optional(),
}).strict()

export const listSalesQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)').optional(),
}).strict()
