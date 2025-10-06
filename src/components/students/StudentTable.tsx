import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EditStudentDialog from "./EditStudentDialog";
import FeePaymentDialog from "./FeePaymentDialog";

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
    if (due === 0) return <Badge className="bg-green-500">Paid</Badge>;
    if (paid > 0) return <Badge className="bg-amber-500">Partial</Badge>;
    return <Badge variant="destructive">Pending</Badge>;
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
                <TableCell>₹{student.total_fee.toLocaleString()}</TableCell>
                <TableCell>₹{student.fee_paid.toLocaleString()}</TableCell>
                <TableCell>₹{(student.total_fee - student.fee_paid).toLocaleString()}</TableCell>
                <TableCell>{getFeesStatus(student.total_fee, student.fee_paid)}</TableCell>
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
    </div>
  );
};

export default StudentTable;
