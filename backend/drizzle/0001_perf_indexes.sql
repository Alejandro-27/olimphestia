-- Índices de rendimiento para las consultas más frecuentes.
-- IF NOT EXISTS: el baseline ya los crea en instalaciones nuevas y producción
-- puede aplicarlos sin conflicto.

CREATE INDEX IF NOT EXISTS "idx_reservations_tenant_status_checkout" ON "reservations" USING btree ("tenant_id","status","check_out");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reservations_tenant_room_dates" ON "reservations" USING btree ("tenant_id","room_id","check_in","check_out");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_tenant_reservation" ON "invoices" USING btree ("tenant_id","reservation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_tenant_room_date" ON "sales" USING btree ("tenant_id","room_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_refresh_sessions_user" ON "refresh_sessions" USING btree ("user_id");--> statement-breakpoint
