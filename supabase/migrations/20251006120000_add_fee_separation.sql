-- Migration: Add explicit fee separation columns and reporting view
-- Adds: previous_year_balance (DECIMAL), fee_paid_current_year (DECIMAL)
-- Creates: function public.calculate_total_due and view public.student_fee_overview

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS previous_year_balance DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_paid_current_year DECIMAL(10,2) DEFAULT 0;

-- Function to calculate total due following rules:
-- total_due = current_year_fees + previous_year_balance - fee_paid_current_year
CREATE OR REPLACE FUNCTION public.calculate_total_due(
  p_previous_year_balance DECIMAL,
  p_current_year_fees DECIMAL,
  p_fee_paid_current_year DECIMAL
) RETURNS DECIMAL AS $$
  SELECT (COALESCE(p_current_year_fees, 0) + COALESCE(p_previous_year_balance, 0) - COALESCE(p_fee_paid_current_year, 0));
$$ LANGUAGE SQL STRICT STABLE;

-- Create a materialized view (or view) that gives a clear separation for reporting
CREATE OR REPLACE VIEW public.student_fee_overview AS
SELECT
  s.id,
  s.student_id,
  s.name,
  s.class,
  s.section,
  s.previous_year_balance,
  s.total_fee AS current_year_fees,
  s.fee_paid_current_year,
  public.calculate_total_due(s.previous_year_balance, s.total_fee, s.fee_paid_current_year) AS total_due,
  CASE WHEN public.calculate_total_due(s.previous_year_balance, s.total_fee, s.fee_paid_current_year) > 0
       THEN public.calculate_total_due(s.previous_year_balance, s.total_fee, s.fee_paid_current_year)
       ELSE 0 END AS outstanding,
  CASE WHEN public.calculate_total_due(s.previous_year_balance, s.total_fee, s.fee_paid_current_year) < 0
       THEN ABS(public.calculate_total_due(s.previous_year_balance, s.total_fee, s.fee_paid_current_year))
       ELSE 0 END AS extra_paid
FROM public.students s;

-- Note: After running this migration, update any DB triggers that previously relied on fee_payments sum into s.fee_paid
-- The app should now write actual current-year payments into fee_payments and also update students.fee_paid_current_year
-- via business logic or a DB trigger that only sums real payment methods (exclude carry_forward/outstanding_due ledger rows).
