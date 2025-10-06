import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculatePromotionFees } from "@/lib/utils";
import { Calculator, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";

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

interface StudentPromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onSuccess: () => void;
}

const StudentPromotionDialog = ({ open, onOpenChange, student, onSuccess }: StudentPromotionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nextClass, setNextClass] = useState("");
  const [nextSection, setNextSection] = useState("");
  const [newTotalFee, setNewTotalFee] = useState(0);
  const [newRollNumber, setNewRollNumber] = useState("");
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  // Class progression mapping
  const classProgression: Record<string, string> = {
    "Nursery": "LKG",
    "LKG": "UKG", 
    "UKG": "1",
    "1": "2",
    "2": "3",
    "3": "4",
    "4": "5",
    "5": "6",
    "6": "7",
    "7": "8",
    "8": "9",
    "9": "10",
    "10": "11",
    "11": "12",
    "12": "Graduated"
  };

  // Default sections for each class
  const defaultSections: Record<string, string[]> = {
    "Nursery": ["X", "A", "B"],
    "LKG": ["X", "A", "B"],
    "UKG": ["X", "A", "B"],
    "one": ["X", "A", "B", "C"],
    "two": ["X", "A", "B", "C"],
    "three": ["X", "A", "B", "C"],
    "four": ["X", "A", "B", "C"],
    "five": ["X", "A", "B", "C"],
    "six": ["X", "A", "B", "C"],
    "seven": ["X", "A", "B", "C"],
    "eight": ["X", "A", "B", "C"],
    "nine": ["X", "A", "B", "C"],
    "ten": ["X", "A", "B", "C"],
    "eleven": ["Science", "Commerce", "H.Management"],
    "twelve": ["Science", "Commerce", "H.Management"]
  };

  // Standard fees for each class (you can modify these)
  const standardFees: Record<string, number> = {
    "Nursery": 15000,
    "LKG": 18000,
    "UKG": 20000,
    "one": 25000,
    "two": 25000,
    "three": 25000,
    "four": 25000,
    "five": 25000,
    "six": 30000,
    "seven": 30000,
    "eight": 30000,
    "nine": 35000,
    "ten": 35000,
    "eleven": 40000,
    "twelve": 40000
  };

  useEffect(() => {
    if (student) {
      const nextClassValue = classProgression[student.class];
      setNextClass(nextClassValue);
      setNewTotalFee(standardFees[nextClassValue] || 0);
      setAvailableSections(defaultSections[nextClassValue] || []);
      setNextSection(defaultSections[nextClassValue]?.[0] || "");
    }
  }, [student]);

  const currentFeeDue = student ? student.total_fee - student.fee_paid : 0;
  const carryForwardAmount = currentFeeDue < 0 ? Math.abs(currentFeeDue) : 0;
  const outstandingDue = currentFeeDue > 0 ? currentFeeDue : 0;
  // Use shared helper to compute total payable for next year after adjustments
  const adjustedNewFee = calculatePromotionFees(currentFeeDue, newTotalFee);

  const handlePromote = async () => {
    if (!student || !nextClass) return;

    setLoading(true);
    try {
      // Check if student already exists in next class
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("student_id", student.student_id)
        .eq("class", nextClass)
        .single();

      if (existingStudent) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Student already exists in the next class",
        });
        return;
      }

      // Generate unique student ID for next class
      const { data: session } = await supabase.auth.getSession();
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

      // Create new student record for next class
      const { data: newStudent, error: createError } = await supabase
        .from("students")
        .insert({
          student_id: finalStudentId,
          name: student.name,
          roll_number: newRollNumber || `${nextClass}-${Date.now()}`,
          class: nextClass,
          section: nextSection,
          total_fee: adjustedNewFee,
            // Do NOT set fee_paid to previous-year carry-forward here.
            // Keep fee_paid representing payments made in the current year only.
            fee_paid: 0,
          created_by: session.session?.user.id || "",
        })
        .select()
        .single();

      if (createError) throw createError;

      // If there was excess payment, create a fee payment record
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

      // If there was outstanding due, create a fee payment record for the due amount
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

      // Attempt to soft-delete the previous student record by setting `deleted_at`.
      // If the column doesn't exist or update fails, fall back to hard delete.
      try {
        const deletedAt = new Date().toISOString();
        const { error: updateErr } = await supabase
          .from("students")
          // use generic to allow unknown columns like deleted_at
          .update<any>({ deleted_at: deletedAt })
          .eq("id", student.id);

        if (updateErr) {
          // Fall back to hard delete
          const { error: delErr } = await supabase
            .from("students")
            .delete()
            .eq("id", student.id);

          if (delErr) {
            // Rollback: remove the newly created student since we couldn't remove the old one
            await supabase.from("students").delete().eq("id", newStudent.id);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to remove previous student record after promotion. Promotion was rolled back.",
            });
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // Non-fatal: show a warning but continue
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Failed to remove previous student record after promotion.",
        });
      }

      toast({
        title: "Success",
        description: `Student promoted to ${nextClass} successfully`,
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

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Promote Student to Next Class
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Student Name</Label>
                  <p className="font-medium">{student.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Student ID</Label>
                  <p className="font-medium">{student.student_id}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Current Class</Label>
                  <p className="font-medium">{student.class} {student.section && `- ${student.section}`}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Roll Number</Label>
                  <p className="font-medium">{student.roll_number}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Calculation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Fee Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Current Total Fee</Label>
                  <p className="font-medium">Rs. {student.total_fee.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Current Fee Paid</Label>
                  <p className="font-medium">Rs. {student.fee_paid.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Current Fee Due</Label>
                  <p className={`font-medium ${currentFeeDue > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    Rs. {currentFeeDue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Next Class Fee</Label>
                  <p className="font-medium">Rs. {newTotalFee.toLocaleString()}</p>
                </div>
              </div>

              {/* Fee Adjustment Alerts */}
              {carryForwardAmount > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Excess Payment:</strong> Rs. {carryForwardAmount.toLocaleString()} will be carried forward and deducted from next class fee
                  </AlertDescription>
                </Alert>
              )}

              {outstandingDue > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Outstanding Due:</strong> Rs. {outstandingDue.toLocaleString()} will be added to next class fees
                  </AlertDescription>
                </Alert>
              )}

              <div className="border-t pt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Previous Year (Total / Paid / Due/Excess)</Label>
                    <p className="font-medium">Total: Rs. {student.total_fee.toLocaleString()}</p>
                    <p className="font-medium">Paid: Rs. {student.fee_paid.toLocaleString()}</p>
                    <p className="font-medium">{currentFeeDue > 0 ? `Outstanding: Rs. ${currentFeeDue.toLocaleString()}` : `Excess: Rs. ${Math.abs(currentFeeDue).toLocaleString()}`}</p>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Next Year (Base / Adjusted / Remarks)</Label>
                    <p className="font-medium">Base Fee: Rs. {newTotalFee.toLocaleString()}</p>
                    <p className="font-medium">Adjusted Fee: Rs. {adjustedNewFee.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{carryForwardAmount > 0 ? `Deducted Rs. ${carryForwardAmount.toLocaleString()} from next year due to excess payment` : outstandingDue > 0 ? `Added Rs. ${outstandingDue.toLocaleString()} to next year due to outstanding from previous year` : 'No adjustments'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Label className="text-lg font-semibold">Total Payable for Next Year</Label>
                  <p className="text-xl font-bold text-primary">Rs. {adjustedNewFee.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Class Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Class Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nextClass">Next Class</Label>
                  <Select value={nextClass} onValueChange={setNextClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select next class" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(classProgression).map(([current, next]) => (
                        <SelectItem key={next} value={next}>
                          {next}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextSection">Section</Label>
                  <Select value={nextSection} onValueChange={setNextSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map((section) => (
                        <SelectItem key={section} value={section}>
                          {section}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newRollNumber">New Roll Number</Label>
                  <Input
                    id="newRollNumber"
                    value={newRollNumber}
                    onChange={(e) => setNewRollNumber(e.target.value)}
                    placeholder="Enter new roll number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newTotalFee">New Total Fee</Label>
                  <Input
                    id="newTotalFee"
                    type="number"
                    value={newTotalFee}
                    onChange={(e) => setNewTotalFee(Number(e.target.value))}
                    placeholder="Enter new total fee"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePromote} disabled={loading || !nextClass}>
              {loading ? "Promoting..." : "Promote Student"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentPromotionDialog;
