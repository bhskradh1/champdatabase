import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StudentTable from "@/components/students/StudentTable";
import AddStudentDialog from "@/components/students/AddStudentDialog";
import ExcelUploadDialog from "@/components/students/ExcelUploadDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Upload, TrendingUp } from "lucide-react";

import FilterSection from "@/components/students/FilterSection";
import BulkPromotionDialog from "@/components/students/BulkPromotionDialog";

const Students = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [bulkPromotionOpen, setBulkPromotionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [feeStatusFilter, setFeeStatusFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: students=null, refetch } = useQuery<any[]>({
    queryKey: ["students"],
    queryFn: async (): Promise<any[]> => {
      // cast to any because generated supabase types may not include newly added columns
      const { data, error } = await (supabase.from("students") as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <DashboardHeader user={user} onSignOut={handleSignOut} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Student Management</h2>
            <p className="text-muted-foreground">Add, view, edit, and manage student information</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setBulkPromotionOpen(true)} variant="outline" size="lg">
              <TrendingUp className="mr-2 h-4 w-4" />
              Bulk Promote
            </Button>
            <Button onClick={() => setExcelDialogOpen(true)} variant="outline" size="lg">
              <Upload className="mr-2 h-4 w-4" />
              Upload Excel
            </Button>
            <Button onClick={() => setDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, student ID, class, or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <FilterSection
          feeStatusFilter={feeStatusFilter}
          setFeeStatusFilter={setFeeStatusFilter}
          attendanceFilter={attendanceFilter}
          setAttendanceFilter={setAttendanceFilter}
          classFilter={classFilter}
          setClassFilter={setClassFilter}
          classes={Array.from(new Set(students?.map((s) => s.class) || []))}
        />

        <StudentTable
          students={
             students
             ? students.filter((student) => {
                // Search filter
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                  student.name.toLowerCase().includes(query) ||
                  student.student_id.toLowerCase().includes(query) ||
                  student.class.toLowerCase().includes(query) ||
                  student.roll_number.toLowerCase().includes(query);

                // Fee status filter
                // Compute using the new separated fields when available
                const paidThisYear = student.fee_paid_current_year ?? student.fee_paid ?? 0;
                const prevBal = student.previous_year_balance ?? 0;
                const feeDue = (student.total_fee + prevBal) - paidThisYear;
                let matchesFeeStatus = true;
                if (feeStatusFilter === "paid") matchesFeeStatus = feeDue <= 0;
                else if (feeStatusFilter === "partial") matchesFeeStatus = paidThisYear > 0 && feeDue > 0;
                else if (feeStatusFilter === "pending") matchesFeeStatus = paidThisYear === 0 && feeDue > 0;

                // Attendance filter
                let matchesAttendance = true;
                if (attendanceFilter === "above80") matchesAttendance = student.attendance_percentage > 80;
                else if (attendanceFilter === "60to80")
                  matchesAttendance = student.attendance_percentage >= 60 && student.attendance_percentage <= 80;
                else if (attendanceFilter === "below60") matchesAttendance = student.attendance_percentage < 60;

                // Class filter
                const matchesClass = classFilter === "all" || student.class === classFilter;

                return matchesSearch && matchesFeeStatus && matchesAttendance && matchesClass;
              })
            : []
          }
          onRefetch={refetch}
        />
        <AddStudentDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={refetch} userId={user?.id || ""} />
        <ExcelUploadDialog open={excelDialogOpen} onOpenChange={setExcelDialogOpen} onSuccess={refetch} userId={user?.id || ""} />
        
        {classFilter !== "all" && (
          <BulkPromotionDialog
            open={bulkPromotionOpen}
            onOpenChange={setBulkPromotionOpen}
            students={students?.filter(s => s.class === classFilter) || []}
            currentClass={classFilter}
            onSuccess={refetch}
          />
        )}
      </main>
    </div>
  );
};

export default Students;
