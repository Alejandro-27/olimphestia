# memory.md — Memoria del proyecto HotelManager PMS & POS

Documento de **estado dinámico** del proyecto. Complementa a `AGENTS.md` (convenciones/estructura estables): aquí solo el estado que cambia con el tiempo. Lo carga el agente al inicio de cada sesión (referenciado desde `AGENTS.md`).

---

## Protocolo de mantenimiento

- **Actualizar al final de cada tarea/sesión**: si cambió el estado git, conteos de tests, dependencias, decisiones o estructura, reflejarlo aquí.
- **Tras un commit**: mover lo pendiente a la sección "Log de cambios" si ya está resuelto.
- **Mantener este archivo corto** (< ~100 líneas): el log se poda a las ~8 entradas más recientes.
- Si algo pasa a ser **permanente** (convención/estructura), se mueve a `AGENTS.md` y se quita de aquí (evitar duplicación/drift).
- No duplicar lo que ya está en `AGENTS.md`.

## Snapshot actual

- Fecha: 2026-11-16 · Rama: `main` · Último commit: `0e934c3` (consultas paralelas en informes)
- **Pendiente**: redesplegar backend en Render (Manual Deploy). Cloudflare Pages ya auto-desplegó el frontend. La migración `0001_perf_indexes` ya está aplicada y registrada en Neon (`drizzle.__drizzle_migrations`), así que el arranque de Render no ejecutará DDL.
- **Hotel del superadmin**: `tenant_default` (“Hotel Principal Edit”) aloja al superadmin y **no se puede desactivar** (el backend responde 400). `listTenants` devuelve `hasSuperadmin` y la UI muestra un badge “Sistema” en lugar del botón. Los hoteles reales (p. ej. “Punta Arena”) sí se desactivan.
- Código fuente: `tsc` limpio en frontend y backend; `pnpm test` **73/73** frontend y `pnpm test:api` **46/46** OK
- **Datos**: insertada fila `settings` para el hotel Punta Arena en Neon (el 500 de `/api/settings` era por ausencia de fila); `updateSettings` ahora hace upsert.
- **Navegación SPA**: las vistas se cambian con `activeView`/`onNavigate`; `DashboardView` y `SystemReportsView` ya no usan `router.push` (causaba 404 en Cloudflare Pages porque `/calendar`, `/reports`, etc. no existen como archivos). El `_redirects` solo vive en `frontend/public/` (se copia a `out/`); se eliminaron `wrangler.toml` y `_redirects` de la raíz (el `wrangler.toml` era inválido y rompía el deploy).
- **Informes del Sistema**: el backend devuelve `{ tenants }` y el frontend acepta también el formato antiguo (array); la vista tolera fallos de sesión sin romper el render.
- **Playwright MCP operativo**: Chromium instalado en `~/.cache/ms-playwright` y MCP configurado con `--executable-path` (sin sudo). Sirve para reproducir 404, revisar consola y validar navegación.
- Problema conocido: `GET /api/auth/me 401` en producción si el token no es válido o el backend no tiene los cambios más recientes; el sidebar y vistas deben manejar sesión inválida sin fallar
- **Auditoría de dependencias (2026-11-16)**: `pnpm audit --prod` → 1 alta (`zod <4.6.6`, agotamiento de memoria en colecciones gigantes; no explotable aquí porque todos los arrays/strings tienen `.max()` y el body está limitado a 1 MB; subir a zod 4 rompe `zodResolver` y `zod/v4`). Resto resuelto: `next` 16.4.6 (2 CVEs críticas), `fastify` 5.12.8, `@fastify/jwt` 10.2.8 (`fast-jwt` 6.3.6), `@fastify/rate-limit` 11.2.2 y overrides de `fast-uri` 3.1.9/4.2.3, `source-map-js` 1.2.2, `ip-address` 10.7.4 en `pnpm-workspace.yaml`. `allowBuilds.workerd` estaba con el placeholder de pnpm; ahora `true`.
- Revertidos los cambios **visuales** de la auditoría de 7 fases a petición del usuario: la estética previa queda intacta. Se conserva la funcionalidad (legal, settings, consentimientos) y atributos sin impacto (`aria-*`, foco).
- Browser bridge roto → verificación visual manual en `pnpm dev` (pendiente comprobar la CSP de producción, que solo aplica con `next build && next start`).

## Conteos verificados (fuentes: comandos de test)

| Recurso | Conteo | Fuente |
|---|---|---|
| Frontend | 73 tests | `pnpm test` (verificado 2026-11-16, 73/73) |
| Backend | 46 tests | `pnpm test:api` (verificado 2026-11-16, 46/46) |
| Bruno | 46 requests | `backend/bruno/` |

## Decisiones recientes (con su porqué)

- **Rendimiento sin coste extra**: consultas agregadas (informes 19→4, dashboard 6→3, tenants 1+4N→4), consultas independientes en paralelo, caché TTL/LRU en memoria del backend (15-60 s, limpiada en cualquier mutación) y caché de GETs de 10 s + dedupe en el cliente. Medido contra Neon: financial 2.7 s→0.18 s, dashboard 1.0 s→0.19 s, occupancy 0.5 s→0.17 s; repeticiones ~0 ms. Con más de una instancia en Render la caché puede quedar obsoleta hasta el TTL.
- **Migraciones baseline**: se squashearon las 9 migraciones históricas en `0000_baseline.sql` (when = último aplicado en producción, se salta) + `0001_perf_indexes.sql` (IF NOT EXISTS, se aplica). La BD de test se recrea en cada ejecución para que el baseline sea determinista.
- **SEO mínimo**: PMS con `noindex`; solo `/legal/*` indexable con canonical/OG; `robots.txt` y `sitemap.xml` estáticos (`force-static` por `output: 'export'`). Vistas del frontend con `next/dynamic` para sacar los ~944 KB de login del bundle inicial.
- **Multitenant por hotel**: nueva tabla `tenants`; todas las tablas de negocio tienen `tenant_id` NOT NULL. Usuarios nacen como `pendiente` (sin rol, sin tenant); el admin del sistema los aprueba y les asigna hotel + rol. La recepción solo la crea el admin dentro de su hotel. Cada consulta filtra por `tenant_id` del usuario autenticado.
- **Aprobación manual obligatoria**: no hay bootstrap automático. El primer usuario debe ser aprobado manualmente por el dueño del sistema desde `/api/auth/pending-requests`.
- **Índices de optimización**: índices compuestos `(tenant_id, status/date/category/etc.)` en todas las tablas de negocio para evitar saturación de Render.
- **Ocupacion derivada de reservas**: `getOccupiedRoomIds()` considera vigente toda reserva `confirmada`/`checkin` con `checkOut > hoy` (incluye futuras); `listRooms()` superpone `ocupada` sobre el estado guardado salvo `mantenimiento`/`limpieza`. Al pasar el check-out la habitacion se libera sola, sin escrituras ni jobs. `rooms-view` muestra el huesped de la reserva vigente y permite cambiar el estado guardado.
- **Cambio en efectivo**: helper `cashChange(total, received)` en `lib/utils.ts`; se muestra en TPV, anticipo de reserva y pago de factura, y bloquea el cobro si el efectivo no llega.
- **Sesiones refresh server-side** (`refresh_sessions`) con rotación obligatoria: cada `/api/auth/refresh` invalida el token usado y emite uno nuevo; logout y cambio de contraseña revocan todas. Cierra el agujero de refresh no revocable. El `jti` va **en el payload** (los tipos de `@fastify/jwt` no aceptan la opción `jwtid`).
- **Endurecimiento OWASP (2026-11-16)**: JWT fijado a HS256 (sign+verify) y `JWT_SECRET` obligatorio de ≥32 caracteres en producción; rotación de refresh atómica (`UPDATE ... WHERE revoked_at IS NULL RETURNING`); lockout de login por `IP|email` (no bloqueable por terceros) con poda del Map; `ALLOW_REGISTRATION` aplicado de verdad (bootstrap solo si no hay usuarios, siempre `pendiente`); `checkRoomAvailability` dentro de la misma transacción (evita agotar el pool); rechazo de reservas cuyo `checkOut` ya pasó; schemas zod `.strict()` + `.max()`; helmet con `frame-ancestors 'none'` y HSTS solo en producción; `Sec-Fetch-Site` como fallback CSRF; rate limit en reservas/cambio de contraseña/alta de recepción; `/api/auth/recepcion` ya no devuelve la contraseña. El frontend sirve cabeceras por `frontend/public/_headers` (con `output: 'export'`, `next.config.headers()` se ignora).
- **Registro público cerrado por defecto** (`ALLOW_REGISTRATION=false`): el primer usuario (bootstrap, cuando no hay ninguno) siempre puede registrarse; el resto da 403. En dev queda abierto.
- **Lockout de login en memoria** (5 fallos → 15 min, por proceso; coherente con el store del rate-limit): suficiente para una sola instancia. Con varias réplicas necesita store compartido (Redis).
- **`TRUST_PROXY` desactivado por defecto** (antes se activaba en producción): tras un proxy real hay que ponerlo (`TRUST_PROXY=127.0.0.1` o CIDR) o el rate-limit comparte la IP del proxy. Es un `needs-validation` de despliegue.
- **CSRF por `Origin`**: hook `onRequest` que rechaza (403) métodos mutadores con `Origin` presente y no permitido. Complementa las cookies `httpOnly` + `sameSite`.
- **Integridad financiera**: `payInvoice` transaccional con `SELECT ... FOR UPDATE` y tope al saldo pendiente (400); `createReservation` transaccional con lock de habitación y comprobación de solapamiento inline (409); ventas TPV con precio y stock calculados en servidor (decremento atómico con guard, 409 si insuficiente) y `roomId` solo con `cargo_habitacion`; cancelar una reserva en `checkin` se bloquea (400) para no liberar una habitación ocupada.
- **Sin `@vercel/analytics`**: no era necesario para un PMS interno y no queremos terceros recebendo datos de uso.
- **Consentimientos persistidos**: `acceptTerms` se guarda en `users.terms_accepted_at` al registrar y `acceptCancellationPolicy` en `reservations.cancellation_policy_accepted_at` al crear la reserva (fecha ISO del servidor, migración `0005`). Los registros previos quedan en `NULL`; las páginas legales ya pueden afirmar que queda constancia.
- **Datos fiscales en tabla `settings`** (fila única `main`) y no en `users`: es un solo negocio por instalación y así el informe/voucher leen de una fuente. `GET` es para cualquier autenticado, `PATCH` solo admin. La migración `0003` inserta la fila `main` para que instalaciones existentes no queden sin datos.
- **Campos de huésped opcionales** (`country`, `email`, `phone`): antes obligatorios y el frontend rellenaba datos ficticios (`XX`, `000000`). Ahora el schema acepta vacío o ausencia.
- **XLSX en vez de CSV** para exportar informes (`write-excel-file@4.1.1`): csv no permite header formateado; se descartó exceljs (21MB + polyfills browser) y SheetJS free (sin estilos, npm desactualizado). Header con celdas combinadas A:D, fondos, números reales con formato `$#,##0` y fila Total.
- **PDF via `window.print()`** (patrón `.print-only`/portal a body), sin dependencias; se descartó jsPDF. Setea `document.title` antes de imprimir (nombre de archivo sugerido).
- **Factura en curso** en el backend: factura real durante la estancia, noches completas `checkIn→checkOut`, cargos del TPV sincronizados al instante (`syncInvoiceForReservation` en `billing/service.ts`, upsert en `pos/service.ts`).
- Botón de exportación se muestra como **"Excel"** (no "Exportar") — decisión del usuario.

## Convenciones operativas (no están en AGENTS.md)

- **Textos UI en español sin acentos** (ej. "Ocupacion", "Ultimo ano"); excepción: content editable libre.
- **Browser bridge roto** → no hay verificación visual automatizada; el usuario revisa en `pnpm dev`. Verificar con `tsc --noEmit` + `pnpm lint` + tests + `pnpm build`.
- `frontend/next-env.d.ts` es auto-generado: **revertir con `git checkout --`** antes de commitear si el build lo toca.
- GitHub Actions corre lint+typecheck+build+tests (frontend) y build+tests (backend contra PostgreSQL 16). El backend en Render se mantiene despierto con un cron externo (cron-job.org) que hace `GET https://olimphestia.onrender.com` cada 5 min para evitar el spin-down del plan gratis.
- Credenciales test backend: `admin@test.com` / `Password123!` (BD `hotel_manager_test`).

## Log de cambios recientes (podar lo viejo)

- `0e934c3` perf: paralelizar consultas independientes en dashboard, ocupacion y habitaciones
- `f7daeca` perf: consultas agregadas, cache en memoria e indices; SEO tecnico minimo (baseline de migraciones, robots/sitemap, noindex)
- `c36d907` fix(tenants): `listTenants` devuelve `hasSuperadmin`; la UI marca el hotel del superadmin como “Sistema” y oculta el toggle (el 400 era intencional: evita dejar el sistema sin superadmin)
- `815c3ac` feat: navegación por `activeView` (sin 404), informes del sistema y estado de hoteles
- `8812eba` feat(multitenant): tenants por hotel, aprobación manual de cuentas, rol pendiente por defecto, tenant_id en todas las tablas, índices optimizados, endpoints de administración de solicitudes y recepciones
- (sin commit) ci: eliminado workflow `wake-render.yml` de GitHub Actions; ahora el backend de Render se despierta con cron-job.org (`GET` a `https://olimphestia.onrender.com` cada 5 min)
- (sin commit) habitaciones: ocupacion derivada de reservas (checkOut > hoy, liberacion al terminar), huesped actual en Gestion de Habitaciones y bloqueo de documento/email/telefono duplicados; efectivo recibido con cambio en anticipo de reserva y pago de factura
- feat(ui): buscador de pais por nombre en reservas y edicion de huesped (`CountryCombobox` con cmdk y filtro sin acentos)

## Gotchas técnicos aprendidos

- Node ICU (es-ES): septiembre abreviado = **"sept"** (no "sep"); usar `${Intl.DateTimeFormat('es-ES', …)}` verificando salida en Node.
- `write-excel-file`: tipar los rows como `Row[]` explícito cuando hay `...map()` en el literal (si no, TS ensancha `align` a `string`); `SheetOptions` es genérico (no anotar, dejar inferir). v4 browser **no usa Web Workers** (zipper async).
- `.print-only` ya está en `globals.css` (`display:none` fuera de @media print) — es el patrón para impresión.
- Backend: imports con `.js`; queries `(await db.select()...)[0]` (pg no tiene `.get()`).
- `next/font/google` con Next 16: `Geist(...)` no expone `.variable`. **NO** poner `geist.className`/`geistMono.className` en el `<body>`: el body queda con `font-sans` y las consts se declaran sin usar (`_geist`/`_geistMono`) — aplicar la clase de la fuente en el body renderiza el sitio entero en Geist Mono (el orden de clases CSS, no del HTML, decide cuál gana).
- **Migraciones `.sql` generadas: no editarlas a mano sin validar.** `drizzle-kit generate` escribe `CREATE TABLE ...\n);` + `\n--> statement-breakpoint`. Al añadir statements a mano se puede perder el `);` y la migración falla en silencio: `src/index.ts` hace `migrate()` **antes** de `app.listen()`, así que el backend muere y **nada escucha en el 3001**; el navegador lo reporta como `CORS request did not succeed / Status code (null)`, que es conexión rechazada, no un problema de CORS. Diagnóstico: `ss -ltn | grep 3001` (vacío = caído) y `SELECT count(*) FROM drizzle.__drizzle_migrations` vs entradas del `_journal.json` (si falta una, la migración no corrió).
- `tsx watch` solo vigila `.ts`: editar un `.sql` de migración NO reinicia el backend; hay que relanzar `pnpm dev` para que el `migrate()` del arranque se ejecute.
- `tsc --noEmit` en frontend lee `.next/types/validator.ts`: si da errores raros de `Route`, borrar `.next` y reconstruir.
- Bruno: requests que validan bloqueo por rol usan `{{recepcionToken}}`, que rellena `auth/login-recepcion.bru`. Tras el cambio a cookies, `register/login/login-recepcion/refresh.bru` extraen el token desde `res.headers["set-cookie"]` (parseando `token=`), no de `res.body.token`.
- pnpm v12 **ignora `pnpm.overrides` en `package.json`**: los overrides de auditoría van en `pnpm-workspace.yaml` (sección `overrides:`). pnpm añade `minimumReleaseAgeExclude` solo al instalar versiones muy recientes.

## Checklist si algo cambia

Al tocar lo siguiente, actualizar estos ficheros/puntos:

- Conteos de tests → `AGENTS.md` raíz, `frontend/AGENTS.md`, `backend/AGENTS.md`, `README.md`
- `lib/utils.ts` / `lib/export-report.ts` / `components/reports-print-doc.tsx` → descripciones de estructura en README/AGENTS
- Nuevo endpoint/colección → `backend/AGENTS.md` + Bruno (mantener sincronizado)
- Schema DB → regenerar migración + re-seed (advertencia ya en AGENTS.md)