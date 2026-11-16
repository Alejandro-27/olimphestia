import { and, desc, eq, gt, gte, inArray, lt, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { expenses, invoices, products, reservations, rooms, sales } from '../../db/schema.js'
import { getOccupiedRoomIds } from '../rooms/service.js'
import { CACHE_TTL, cached } from '../../lib/cache.js'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthStart(offset: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function effectiveStatus(room: { id: string; status: string }, occupiedIds: Set<string>) {
  if (room.status === 'mantenimiento' || room.status === 'limpieza') return room.status
  return occupiedIds.has(room.id) ? 'ocupada' : room.status
}

async function loadDashboard(tenantId: string) {
  const today = todayStr()

  const [[stats], pendingCheckins, lowStockProducts] = await Promise.all([
    db.select({
      totalRooms: sql<number>`count(distinct ${rooms.id})`,
      occupiedRooms: sql<number>`count(distinct ${rooms.id}) filter (where ${rooms.status} = 'ocupada' or (${rooms.status} not in ('mantenimiento', 'limpieza') and ${reservations.roomId} is not null))`,
      lodging: sql<number>`(select coalesce(sum(rm.price_per_night), 0) from ${reservations} r join ${rooms} rm on rm.id = r.room_id where r.tenant_id = ${tenantId} and r.status = 'checkin')`,
      catering: sql<number>`(select coalesce(sum(s.total), 0) from ${sales} s where s.tenant_id = ${tenantId} and s.date = ${today})`,
    }).from(rooms)
      .leftJoin(reservations, and(
        eq(reservations.roomId, rooms.id),
        eq(reservations.tenantId, rooms.tenantId),
        inArray(reservations.status, ['confirmada', 'checkin']),
        gt(reservations.checkOut, today),
      ))
      .where(eq(rooms.tenantId, tenantId)),
    db.select()
      .from(reservations)
      .where(and(
        eq(reservations.tenantId, tenantId),
        eq(reservations.status, 'confirmada'),
      ))
      .orderBy(desc(reservations.checkIn)),
    db.select().from(products).where(and(
      eq(products.tenantId, tenantId),
      eq(products.active, true),
      lt(products.currentStock, products.minStock),
    )),
  ])

  const totalRooms = Number(stats?.totalRooms ?? 0)
  const occupied = Number(stats?.occupiedRooms ?? 0)
  const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0

  return {
    occupancyRate,
    dailyRevenue: Math.round((Number(stats?.lodging ?? 0) + Number(stats?.catering ?? 0)) * 100) / 100,
    pendingCheckins,
    lowStockProducts,
  }
}

async function loadFinancialReport(tenantId: string, months = 6) {
  const start = monthStart(months - 1)
  const end = monthStart(-1)
  const monthKeys: string[] = []
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    monthKeys.push(monthStart(offset).slice(0, 7))
  }

  const salesMonth = sql<string>`left(${sales.date}, 7)`
  const reservationsMonth = sql<string>`left(${reservations.checkIn}, 7)`
  const expensesMonth = sql<string>`left(${expenses.date}, 7)`

  const [salesRows, reservationRows, expenseRows, invoiceTotals] = await Promise.all([
    db.select({ month: salesMonth, total: sql<number>`coalesce(sum(${sales.total}), 0)` })
      .from(sales)
      .where(and(eq(sales.tenantId, tenantId), gte(sales.date, start), lt(sales.date, end)))
      .groupBy(salesMonth),
    db.select({ month: reservationsMonth, total: sql<number>`coalesce(sum(${reservations.totalAmount}), 0)` })
      .from(reservations)
      .where(and(
        eq(reservations.tenantId, tenantId),
        eq(reservations.status, 'checkout'),
        gte(reservations.checkIn, start),
        lt(reservations.checkIn, end),
      ))
      .groupBy(reservationsMonth),
    db.select({ month: expensesMonth, total: sql<number>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(eq(expenses.tenantId, tenantId), gte(expenses.date, start), lt(expenses.date, end)))
      .groupBy(expensesMonth),
    db.select({
      subtotal: sql<number>`coalesce(sum(${invoices.subtotal}), 0)`,
      paid: sql<number>`coalesce(sum(${invoices.advancePayment}), 0)`,
    }).from(invoices).where(eq(invoices.tenantId, tenantId)),
  ])

  const toMap = (rows: { month: string; total: number }[]) =>
    new Map(rows.map((row) => [row.month, Number(row.total)]))
  const salesByMonth = toMap(salesRows)
  const reservationsByMonth = toMap(reservationRows)
  const expensesByMonth = toMap(expenseRows)

  const monthlyRevenue = monthKeys.map((key) => ({
    month: monthNames[Number(key.slice(5, 7)) - 1],
    ingresos: Math.round(((salesByMonth.get(key) ?? 0) + (reservationsByMonth.get(key) ?? 0)) * 100) / 100,
    gastos: Math.round((expensesByMonth.get(key) ?? 0) * 100) / 100,
  }))

  const totals = invoiceTotals[0]

  return {
    monthlyRevenue,
    totalRevenue: Number(totals?.subtotal ?? 0),
    totalPaid: Number(totals?.paid ?? 0),
  }
}

async function loadOccupancyReport(tenantId: string) {
  const [allRooms, occupiedIds] = await Promise.all([
    db.select({
      id: rooms.id,
      type: rooms.type,
      status: rooms.status,
    }).from(rooms).where(eq(rooms.tenantId, tenantId)),
    getOccupiedRoomIds(tenantId),
  ])
  const total = allRooms.length
  const occupied = allRooms.filter(r => effectiveStatus(r, occupiedIds) === 'ocupada').length

  const byType = ['individual', 'doble', 'suite', 'familiar'].map(type => {
    const roomsOfType = allRooms.filter(r => r.type === type)
    return {
      type,
      total: roomsOfType.length,
      occupied: roomsOfType.filter(r => effectiveStatus(r, occupiedIds) === 'ocupada').length,
    }
  })

  const byStatus = ['libre', 'ocupada', 'mantenimiento', 'limpieza'].map(status => ({
    status,
    count: allRooms.filter(r => effectiveStatus(r, occupiedIds) === status).length,
  }))

  return {
    rate: total > 0 ? Math.round((occupied / total) * 100) : 0,
    totalRooms: total,
    occupiedRooms: occupied,
    byType,
    byStatus,
  }
}

export function getDashboard(tenantId: string) {
  return cached(`reports:dashboard:${tenantId}`, CACHE_TTL.report, () => loadDashboard(tenantId))
}

export function getFinancialReport(tenantId: string, months = 6) {
  return cached(`reports:financial:${tenantId}:${months}`, CACHE_TTL.report, () => loadFinancialReport(tenantId, months))
}

export function getOccupancyReport(tenantId: string) {
  return cached(`reports:occupancy:${tenantId}`, CACHE_TTL.report, () => loadOccupancyReport(tenantId))
}
