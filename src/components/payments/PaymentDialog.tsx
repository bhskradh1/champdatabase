import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Search, User } from "lucide-react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
}

const PaymentDialog = ({ open, onOpenChange, onSuccess, userId }: PaymentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "cash",
    payment_date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const { data: students } = useQuery<any[]>({
    queryKey: ["students"],
    queryFn: async (): Promise<any[]> => {
      // cast to any because DB schema may not yet include fee_paid_current_year in generated types
      const { data, error } = await (supabase.from("students") as any)
        .select("id, student_id, name, roll_number, class, section, total_fee, fee_paid, fee_paid_current_year")
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const filteredStudents = students?.filter(student => 
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.student_id.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.roll_number.toLowerCase().includes(studentSearch.toLowerCase())
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a student",
      });
      return;
    }

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
    try {
      const { error } = await supabase
        .from("fee_payments")
        .insert({
          student_id: selectedStudent.id,
          amount: amount,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          remarks: formData.remarks || null,
          created_by: userId,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      setFormData({
        amount: "",
        payment_method: "cash",
        payment_date: new Date().toISOString().split("T")[0],
        remarks: "",
      });
      setSelectedStudent(null);
      setStudentSearch("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      amount: "",
      payment_method: "cash",
      payment_date: new Date().toISOString().split("T")[0],
      remarks: "",
    });
    setSelectedStudent(null);
    setStudentSearch("");
    onOpenChange(false);
  };

  // Use fee_paid_current_year if present; otherwise fall back to legacy fee_paid
  const paidThisYear = selectedStudent ? (selectedStudent.fee_paid_current_year ?? selectedStudent.fee_paid ?? 0) : 0;
  const feeDue = selectedStudent ? (selectedStudent.total_fee + (selectedStudent.previous_year_balance ?? 0) - paidThisYear) : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Fee Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Selection */}
          <div className="space-y-4">
            <Label>Select Student</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, student ID, or roll number..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {studentSearch && (
              <div className="max-h-40 overflow-y-auto border rounded-md">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student: any) => (
                    <div
                      key={String(student.id)}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        setSelectedStudent(student);
                        setStudentSearch(String(student.name));
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {student.student_id} • {student.class}
                            {student.section && `-${student.section}`} • Roll: {student.roll_number}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-muted-foreground text-center">
                    No students found
                  </div>
                )}
              </div>
            )}

            {selectedStudent && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Student:</span>
                  <span className="font-medium">{selectedStudent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ID:</span>
                  <span className="font-medium">{selectedStudent.student_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Class:</span>
                  <span className="font-medium">
                    {selectedStudent.class} {selectedStudent.section && `- ${selectedStudent.section}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Fee:</span>
                  <span className="font-medium">Rs. {selectedStudent.total_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Already Paid (This Year):</span>
                  <span className="font-medium">Rs. {paidThisYear.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Fee Due:</span>
                  <span className="font-bold text-destructive">Rs. {feeDue.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          {selectedStudent && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount *</Label>
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
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method *</Label>
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
              <div className="space-y-2 col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedStudent}>
              {loading ? "Processing..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
