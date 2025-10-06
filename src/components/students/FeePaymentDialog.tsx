import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FeeSlipPrint from "./FeeSlipPrint";

interface Student {
  id: string;
  student_id: string;
  name: string;
  roll_number: string;
  class: string;
  section: string | null;
  contact: string | null;
  total_fee: number;
  fee_paid: number;
}

interface FeePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onSuccess: () => void;
}

const FeePaymentDialog = ({ open, onOpenChange, student, onSuccess }: FeePaymentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSlip, setShowSlip] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "cash",
    payment_date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Amount must be greater than 0",
      });
      return;
    }

    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    
    const { data, error } = await supabase
      .from("fee_payments")
      .insert({
        student_id: student.id,
        amount: amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        remarks: formData.remarks || null,
        created_by: session.session?.user.id || "",
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record payment",
      });
    } else {
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      setPaymentData({
        ...data,
        student_name: student.name,
        student_id: student.student_id,
        roll_number: student.roll_number,
        class: student.class,
        section: student.section,
        total_fee: student.total_fee,
        fee_paid: student.fee_paid,
        created_at: data.created_at,
      });
      setShowSlip(true);
      onSuccess();
    }
  };

  const handleClose = () => {
    setShowSlip(false);
    setPaymentData(null);
    setFormData({
      amount: "",
      payment_method: "cash",
      payment_date: new Date().toISOString().split("T")[0],
      remarks: "",
    });
    onOpenChange(false);
  };

  if (showSlip && paymentData) {
    return <FeeSlipPrint payment={paymentData} onClose={handleClose} />;
  }

  const feeDue = student ? student.total_fee - student.fee_paid : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Fee Payment</DialogTitle>
        </DialogHeader>
        {student && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Student:</span>
                <span className="font-medium">{student.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">ID:</span>
                <span className="font-medium">{student.student_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Class:</span>
                <span className="font-medium">
                  {student.class} {student.section && `- ${student.section}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Fee:</span>
                <span className="font-medium">Rs. {student.total_fee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Already Paid:</span>
                <span className="font-medium">Rs. {student.fee_paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-semibold">Fee Due:</span>
                <span className="font-bold text-destructive">Rs. {feeDue.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="Enter amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Processing..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeePaymentDialog;
