import { z } from 'zod/v4'

// Límites: bcrypt solo considera los primeros 72 bytes de la contraseña.
export const registerSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(120),
  email: z.string().email('Email inválido').max(254),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
  acceptTerms: z.literal(true, {
    error: 'Debes aceptar los términos y la política de privacidad',
  }),
}).strict()

export const loginSchema = z.object({
  email: z.string().email('Email inválido').max(254),
  password: z.string().min(1, 'Contraseña requerida').max(200),
}).strict()

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(120).optional(),
}).strict()

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida').max(200),
  newPassword: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres').max(72),
}).strict()

// Nuevos esquemas para gestión de solicitudes pendientes (admin del sistema)
export const approveRequestSchema = z.object({
  userId: z.string().min(1, 'ID de usuario requerido').max(64),
  role: z.enum(['admin', 'recepcion']),
  tenantId: z.string().min(1, 'Hotel requerido').max(64),
}).strict()

export const rejectRequestSchema = z.object({
  userId: z.string().min(1, 'ID de usuario requerido').max(64),
}).strict()

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Nombre del hotel requerido').max(120),
  slug: z.string().min(2, 'Slug requerido').max(60).regex(/^[a-z0-9-]+$/, 'Slug inválido (solo minúsculas, números y guiones)'),
}).strict()

export const updateTenantSchema = z.object({
  name: z.string().min(2, 'Nombre del hotel requerido').max(120).optional(),
  slug: z.string().min(2, 'Slug requerido').max(60).regex(/^[a-z0-9-]+$/, 'Slug inválido (solo minúsculas, números y guiones)').optional(),
  status: z.enum(['activo', 'inactivo']).optional(),
}).strict()

export const createRecepcionSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(120),
  email: z.string().email('Email inválido').max(254),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
  tenantId: z.string().max(64).optional(),
}).strict()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type ApproveRequestInput = z.infer<typeof approveRequestSchema>
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>
export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>
export type CreateRecepcionInput = z.infer<typeof createRecepcionSchema>
