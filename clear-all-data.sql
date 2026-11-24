-- ============================================================
-- ONE-TIME CLEANUP: wipe all transactional/demo data for launch
-- Keeps: dishes, tables, users, settings, team, inventory,
--        rooms (master/configuration data)
-- Run this once in the Supabase SQL Editor.
-- ============================================================

BEGIN;

TRUNCATE TABLE
  order_items,
  orders,
  payments,
  notifications,
  reservations,
  bookings,
  delivery,
  transactions,
  campaigns,
  attendance,
  shifts,
  dish_ratings,
  customers
RESTART IDENTITY CASCADE;

-- Reset all tables to available
UPDATE tables
SET is_occupied = false,
    is_prebooked = false,
    prebooked_by = NULL,
    prebooked_time = NULL;

COMMIT;
