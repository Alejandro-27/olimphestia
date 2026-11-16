import { z } from 'zod/v4'
import type { ReservationStatus } from '@hotel/types'

export const reservationStatusValues: ReservationStatus[] = ['confirmada', 'checkin', 'checkout', 'cancelada']

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)')

export const createReservationSchema = z.object({
  guestId: z.string().min(1).max(64),
  roomId: z.string().min(1).max(64),
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.number().int().min(1).max(50),
  paymentMethod: z.enum(['efectivo', 'tarjeta', 'transferencia']),
  advancePayment: z.number().min(0).max(1_000_000).default(0),
  notes: z.string().max(1000).default(''),
  acceptCancellationPolicy: z.literal(true, {
    error: 'Debes aceptar la política de cancelación',
  }),
}).strict()

export const reservationParamsSchema = z.object({
  id: z.string().min(1).max(64),
}).strict()

export const listReservationsQuerySchema = z.object({
  status: z.enum(['confirmada', 'checkin', 'checkout', 'cancelada']).optional(),
  roomId: z.string().max(64).optional(),
  guestId: z.string().max(64).optional(),
}).strict()

export type CreateReservationInput = z.infer<typeof createReservationSchema>
