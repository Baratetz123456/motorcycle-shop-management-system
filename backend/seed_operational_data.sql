-- Ensure Schema Parity & Migrations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_type' AND typnamespace = 'inventory'::regnamespace) THEN
        CREATE TYPE inventory.item_type AS ENUM ('PRODUCT', 'SERVICE');
    END IF;
END $$;

ALTER TABLE inventory.items ADD COLUMN IF NOT EXISTS item_type inventory.item_type NOT NULL DEFAULT 'PRODUCT';

ALTER TABLE sales.transactions ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(255);
ALTER TABLE sales.transactions ADD COLUMN IF NOT EXISTS mechanic_name VARCHAR(255);
ALTER TABLE sales.transactions ADD COLUMN IF NOT EXISTS job_order_id UUID;
ALTER TABLE sales.transactions ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0;
ALTER TABLE sales.transactions ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE sales.transactions ADD COLUMN IF NOT EXISTS cash_received NUMERIC(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE sales.transactions ADD COLUMN IF NOT EXISTS cash_change NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE sales.transaction_items ALTER COLUMN item_id TYPE VARCHAR(100);

-- 1. Ensure Mechanics and Staff in auth.users
UPDATE auth.users 
SET first_name = 'Mike', last_name = 'Smith', commission_rate = 40.00 
WHERE id = '353a19e6-4994-4903-9432-4341423dace4';

INSERT INTO auth.users (id, first_name, last_name, email, password_hash, role, token_version, commission_rate, base_wage)
VALUES 
  ('471b29a1-5820-4102-8312-3210412eabf1', 'Dave', 'Johnson', 'dave.johnson@motoshop.com', '$2b$12$K8y5E1yW/907lF5X97uY4JANjO2ZfWc56k8gM2Z6Z1W7k9p3vQGKy', 'mechanic', 1, 40.00, 0.00),
  ('582c30b2-6931-4213-9423-4321523fbca2', 'Alex', 'Rivera', 'alex.rivera@motoshop.com', '$2b$12$K8y5E1yW/907lF5X97uY4JANjO2ZfWc56k8gM2Z6Z1W7k9p3vQGKy', 'mechanic', 1, 40.00, 0.00)
ON CONFLICT (id) DO UPDATE SET 
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  commission_rate = EXCLUDED.commission_rate;

-- 2. Seed inventory.items (Products and Services)
INSERT INTO inventory.items (id, sku, name, item_type, category, current_stock, reorder_level, cost_price, selling_price)
VALUES
  -- Products
  ('10000000-0000-0000-0000-000000000001', 'OIL-10W40', 'Synthetic Motor Oil 10W-40', 'PRODUCT', 'Fluids', 45, 15, 9.50, 15.99),
  ('10000000-0000-0000-0000-000000000002', 'FLT-001', 'Premium Oil Filter', 'PRODUCT', 'Filters', 24, 10, 4.00, 8.50),
  ('10000000-0000-0000-0000-000000000003', 'BRK-PAD-F', 'Front Brake Pads', 'PRODUCT', 'Brakes', 18, 8, 18.00, 34.00),
  ('10000000-0000-0000-0000-000000000004', 'BRK-PAD-R', 'Rear Brake Pads', 'PRODUCT', 'Brakes', 16, 8, 16.00, 30.00),
  ('10000000-0000-0000-0000-000000000005', 'CHN-LUB', 'Chain Lube Spray 400ml', 'PRODUCT', 'Maintenance', 30, 10, 6.00, 12.00),
  ('10000000-0000-0000-0000-000000000006', 'SPK-PLG', 'Iridium Spark Plug CR9EIX', 'PRODUCT', 'Engine', 35, 12, 9.00, 18.25),
  ('10000000-0000-0000-0000-000000000007', 'TR-FR-120', 'Front Tire 120/70-17', 'PRODUCT', 'Tires', 8, 4, 75.00, 120.00),
  ('10000000-0000-0000-0000-000000000008', 'TR-RR-160', 'Rear Tire 160/60-17', 'PRODUCT', 'Tires', 6, 3, 95.00, 155.00),
  ('10000000-0000-0000-0000-000000000009', 'BLT-CVT-125', 'CVT Drive Belt 125cc', 'PRODUCT', 'Transmission', 14, 5, 12.00, 25.00),
  ('10000000-0000-0000-0000-000000000010', 'BAT-12V-9AH', 'Maintenance-Free Battery 12V 9Ah', 'PRODUCT', 'Electrical', 12, 5, 28.00, 52.00),
  ('10000000-0000-0000-0000-000000000011', 'COOL-ENG-1L', 'Heavy Duty Engine Coolant 1L', 'PRODUCT', 'Fluids', 20, 8, 5.50, 11.50),
  ('10000000-0000-0000-0000-000000000012', 'BRK-FLD-DOT4', 'Brake Fluid DOT 4 500ml', 'PRODUCT', 'Fluids', 25, 10, 4.20, 9.00),
  -- Services
  ('20000000-0000-0000-0000-000000000001', 'SRV-TUN-01', 'General Tune-Up & 25-Point Inspection', 'SERVICE', 'Maintenance', 0, 0, 20.00, 75.00),
  ('20000000-0000-0000-0000-000000000002', 'SRV-OIL-CHG', 'Oil & Filter Change Service', 'SERVICE', 'Maintenance', 0, 0, 10.00, 30.00),
  ('20000000-0000-0000-0000-000000000003', 'SRV-BRK-SRV', 'Brake Caliper Bleed & Cleaning Service', 'SERVICE', 'Brakes', 0, 0, 15.00, 45.00),
  ('20000000-0000-0000-0000-000000000004', 'SRV-CVT-CLN', 'CVT System Overhaul & Degreasing', 'SERVICE', 'Transmission', 0, 0, 18.00, 60.00),
  ('20000000-0000-0000-0000-000000000005', 'SRV-ENG-OVR', 'Engine Diagnostic & Valve Clearance Tune', 'SERVICE', 'Engine', 0, 0, 35.00, 110.00),
  ('20000000-0000-0000-0000-000000000006', 'SRV-FRK-SEAL', 'Front Fork Oil & Seal Replacement', 'SERVICE', 'Suspension', 0, 0, 25.00, 85.00),
  ('20000000-0000-0000-0000-000000000007', 'SRV-ELEC-DIAG', 'Complete Electrical System Diagnostic', 'SERVICE', 'Electrical', 0, 0, 15.00, 50.00)
ON CONFLICT (sku) DO UPDATE SET 
  name = EXCLUDED.name,
  item_type = EXCLUDED.item_type,
  category = EXCLUDED.category,
  current_stock = EXCLUDED.current_stock,
  reorder_level = EXCLUDED.reorder_level,
  cost_price = EXCLUDED.cost_price,
  selling_price = EXCLUDED.selling_price;

-- 3. Seed repairs.motorcycle_models
INSERT INTO repairs.motorcycle_models (id, brand, model, year, category)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'Yamaha', 'MT-07', 2023, 'Naked Sport'),
  ('30000000-0000-0000-0000-000000000002', 'Yamaha', 'NMAX 155', 2024, 'Scooter'),
  ('30000000-0000-0000-0000-000000000003', 'Honda', 'Click 125i', 2022, 'Scooter'),
  ('30000000-0000-0000-0000-000000000004', 'Honda', 'ADV 160', 2023, 'Adventure Scooter'),
  ('30000000-0000-0000-0000-000000000005', 'Kawasaki', 'Ninja 400', 2023, 'Sportbike'),
  ('30000000-0000-0000-0000-000000000006', 'Ducati', 'Panigale V4', 2023, 'Superbike'),
  ('30000000-0000-0000-0000-000000000007', 'Suzuki', 'Raider R150', 2024, 'Underbone')
ON CONFLICT DO NOTHING;

-- 4. Seed repairs.motorcycles
INSERT INTO repairs.motorcycles (id, plate_number, brand, model, year, color, customer_name, customer_contact, notes)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'ABC-1234', 'Yamaha', 'MT-07', 2023, 'Cyan Storm', 'John Doe', '+1 (555) 234-5678', 'Front brake pads & synthetic oil change service scheduled.'),
  ('40000000-0000-0000-0000-000000000002', 'XYZ-9876', 'Honda', 'Click 125i', 2022, 'Matte Black', 'Jane Roe', '+1 (555) 876-5432', 'CVT system inspection and drive belt maintenance.'),
  ('40000000-0000-0000-0000-000000000003', 'KAW-4001', 'Kawasaki', 'Ninja 400', 2023, 'Lime Green', 'Bob Lee', '+1 (555) 432-1098', 'Chain lubrication and valve clearance checkup.'),
  ('40000000-0000-0000-0000-000000000004', 'DUC-9988', 'Ducati', 'Panigale V4', 2023, 'Rosso Corsa', 'Carlos Mendoza', '+1 (555) 321-7654', 'Desmoservice valve check and Iridium spark plugs.'),
  ('40000000-0000-0000-0000-000000000005', 'SUZ-1502', 'Suzuki', 'Raider R150', 2024, 'Metallic Blue', 'Marcus Vance', '+1 (555) 654-9870', 'Carb/FI system tune-up and brake bleeding.')
ON CONFLICT (plate_number) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  customer_contact = EXCLUDED.customer_contact,
  notes = EXCLUDED.notes;

-- 5. Seed repairs.job_orders
INSERT INTO repairs.job_orders (id, jo_number, customer_name, motorcycle_id, mechanic_id, mechanic_name, mechanic_notes, labor_charge, parts_charge, is_paid, payment_status, status, created_at)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'JO-A1B2', 'John Doe', 'Yamaha MT-07 (2023)', '353a19e6-4994-4903-9432-4341423dace4', 'Mike Smith', 'Replaced front brake pads and synthetic oil. Torqued to specification.', 75.00, 49.99, TRUE, 'PAID', 'RELEASED', NOW() - INTERVAL '3 days'),
  ('50000000-0000-0000-0000-000000000002', 'JO-C3D4', 'Jane Roe', 'Honda Click 125i (2022)', '353a19e6-4994-4903-9432-4341423dace4', 'Mike Smith', 'CVT belt cleaned and rollers inspected.', 60.00, 25.00, FALSE, 'UNPAID', 'PENDING', NOW() - INTERVAL '4 hours'),
  ('50000000-0000-0000-0000-000000000003', 'JO-E5F6', 'Bob Lee', 'Kawasaki Ninja 400 (2023)', '471b29a1-5820-4102-8312-3210412eabf1', 'Dave Johnson', 'Chain adjusted, lubed, and full brake bleed performed.', 45.00, 12.00, FALSE, 'UNPAID', 'ONGOING', NOW() - INTERVAL '2 hours'),
  ('50000000-0000-0000-0000-000000000004', 'JO-G7H8', 'Carlos Mendoza', 'Ducati Panigale V4 (2023)', '582c30b2-6931-4213-9423-4321523fbca2', 'Alex Rivera', 'Engine diagnostic complete. Valve clearance within spec.', 110.00, 73.00, FALSE, 'UNPAID', 'ONGOING', NOW() - INTERVAL '1 day'),
  ('50000000-0000-0000-0000-000000000005', 'JO-K9L0', 'Marcus Vance', 'Suzuki Raider R150 (2024)', '353a19e6-4994-4903-9432-4341423dace4', 'Mike Smith', 'Oil and filter change completed. Test ride passed.', 30.00, 24.49, TRUE, 'PAID', 'COMPLETED', NOW() - INTERVAL '5 hours')
ON CONFLICT (jo_number) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  motorcycle_id = EXCLUDED.motorcycle_id,
  mechanic_id = EXCLUDED.mechanic_id,
  mechanic_name = EXCLUDED.mechanic_name,
  status = EXCLUDED.status,
  is_paid = EXCLUDED.is_paid,
  payment_status = EXCLUDED.payment_status;

-- 6. Seed repairs.repair_cart_items
INSERT INTO repairs.repair_cart_items (id, job_order_id, item_name, item_type, qty, unit_price, total_price)
VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Synthetic Motor Oil 10W-40', 'PRODUCT', 1, 15.99, 15.99),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Front Brake Pads', 'PRODUCT', 1, 34.00, 34.00),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'CVT Drive Belt 125cc', 'PRODUCT', 1, 25.00, 25.00),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000003', 'Chain Lube Spray 400ml', 'PRODUCT', 1, 12.00, 12.00),
  ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000004', 'Iridium Spark Plug CR9EIX', 'PRODUCT', 4, 18.25, 73.00),
  ('60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000005', 'Premium Oil Filter', 'PRODUCT', 1, 8.50, 8.50),
  ('60000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000005', 'Synthetic Motor Oil 10W-40', 'PRODUCT', 1, 15.99, 15.99)
ON CONFLICT (id) DO NOTHING;

-- 7. Seed repairs.commissions
INSERT INTO repairs.commissions (id, job_order_id, mechanic_id, labor_base, rate_percentage, amount_earned, created_at)
VALUES
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '353a19e6-4994-4903-9432-4341423dace4', 75.00, 40.00, 30.00, NOW() - INTERVAL '3 days'),
  ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000005', '353a19e6-4994-4903-9432-4341423dace4', 30.00, 40.00, 12.00, NOW() - INTERVAL '5 hours')
ON CONFLICT (id) DO NOTHING;

-- 8. Seed sales.transactions, items, payments
INSERT INTO sales.transactions (id, invoice_no, cashier_name, mechanic_name, job_order_id, subtotal, discount_percentage, discount_amount, total, amount_paid, cash_received, cash_change, status, created_at)
VALUES
  ('80000000-0000-0000-0000-000000000001', 'INV-2026-0001', 'cashier@motoshop.com', 'Mike Smith', '50000000-0000-0000-0000-000000000001', 124.99, 0.00, 0.00, 124.99, 124.99, 150.00, 25.01, 'COMPLETED', NOW() - INTERVAL '3 days'),
  ('80000000-0000-0000-0000-000000000002', 'INV-2026-0002', 'cashier@motoshop.com', 'Mike Smith', '50000000-0000-0000-0000-000000000005', 54.49, 0.00, 0.00, 54.49, 54.49, 60.00, 5.51, 'COMPLETED', NOW() - INTERVAL '5 hours'),
  ('80000000-0000-0000-0000-000000000003', 'INV-2026-0003', 'cashier@motoshop.com', 'Dave Johnson', NULL, 15.99, 0.00, 0.00, 15.99, 15.99, 20.00, 4.01, 'COMPLETED', NOW() - INTERVAL '2 days'),
  ('80000000-0000-0000-0000-000000000004', 'INV-2026-0004', 'cashier@motoshop.com', 'Alex Rivera', NULL, 64.00, 0.00, 0.00, 64.00, 64.00, 100.00, 36.00, 'COMPLETED', NOW() - INTERVAL '1 day')
ON CONFLICT (invoice_no) DO UPDATE SET
  total = EXCLUDED.total,
  status = EXCLUDED.status;

INSERT INTO sales.transaction_items (id, transaction_id, item_id, qty, price)
VALUES
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 15.99),
  ('90000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 1, 34.00),
  ('90000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 75.00),
  ('90000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 1, 8.50),
  ('90000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 1, 15.99),
  ('90000000-0000-0000-0000-000000000006', '80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1, 30.00),
  ('90000000-0000-0000-0000-000000000007', '80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 1, 15.99),
  ('90000000-0000-0000-0000-000000000008', '80000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 1, 34.00),
  ('90000000-0000-0000-0000-000000000009', '80000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 1, 30.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales.payments (id, transaction_id, amount, method)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 124.99, 'CASH'),
  ('a0000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 54.49, 'CASH'),
  ('a0000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000003', 15.99, 'CASH'),
  ('a0000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000004', 64.00, 'CARD')
ON CONFLICT (id) DO NOTHING;
