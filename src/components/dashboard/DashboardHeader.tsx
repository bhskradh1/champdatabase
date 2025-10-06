import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, LayoutDashboard, Users, Calendar, FileText, CreditCard } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { useNavigate, useLocation } from "react-router-dom";

interface DashboardHeaderProps {
  user: User | null;
  onSignOut: () => void;
}

const DashboardHeader = ({ user, onSignOut }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold">Champion English School</h1>
            </div>
            <nav className="hidden md:flex items-center gap-2">
              <Button
                variant={location.pathname === "/dashboard" ? "default" : "ghost"}
                onClick={() => navigate("/dashboard")}
                size="sm"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant={location.pathname === "/students" ? "default" : "ghost"}
                onClick={() => navigate("/students")}
                size="sm"
              >
                <Users className="mr-2 h-4 w-4" />
                Students
              </Button>
              <Button
                variant={location.pathname === "/attendance" ? "default" : "ghost"}
                onClick={() => navigate("/attendance")}
                size="sm"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Attendance
              </Button>
              <Button
                variant={location.pathname === "/payments" ? "default" : "ghost"}
                onClick={() => navigate("/payments")}
                size="sm"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Payments
              </Button>
              <Button
                variant={location.pathname === "/reports" ? "default" : "ghost"}
                onClick={() => navigate("/reports")}
                size="sm"
              >
                <FileText className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.user_metadata?.full_name || user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="icon" onClick={onSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
