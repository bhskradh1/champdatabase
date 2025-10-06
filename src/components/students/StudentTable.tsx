import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EditStudentDialog from "./EditStudentDialog";
import FeePaymentDialog from "./FeePaymentDialog";
import StudentPromotionDialog from "./StudentPromotionDialog";

interface Student {
  id: string;
  student_id: string;
  name: string;
  roll_number: string;
  class: string;
  section: string | null;
  contact: string | null;
  address: string | null;
  total_fee: number;
  fee_paid: number;
  attendance_percentage: number;
  remarks: string | null;
}

interface StudentTableProps {
  students: Student[];
  onRefetch: () => void;
}

const StudentTable = ({ students, onRefetch }: StudentTableProps) => {
  const { toast } = useToast();
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [feePaymentStudent, setFeePaymentStudent] = useState<Student | null>(null);
  const [promotionStudent, setPromotionStudent] = useState<Student | null>(null);
  const [carryForwardMap, setCarryForwardMap] = useState<Record<string, number>>({});

  useEffect(() => {
    // Fetch carry-forward and outstanding_due fee_payments for the currently displayed
    // students and aggregate per student so we can subtract these ledger adjustments
    // from the displayed "fee_paid" in the UI. This is a client-side safety net
    // for deployments where the DB trigger hasn't been migrated yet.
    const fetchAdjustments = async () => {
      try {
        const ids = students.map(s => s.id);
        if (ids.length === 0) {
          setCarryForwardMap({});
          return;
        }

        const { data, error } = await supabase
          .from("fee_payments")
          .select("student_id, amount, payment_method")
          .in("student_id", ids)
          .in("payment_method", ["carry_forward", "outstanding_due"]);

        if (error) {
          console.error("Failed to load fee adjustment payments", error);
          setCarryForwardMap({});
          return;
        }

        const map: Record<string, number> = {};
        (data || []).forEach((p: any) => {
          const sid = p.student_id as string;
          const amt = Number(p.amount) || 0;
          map[sid] = (map[sid] || 0) + amt;
        });

        setCarryForwardMap(map);
      } catch (err) {
        console.error(err);
        setCarryForwardMap({});
      }
    };

    fetchAdjustments();
  }, [students]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete student",
      });
    } else {
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      onRefetch();
    }
  };

  const getFeesStatus = (total: number, paid: number) => {
  const due = total - paid;

  if (due < 0) {
    // Extra fees paid
    return <Badge className="bg-blue-500">Extra Paid</Badge>;
  }

  if (due === 0) {
    return <Badge className="bg-green-500">Paid</Badge>;
  }

  if (paid > 0) {
    return <Badge className="bg-amber-500">Partial</Badge>;
  }

  return <Badge variant="destructive">Pending</Badge>;

  };

  const canPromote = (student: Student) => {
    const classProgression: Record<string, string> = {
      "Nursery": "LKG",
      "LKG": "UKG", 
      "UKG": "1st",
      "1st": "2nd",
      "2nd": "3rd",
      "3rd": "4th",
      "4th": "5th",
      "5th": "6th",
      "6th": "7th",
      "7th": "8th",
      "8th": "9th",
      "9th": "10th",
      "10th": "11th",
      "11th": "12th",
      "12th": "Graduated"
    };
    return classProgression[student.class] !== "Graduated";
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Roll</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Total Fee</TableHead>
            <TableHead>Fee Paid</TableHead>
            <TableHead>Fee Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Attendance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                No students found. Add your first student to get started.
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.student_id}</TableCell>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.roll_number}</TableCell>
                <TableCell>
                  {student.class} {student.section && `- ${student.section}`}
                </TableCell>
                <TableCell>{student.contact || "-"}</TableCell>
                <TableCell>Rs. {student.total_fee.toLocaleString()}</TableCell>
                {/* Displayed paid should exclude previous-year carry-forward/outstanding adjustments */}
                {(() => {
                  const ledgerAdjustments = carryForwardMap[student.id] || 0; // carry_forward + outstanding_due
                  const paidThisYear = (student as any).fee_paid_current_year ?? student.fee_paid ?? 0;
                  // Subtract ledger adjustments if they were (incorrectly) included in fee_paid
                  const displayedPaid = Math.max(0, paidThisYear - ledgerAdjustments);
                  const prevBal = (student as any).previous_year_balance ?? 0;
                  // total due = current_year_fees (student.total_fee) + previous_year_balance - fee_paid_current_year
                  const displayedDue = Math.round((student.total_fee + prevBal) - displayedPaid);
                  return (
                    <>
                      <TableCell>Rs. {displayedPaid.toLocaleString()}</TableCell>
                      <TableCell>Rs. {displayedDue.toLocaleString()}</TableCell>
                      <TableCell>{getFeesStatus(student.total_fee + prevBal, displayedPaid)}</TableCell>
                    </>
                  );
                })()}
                <TableCell>{student.attendance_percentage}%</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFeePaymentStudent(student)}
                      title="Record Payment"
                    >
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </Button>
                    {canPromote(student) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPromotionStudent(student)}
                        title="Promote to Next Class"
                      >
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditStudent(student)}
                      title="Edit Student"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(student.id)}
                      title="Delete Student"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <EditStudentDialog
        open={!!editStudent}
        onOpenChange={(open) => !open && setEditStudent(null)}
        student={editStudent}
        onSuccess={onRefetch}
      />

      <FeePaymentDialog
        open={!!feePaymentStudent}
        onOpenChange={(open) => !open && setFeePaymentStudent(null)}
        student={feePaymentStudent}
        onSuccess={onRefetch}
      />

      <StudentPromotionDialog
        open={!!promotionStudent}
        onOpenChange={(open) => !open && setPromotionStudent(null)}
        student={promotionStudent}
        onSuccess={onRefetch}
      />
    </div>
  );
};

export default StudentTable;
