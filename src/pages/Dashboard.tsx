import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import { Users, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

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

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Try to use the overview view if available
  // Use any-cast because the generated supabase client types may not include the new view
  const { data: studentsOverview, error: viewErr } = await (supabase.from("student_fee_overview" as any) as any).select("*");
      let students = studentsOverview;
      if (viewErr || !studentsOverview) {
        const { data: s } = await supabase.from("students").select("*");
        students = s || [];
      }

      const totalStudents = students?.length || 0;
      const totalFees = students?.reduce((sum: number, s: any) => sum + Number(s.current_year_fees ?? s.total_fee), 0) || 0;
      const totalCollected = students?.reduce((sum: number, s: any) => sum + Number(s.fee_paid_current_year ?? s.fee_paid ?? 0), 0) || 0;
      const pendingFees = students?.reduce((sum: number, s: any) => sum + Math.max(0, Number(s.total_due ?? ((s.current_year_fees ?? s.total_fee) + (s.previous_year_balance ?? 0) - (s.fee_paid_current_year ?? s.fee_paid ?? 0)))), 0) || 0;
      const avgAttendance = students?.length
        ? students.reduce((sum: number, s: any) => sum + Number(s.attendance_percentage || 0), 0) / students.length
        : 0;

      // Fee status distribution
      const paidCount = students?.filter((s: any) => (Number(s.fee_paid_current_year ?? s.fee_paid ?? 0) >= Number(s.current_year_fees ?? s.total_fee))).length || 0;
      const partialCount = students?.filter((s: any) => {
        const paid = Number(s.fee_paid_current_year ?? s.fee_paid ?? 0);
        const total = Number(s.current_year_fees ?? s.total_fee);
        const due = Number(s.total_due ?? (total + (s.previous_year_balance ?? 0) - paid));
        return paid > 0 && due > 0;
      }).length || 0;
      const pendingCount = students?.filter((s: any) => Number(s.fee_paid_current_year ?? s.fee_paid ?? 0) === 0).length || 0;

      // Class-wise distribution
      const classData = students?.reduce((acc: any, s: any) => {
        const className = s.class;
        if (!acc[className]) {
          acc[className] = { class: className, students: 0, fees: 0, collected: 0 };
        }
        acc[className].students += 1;
        acc[className].fees += Number(s.current_year_fees ?? s.total_fee);
        acc[className].collected += Number(s.fee_paid_current_year ?? s.fee_paid ?? 0);
        return acc;
      }, {});

      return {
        totalStudents,
        totalFees,
        totalCollected,
        pendingFees,
        avgAttendance: Math.round(avgAttendance * 100) / 100,
        feeStatusData: [
          { name: "Paid", value: paidCount, color: "#10b981" },
          { name: "Partial", value: partialCount, color: "#f59e0b" },
          { name: "Pending", value: pendingCount, color: "#ef4444" },
        ],
        classData: Object.values(classData || {}),
      };
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
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard Overview</h2>
          <p className="text-muted-foreground">Welcome to Champion English School Management System</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Students"
            value={stats?.totalStudents || 0}
            icon={Users}
            trend="+12% from last month"
          />
          <StatsCard
            title="Total Fees"
            value={`Rs. ${stats?.totalFees.toLocaleString() || 0}`}
            icon={DollarSign}
            trend="Total amount"
          />
          <StatsCard
            title="Fees Collected"
            value={`Rs. ${stats?.totalCollected.toLocaleString() || 0}`}
            icon={TrendingUp}
            trend={`${stats ? Math.round((stats.totalCollected / stats.totalFees) * 100) : 0}% collected`}
          />
          <StatsCard
            title="Avg. Attendance"
            value={`${stats?.avgAttendance || 0}%`}
            icon={Calendar}
            trend="Overall attendance"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Fee Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats?.feeStatusData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats?.feeStatusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Class-wise Fee Collection</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.classData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="class" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="fees" fill="hsl(var(--primary))" name="Total Fees" />
                  <Bar dataKey="collected" fill="hsl(var(--accent))" name="Collected" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
