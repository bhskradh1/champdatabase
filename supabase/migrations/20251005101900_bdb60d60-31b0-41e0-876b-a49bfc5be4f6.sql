-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  class TEXT NOT NULL,
  section TEXT,
  contact TEXT,
  address TEXT,
  total_fee DECIMAL(10,2) DEFAULT 0,
  fee_paid DECIMAL(10,2) DEFAULT 0,
  attendance_percentage DECIMAL(5,2) DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create policies for students
CREATE POLICY "Authenticated users can view students" 
ON public.students 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create students" 
ON public.students 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update students" 
ON public.students 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete students" 
ON public.students 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create fee_payments table
CREATE TABLE public.fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS for fee_payments
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fee payments" 
ON public.fee_payments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create fee payments" 
ON public.fee_payments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  UNIQUE(student_id, date)
);

-- Enable RLS for attendance
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view attendance" 
ON public.attendance_records 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create attendance" 
ON public.attendance_records 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update attendance" 
ON public.attendance_records 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create trigger for updating student updated_at
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate fee due
CREATE OR REPLACE FUNCTION public.calculate_fee_due(student_uuid UUID)
RETURNS DECIMAL AS $$
  SELECT COALESCE(s.total_fee, 0) - COALESCE(s.fee_paid, 0)
  FROM public.students s
  WHERE s.id = student_uuid;
$$ LANGUAGE SQL STABLE;

-- Function to update student fee_paid after payment
CREATE OR REPLACE FUNCTION public.update_student_fee_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Only count actual payments towards fee_paid. Exclude ledger adjustments
  -- such as carry_forward and outstanding_due which represent previous-year
  -- adjustments and should not be treated as payments for the current year.
  UPDATE public.students
  SET fee_paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.fee_payments
    WHERE student_id = NEW.student_id
      AND (payment_method IS NULL OR payment_method NOT IN ('carry_forward', 'outstanding_due'))
  )
  WHERE id = NEW.student_id;
  -- Also maintain a separate column for payments made in the current year.
  -- This column will be used for display and reporting as `fee_paid_current_year`.
  BEGIN
    UPDATE public.students
    SET fee_paid_current_year = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.fee_payments
      WHERE student_id = NEW.student_id
        AND (payment_method IS NULL OR payment_method NOT IN ('carry_forward', 'outstanding_due'))
    )
    WHERE id = NEW.student_id;
  EXCEPTION WHEN undefined_column THEN
    -- If the column doesn't exist yet (older schema), ignore and continue
    NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update fee_paid when payment is made
CREATE TRIGGER update_fee_paid_on_payment
AFTER INSERT ON public.fee_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_student_fee_paid();

-- Function to update student attendance percentage
CREATE OR REPLACE FUNCTION public.update_student_attendance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.students
  SET attendance_percentage = (
    SELECT ROUND(
      (COUNT(*) FILTER (WHERE status = 'present')::DECIMAL / 
       NULLIF(COUNT(*), 0) * 100)::NUMERIC, 
      2
    )
    FROM public.attendance_records
    WHERE student_id = COALESCE(NEW.student_id, OLD.student_id)
  )
  WHERE id = COALESCE(NEW.student_id, OLD.student_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update attendance percentage
CREATE TRIGGER update_attendance_percentage
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_student_attendance();