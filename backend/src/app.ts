import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import { type ZodTypeProvider, validatorCompiler, serializerCompiler } from 'fastify-type-provider-zod'
import authPlugin from './plugins/auth.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import authRoutes from './modules/auth/routes.js'
import roomRoutes from './modules/rooms/routes.js'
import guestRoutes from './modules/guests/routes.js'
import reservationRoutes from './modules/reservations/routes.js'
import posRoutes from './modules/pos/routes.js'
import billingRoutes from './modules/billing/routes.js'
import expenseRoutes from './modules/expenses/routes.js'
import settingsRoutes from './modules/settings/routes.js'
import reportRoutes from './modules/reports/routes.js'
import { env } from './config/env.js'
import { cacheClear } from './lib/cache.js'

const normalizeOrigin = (value?: string) => value?.replace(/\/+$/, '') ?? value

export function buildApp() {
  const app = Fastify({
    trustProxy: env.trustProxy,
    bodyLimit: 1024 * 1024,
    logger: {
      level: env.nodeEnv === 'production' ? 'info' : 'debug',
      redact: {
        paths: [
          'password',
          '*.password',
          '*.token',
          '*.refreshToken',
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        censor: '[REDACTED]',
      },
    },
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  const allowedOrigins = new Set(
    env.corsOrigin.map((origin) => normalizeOrigin(origin) ?? '')
  )

  if (env.nodeEnv === 'production') {
    app.addHook('onRequest', async (req, reply) => {
      if (req.headers['x-forwarded-proto'] === 'http') {
        return reply.redirect(`https://${req.host}${req.url}`, 308)
      }
    })
  }

  app.addHook('onRequest', async (req, reply) => {
    const origin = normalizeOrigin(req.headers.origin)
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)

    // Sin Origin (clientes no-browser) se permite; un navegador cross-site
    // siempre lo envía, y Sec-Fetch-Site cubre el resto.
    const crossSite = origin ? !allowedOrigins.has(origin) : req.headers['sec-fetch-site'] === 'cross-site'
    if (isStateChanging && crossSite) {
      return reply.code(403).send({ error: 'Origen no permitido' })
    }

    if (req.url.startsWith('/api/auth')) {
      reply.header('Cache-Control', 'no-store')
    } else if (req.method === 'GET' && req.url === '/health') {
      reply.header('Cache-Control', 'public, max-age=30, s-maxage=60')
    } else if (req.method === 'GET' && req.url.startsWith('/api/')) {
      reply.header('Cache-Control', 'private, max-age=0, must-revalidate')
    }
  })

  // shortcut: cualquier mutación limpia toda la caché; suficiente con pocas
  // escrituras y una instancia. Migrar a invalidación por tags si Render escala.
  app.addHook('onResponse', async (req, reply) => {
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
    if (mutating && reply.statusCode < 400) cacheClear()
  })

  app.register(cors, {
    origin: (origin, cb) => {
      const normalizedOrigin = normalizeOrigin(origin)

      if (!origin || allowedOrigins.has(normalizedOrigin ?? '')) {
        cb(null, true)
        return
      }

      cb(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.register(fastifyCookie)
  app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    hsts: env.nodeEnv === 'production' ? { maxAge: 15552000, includeSubDomains: true } : false,
    crossOriginEmbedderPolicy: false,
  })
  app.register(errorHandlerPlugin)
  app.register(authPlugin)

  if (env.nodeEnv !== 'test') {
    app.register(fastifyRateLimit, {
      global: true,
      max: 300,
      timeWindow: '1 minute',
    })
  }

  app.get('/health', async () => ({ status: 'ok' }))

  app.register(authRoutes)
  app.register(roomRoutes)
  app.register(guestRoutes)
  app.register(reservationRoutes)
  app.register(posRoutes)
  app.register(billingRoutes)
  app.register(expenseRoutes)
  app.register(settingsRoutes)
  app.register(reportRoutes)

  return app
}