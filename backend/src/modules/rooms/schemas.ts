import { z } from 'zod/v4'
import type { RoomStatus } from '@hotel/types'

export const roomStatusValues = ['libre', 'ocupada', 'mantenimiento', 'limpieza'] as const satisfies readonly RoomStatus[]

export const createRoomSchema = z.object({
  number: z.string().min(1, 'Número requerido').max(20),
  floor: z.number().int().min(0).max(200),
  type: z.enum(['individual', 'doble', 'suite', 'familiar']),
  maxCapacity: z.number().int().min(1).max(50),
  pricePerNight: z.number().positive().max(1_000_000),
}).strict()

export const updateRoomSchema = z.object({
  number: z.string().min(1).max(20).optional(),
  floor: z.number().int().min(0).max(200).optional(),
  type: z.enum(['individual', 'doble', 'suite', 'familiar']).optional(),
  maxCapacity: z.number().int().min(1).max(50).optional(),
  pricePerNight: z.number().positive().max(1_000_000).optional(),
}).strict()

export const updateRoomStatusSchema = z.object({
  status: z.enum(roomStatusValues),
}).strict()

export const roomParamsSchema = z.object({
  id: z.string().min(1).max(64),
}).strict()

export const listRoomsQuerySchema = z.object({
  status: z.enum(roomStatusValues).optional(),
  type: z.enum(['individual', 'doble', 'suite', 'familiar']).optional(),
  floor: z.coerce.number().int().min(0).max(200).optional(),
}).strict()

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>
export type UpdateRoomStatusInput = z.infer<typeof updateRoomStatusSchema>
