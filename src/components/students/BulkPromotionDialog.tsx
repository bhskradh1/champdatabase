import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, Calculator, AlertCircle, CheckCircle } from "lucide-react";

interface Student {
  id: string;
  student_id: string;
  name: string;
  roll_number: string;
  class: string;
  section: string | null;
  total_fee: number;
  fee_paid: number;
}

interface BulkPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  currentClass: string;
  onSuccess: () => void;
}

const BulkPromotionDialog = ({ open, onOpenChange, students, currentClass, onSuccess }: BulkPromotionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [nextClass, setNextClass] = useState("");
  const [nextSection, setNextSection] = useState("");
  const [newTotalFee, setNewTotalFee] = useState(0);

  // Class progression mapping
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

  // Default sections for each class
  const defaultSections: Record<string, string[]> = {
    "Nursery": ["A", "B"],
    "LKG": ["A", "B"],
    "UKG": ["A", "B"],
    "1st": ["A", "B", "C"],
    "2nd": ["A", "B", "C"],
    "3rd": ["A", "B", "C"],
    "4th": ["A", "B", "C"],
    "5th": ["A", "B", "C"],
    "6th": ["A", "B", "C"],
    "7th": ["A", "B", "C"],
    "8th": ["A", "B", "C"],
    "9th": ["A", "B", "C"],
    "10th": ["A", "B", "C"],
    "11th": ["Science", "Commerce", "Arts"],
    "12th": ["Science", "Commerce", "Arts"]
  };

  // Standard fees for each class
  const standardFees: Record<string, number> = {
    "Nursery": 15000,
    "LKG": 18000,
    "UKG": 20000,
    "1st": 25000,
    "2nd": 25000,
    "3rd": 25000,
    "4th": 25000,
    "5th": 25000,
    "6th": 30000,
    "7th": 30000,
    "8th": 30000,
    "9th": 35000,
    "10th": 35000,
    "11th": 40000,
    "12th": 40000
  };

  useEffect(() => {
    if (currentClass) {
      const nextClassValue = classProgression[currentClass];
      setNextClass(nextClassValue);
      setNewTotalFee(standardFees[nextClassValue] || 0);
      setNextSection(defaultSections[nextClassValue]?.[0] || "");
    }
  }, [currentClass]);

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const getSelectedStudentsData = () => {
    return students.filter(s => selectedStudents.includes(s.id));
  };

  const calculateBulkSummary = () => {
    const selected = getSelectedStudentsData();
    let totalExcess = 0;
    let totalOutstanding = 0;
    let studentsWithExcess = 0;
    let studentsWithOutstanding = 0;

    selected.forEach(student => {
      const feeDue = student.total_fee - student.fee_paid;
      if (feeDue < 0) {
        totalExcess += Math.abs(feeDue);
        studentsWithExcess++;
      } else if (feeDue > 0) {
        totalOutstanding += feeDue;
        studentsWithOutstanding++;
      }
    });

    return {
      totalExcess,
      totalOutstanding,
      studentsWithExcess,
      studentsWithOutstanding,
      totalStudents: selected.length
    };
  };

  const handleBulkPromote = async () => {
    if (selectedStudents.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one student",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const selected = getSelectedStudentsData();
      
      // Create new student records for next class
      const newStudents = await Promise.all(
        selected.map(async (student, index) => {
          const currentFeeDue = student.total_fee - student.fee_paid;
          const carryForwardAmount = currentFeeDue < 0 ? Math.abs(currentFeeDue) : 0;
          const outstandingDue = currentFeeDue > 0 ? currentFeeDue : 0;
          // NOTE: inverted logic: carry forward (excess payment) will be ADDED to next year's fee
          // and outstanding due will be SUBTRACTED from next year's fee (per requested behavior)
          const adjustedNewFee = newTotalFee + carryForwardAmount - outstandingDue;

          // Generate unique student ID for next class
          const baseStudentId = student.student_id;
          let newStudentId = `${baseStudentId}-${nextClass}`;
          
          // Check if this new student ID already exists
          let counter = 1;
          let finalStudentId = newStudentId;
          while (true) {
            const { data: checkExisting } = await supabase
              .from("students")
              .select("id")
              .eq("student_id", finalStudentId)
              .single();
            
            if (!checkExisting) break;
            finalStudentId = `${newStudentId}-${counter}`;
            counter++;
          }

          const { data: newStudent, error: createError } = await supabase
            .from("students")
            .insert({
              student_id: finalStudentId,
              name: student.name,
              roll_number: `${nextClass}-${student.roll_number}`,
              class: nextClass,
              section: nextSection,
              total_fee: adjustedNewFee,
              fee_paid: carryForwardAmount,
              created_by: session.session?.user.id || "",
            })
            .select()
            .single();

          if (createError) throw createError;

          // Create fee payment records if needed
          if (carryForwardAmount > 0) {
            await supabase
              .from("fee_payments")
              .insert({
                student_id: newStudent.id,
                amount: carryForwardAmount,
                payment_method: "carry_forward",
                payment_date: new Date().toISOString().split("T")[0],
                remarks: `Carry forward from ${student.class} class`,
                created_by: session.session?.user.id || "",
              });
          }

          if (outstandingDue > 0) {
            await supabase
              .from("fee_payments")
              .insert({
                student_id: newStudent.id,
                amount: outstandingDue,
                payment_method: "outstanding_due",
                payment_date: new Date().toISOString().split("T")[0],
                remarks: `Outstanding due from ${student.class} class`,
                created_by: session.session?.user.id || "",
              });
          }

          // After successful promotion, delete the previous student record as requested
          try {
            await supabase.from("students").delete().eq("id", student.id);
          } catch (delErr) {
            // Non-fatal: show a toast but continue
            toast({
              variant: "destructive",
              title: "Warning",
              description: `Failed to delete previous student record for ${student.name}`,
            });
          }

          return newStudent;
        })
      );

      toast({
        title: "Success",
        description: `${selectedStudents.length} students promoted to ${nextClass} successfully`,
      });

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

  const summary = calculateBulkSummary();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Promote Students from {currentClass}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalStudents}</div>
                <p className="text-xs text-muted-foreground">Selected for promotion</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Students with Excess</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.studentsWithExcess}</div>
                <p className="text-xs text-muted-foreground">Will carry forward Rs. {summary.totalExcess.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Students with Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{summary.studentsWithOutstanding}</div>
                <p className="text-xs text-muted-foreground">Will add Rs. {summary.totalOutstanding.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Next Class Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Class Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Next Class</label>
                  <p className="text-lg font-semibold">{nextClass}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Section</label>
                  <p className="text-lg font-semibold">{nextSection}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">New Total Fee</label>
                  <p className="text-lg font-semibold">Rs. {newTotalFee.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Select Students to Promote
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {students.map((student) => {
                  const feeDue = student.total_fee - student.fee_paid;
                  const isSelected = selectedStudents.includes(student.id);
                  
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border ${
                        isSelected ? 'bg-primary/5 border-primary' : 'bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectStudent(student.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.student_id} • {student.roll_number}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              Rs. {student.fee_paid.toLocaleString()} / {student.total_fee.toLocaleString()}
                            </p>
                            {feeDue < 0 ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Excess: Rs. {Math.abs(feeDue).toLocaleString()}
                              </Badge>
                            ) : feeDue > 0 ? (
                              <Badge variant="destructive">
                                Due: Rs. {feeDue.toLocaleString()}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Paid in Full</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkPromote} 
              disabled={loading || selectedStudents.length === 0}
            >
              {loading ? "Promoting..." : `Promote ${selectedStudents.length} Students`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkPromotionDialog;
