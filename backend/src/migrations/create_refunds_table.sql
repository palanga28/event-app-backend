-- Table des remboursements
CREATE TABLE IF NOT EXISTS "Refunds" (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES "Tickets"(id) ON DELETE CASCADE,
  payment_id INTEGER NOT NULL REFERENCES "Payments"(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  original_amount INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'CDF',
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, cancelled
  mobile_number VARCHAR(20),
  refund_transaction_ref VARCHAR(50),
  approved_by INTEGER REFERENCES "Users"(id),
  approved_at TIMESTAMP,
  rejected_by INTEGER REFERENCES "Users"(id),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON "Refunds"(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_ticket_id ON "Refunds"(ticket_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON "Refunds"(status);
CREATE INDEX IF NOT EXISTS idx_refunds_event_id ON "Refunds"(event_id);

-- Désactiver RLS pour éviter les problèmes de permissions
ALTER TABLE "Refunds" DISABLE ROW LEVEL SECURITY;
