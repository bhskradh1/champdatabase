import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle, XCircle, Search } from "lucide-react";

const Attendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});

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

  const { data: students, refetch } = useQuery({
    queryKey: ["students-attendance", selectedClass],
    queryFn: async () => {
      let query = supabase.from("students").select("*").order("roll_number");
      if (selectedClass !== "all") {
        query = query.eq("class", selectedClass);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: existingAttendance } = useQuery({
    queryKey: ["attendance-records", selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("date", selectedDate);
      if (error) throw error;
      
      const map: Record<string, string> = {};
      data.forEach((record) => {
        map[record.student_id] = record.status;
      });
      setAttendanceMap(map);
      return data;
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const markAttendance = async (studentId: string, status: string) => {
    if (!user) return;

    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("student_id", studentId)
      .eq("date", selectedDate)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from("attendance_records")
        .update({ status })
        .eq("id", existing.id);
      error = result.error;
    } else {
      const result = await supabase.from("attendance_records").insert({
        student_id: studentId,
        date: selectedDate,
        status,
        created_by: user.id,
      });
      error = result.error;
    }

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark attendance",
      });
    } else {
      setAttendanceMap({ ...attendanceMap, [studentId]: status });
      refetch();
    }
  };

  const markAllPresent = async () => {
    if (!students || !user) return;

    const records = students.map((student) => ({
      student_id: student.id,
      date: selectedDate,
      status: "present",
      created_by: user.id,
    }));

    const { error } = await supabase.from("attendance_records").upsert(records, {
      onConflict: "student_id,date",
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark all present",
      });
    } else {
      toast({
        title: "Success",
        description: "All students marked present",
      });
      const newMap: Record<string, string> = {};
      students.forEach((s) => (newMap[s.id] = "present"));
      setAttendanceMap(newMap);
      refetch();
    }
  };

  const filteredStudents = students?.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.roll_number.toLowerCase().includes(query) ||
      student.student_id.toLowerCase().includes(query)
    );
  });

  const classes = Array.from(new Set(students?.map((s) => s.class) || []));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <DashboardHeader user={user} onSignOut={handleSignOut} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Attendance Management</h2>
          <p className="text-muted-foreground">Mark student attendance for the day</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name or Roll..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={markAllPresent} className="w-full">
                  Mark All Present
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {filteredStudents?.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-semibold">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Roll: {student.roll_number} | Class: {student.class} {student.section && `- ${student.section}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={attendanceMap[student.id] === "present" ? "default" : "outline"}
                      size="sm"
                      onClick={() => markAttendance(student.id, "present")}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Present
                    </Button>
                    <Button
                      variant={attendanceMap[student.id] === "absent" ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => markAttendance(student.id, "absent")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Absent
                    </Button>
                  </div>
                </div>
              ))}
              {filteredStudents?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No students found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Attendance;
