import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [reportType, setReportType] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");

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

  // Prefer using the student_fee_overview view if available (it provides total_due, outstanding, extra_paid)
  const { data: students } = useQuery({
    queryKey: ["students-reports", selectedClass],
    queryFn: async () => {
  // supabase client types may not include the view name; cast to any to avoid TS overload errors
  let query = (supabase.from("student_fee_overview" as any) as any).select("*").order("class");
      if (selectedClass !== "all") {
        query = query.eq("class", selectedClass);
      }
      const { data, error } = await query;
      if (error) {
        // Fallback to legacy students table if view isn't present
        let q = supabase.from("students").select("*").order("class");
        if (selectedClass !== "all") q = q.eq("class", selectedClass);
        const { data: d, error: e } = await q;
        if (e) throw e;
        return d;
      }
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["fee-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_payments")
        .select("*, students(name, student_id, class)")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const exportToExcel = () => {
    if (!students) return;

    let data: any[] = [];
    let filename = "";

    if (reportType === "all" || reportType === "students") {
      data = students.map((s: any) => ({
        "Student ID": s.student_id,
        Name: s.name,
        "Roll Number": s.roll_number,
        Class: s.class,
        Section: s.section || "-",
        Contact: s.contact || "-",
        "Previous Year Balance": s.previous_year_balance ?? 0,
        "Current Year Fees": s.current_year_fees ?? s.total_fee,
        "Fee Paid (This Year)": s.fee_paid_current_year ?? s.fee_paid ?? 0,
        "Total Due": (s.total_due ?? ( (s.total_fee ?? s.current_year_fees) + (s.previous_year_balance ?? 0) - (s.fee_paid_current_year ?? s.fee_paid ?? 0) )),
        "Attendance %": s.attendance_percentage,
      }));
      filename = "Student_Report.xlsx";
    }

    if (reportType === "fees") {
      data = students.map((s: any) => {
        const paid = s.fee_paid_current_year ?? s.fee_paid ?? 0;
        const total = s.current_year_fees ?? s.total_fee;
        const due = (s.total_due ?? (total + (s.previous_year_balance ?? 0) - paid));
        return {
          "Student ID": s.student_id,
          Name: s.name,
          Class: s.class,
          "Total Fee": total,
          "Fee Paid": paid,
          "Fee Due": due,
          Status: paid >= total ? "Paid" : paid > 0 && due > 0 ? "Partial" : "Pending",
        };
      });
      filename = "Fee_Report.xlsx";
    }

    if (reportType === "payments" && payments) {
      data = payments.map((p: any) => ({
        Date: new Date(p.payment_date).toLocaleDateString(),
        "Student ID": p.students?.student_id || "-",
        "Student Name": p.students?.name || "-",
        Class: p.students?.class || "-",
        Amount: p.amount,
        Method: p.payment_method,
        Remarks: p.remarks || "-",
      }));
      filename = "Payment_History.xlsx";
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    // Auto-size columns
    const maxWidth = data.reduce((w: any, r: any) => {
      return Object.keys(r).map((k, i) => Math.max(w[i] || 10, String(r[k]).length));
    }, []);
    worksheet["!cols"] = maxWidth.map((w: number) => ({ wch: w + 2 }));

    XLSX.writeFile(workbook, filename);

    toast({
      title: "Success",
      description: "Report exported successfully",
    });
  };

  const classes = Array.from(new Set(students?.map((s) => s.class) || []));

  const totalStudents = students?.length || 0;
  const totalFees = students?.reduce((sum, s) => {
    const currentYearFees = Number(s.current_year_fees ?? s.total_fee ?? 0);
    const previousBalance = Number(s.previous_year_balance ?? 0);
    return sum + currentYearFees + previousBalance;
  }, 0) || 0;
  const totalCollected = students?.reduce((sum, s) => {
    return sum + Number(s.fee_paid_current_year ?? s.fee_paid ?? 0);
  }, 0) || 0;
  const totalPending = totalFees - totalCollected;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <DashboardHeader user={user} onSignOut={handleSignOut} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Reports & Export</h2>
          <p className="text-muted-foreground">Generate and download various reports</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Fees Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">Rs. {totalCollected.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">Rs. {totalPending.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Complete Student Report</SelectItem>
                    <SelectItem value="students">Student List</SelectItem>
                    <SelectItem value="fees">Fee Status Report</SelectItem>
                    <SelectItem value="payments">Payment History</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Filter by Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={String(cls)} value={cls}>
                        {String(cls)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={exportToExcel} className="flex-1">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg mt-4">
              <h4 className="font-semibold mb-2">Report Contents:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {reportType === "all" && (
                  <>
                    <li>• Student ID, Name, Roll Number, Class, Section</li>
                    <li>• Contact Information and Address</li>
                    <li>• Fee Details (Total, Paid, Due)</li>
                    <li>• Attendance Percentage</li>
                  </>
                )}
                {reportType === "students" && (
                  <>
                    <li>• Complete student information</li>
                    <li>• Contact details</li>
                    <li>• Academic performance data</li>
                  </>
                )}
                {reportType === "fees" && (
                  <>
                    <li>• Fee status for each student</li>
                    <li>• Total fees, paid amount, and dues</li>
                    <li>• Payment status classification</li>
                  </>
                )}
                {reportType === "payments" && (
                  <>
                    <li>• Complete payment transaction history</li>
                    <li>• Payment dates and methods</li>
                    <li>• Student-wise payment records</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Reports;
