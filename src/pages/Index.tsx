import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="text-center max-w-3xl space-y-8">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary/10 rounded-full">
            <GraduationCap className="h-20 w-20 text-primary" />
          </div>
        </div>
        <h1 className="text-5xl font-bold mb-4">Champion English School</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Modern school management system for efficient student, fee, and attendance tracking
        </p>
        <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
