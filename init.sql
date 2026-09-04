-- Create Schemas
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE SCHEMA IF NOT EXISTS repairs;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS audit;

-- Auth Schema
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL DEFAULT '',
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'cashier',
    token_version INTEGER NOT NULL DEFAULT 1,
    commission_rate NUMERIC(5, 2) DEFAULT 40.0,
    base_wage NUMERIC(10, 2) DEFAULT 650.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Schema
CREATE TYPE inventory.item_type AS ENUM ('PRODUCT', 'SERVICE');

CREATE TABLE inventory.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    item_type inventory.item_type NOT NULL DEFAULT 'PRODUCT',
    category VARCHAR(100),
    current_stock INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 5,
    cost_price NUMERIC(10, 2) NOT NULL,
    selling_price NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TYPE inventory.movement_type AS ENUM ('IN', 'OUT', 'SALE', 'REPAIR');

CREATE TABLE inventory.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES inventory.items(id),
    type inventory.movement_type NOT NULL,
    quantity_changed INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reference_id UUID, -- Can link to transaction_id or job_order_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sales Schema
CREATE TYPE sales.transaction_status AS ENUM ('PENDING', 'COMPLETED', 'VOIDED');

CREATE TABLE sales.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID,
    cashier_name VARCHAR(255),
    mechanic_name VARCHAR(255),
    job_order_id UUID,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cash_received NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cash_change NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status sales.transaction_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES sales.transactions(id),
    item_id VARCHAR(100) NOT NULL,
    qty INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE sales.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES sales.transactions(id),
    amount NUMERIC(10, 2) NOT NULL,
    method VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Repairs Schema
CREATE TYPE repairs.job_status AS ENUM ('PENDING', 'ONGOING', 'COMPLETED', 'RELEASED');

CREATE TABLE repairs.motorcycle_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    category VARCHAR(50) DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE repairs.motorcycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number VARCHAR(50) UNIQUE NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER,
    color VARCHAR(50),
    engine_number VARCHAR(100),
    chassis_number VARCHAR(100),
    customer_name VARCHAR(255) NOT NULL,
    customer_contact VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_motorcycles_customer_name ON repairs.motorcycles(customer_name);

CREATE TABLE repairs.job_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jo_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID,
    customer_name VARCHAR(255),
    motorcycle_id VARCHAR(100),
    mechanic_id UUID REFERENCES auth.users(id),
    mechanic_name VARCHAR(255),
    mechanic_notes TEXT,
    labor_charge NUMERIC(10, 2) NOT NULL DEFAULT 0,
    parts_charge NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'UNPAID',
    status repairs.job_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE repairs.repair_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id UUID REFERENCES repairs.job_orders(id) ON DELETE CASCADE,
    item_id UUID,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'PRODUCT',
    qty INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE repairs.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id UUID REFERENCES repairs.job_orders(id),
    mechanic_id UUID REFERENCES auth.users(id),
    labor_base NUMERIC(10, 2) NOT NULL,
    rate_percentage NUMERIC(5, 2) NOT NULL,
    amount_earned NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE repairs.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Schema & Immutable Audit Logs
CREATE TABLE audit.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45)
);

-- Immutability Trigger: Block UPDATE (except FK cascade set null) and DELETE on audit.logs
CREATE OR REPLACE FUNCTION audit.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Audit log entries are immutable and cannot be deleted.';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.action <> NEW.action OR 
           OLD.resource <> NEW.resource OR 
           OLD.timestamp <> NEW.timestamp OR 
           OLD.ip_address IS DISTINCT FROM NEW.ip_address OR 
           OLD.user_role IS DISTINCT FROM NEW.user_role OR
           OLD.details IS DISTINCT FROM NEW.details OR
           (OLD.user_id IS NOT NULL AND NEW.user_id IS NOT NULL AND OLD.user_id <> NEW.user_id) THEN
            RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit.logs
FOR EACH ROW EXECUTE FUNCTION audit.prevent_audit_log_modification();

