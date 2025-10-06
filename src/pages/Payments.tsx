import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Printer, 
  Eye,
  DollarSign,
  Calendar,
  User,
  CreditCard
} from "lucide-react";
import PaymentDialog from "@/components/payments/PaymentDialog";
import PaymentTable from "@/components/payments/PaymentTable";
import PaymentStats from "@/components/payments/PaymentStats";
import ReceiptPrint from "@/components/payments/ReceiptPrint";

const Payments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");

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

  const { data: payments, refetch } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_payments")
        .select(`
          *,
          students (
            id,
            student_id,
            name,
            roll_number,
            class,
            section,
            total_fee,
            fee_paid
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, student_id, name, class, section")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleViewReceipt = (payment: any) => {
    setSelectedPayment(payment);
    setReceiptOpen(true);
  };

  const handlePrintReceipt = (payment: any) => {
    setSelectedPayment(payment);
    setReceiptOpen(true);
    // Auto-trigger print after a short delay
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const filteredPayments = (payments || []).filter((payment) => {
    // Search filter
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      payment.students?.name.toLowerCase().includes(query) ||
      payment.students?.student_id.toLowerCase().includes(query) ||
      payment.students?.roll_number.toLowerCase().includes(query) ||
      payment.students?.class.toLowerCase().includes(query);

    // Payment method filter
    const matchesPaymentMethod = 
      paymentMethodFilter === "all" || 
      payment.payment_method === paymentMethodFilter;

    // Date range filter
    let matchesDateRange = true;
    if (dateRangeFilter !== "all") {
      const paymentDate = new Date(payment.payment_date);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dateRangeFilter === "today") matchesDateRange = daysDiff === 0;
      else if (dateRangeFilter === "week") matchesDateRange = daysDiff <= 7;
      else if (dateRangeFilter === "month") matchesDateRange = daysDiff <= 30;
    }

    // Student filter
    const matchesStudent = 
      studentFilter === "all" || 
      payment.students?.id === studentFilter;

    return matchesSearch && matchesPaymentMethod && matchesDateRange && matchesStudent;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <DashboardHeader user={user} onSignOut={handleSignOut} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold mb-2">Payment Management</h2>
            <p className="text-muted-foreground">Record, view, and manage fee payments</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </div>

        {/* Payment Statistics */}
        <PaymentStats payments={payments || []} />

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="online">Online Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="card">Card</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={studentFilter} onValueChange={setStudentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students?.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name} ({student.student_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payment Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Records ({filteredPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentTable 
              payments={filteredPayments}
              onViewReceipt={handleViewReceipt}
              onPrintReceipt={handlePrintReceipt}
              onRefetch={refetch}
            />
          </CardContent>
        </Card>

        {/* Dialogs */}
        <PaymentDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen} 
          onSuccess={refetch} 
          userId={user?.id || ""} 
        />
        
        {selectedPayment && (
          <ReceiptPrint 
            payment={selectedPayment}
            open={receiptOpen}
            onOpenChange={setReceiptOpen}
          />
        )}
      </main>
    </div>
  );
};

export default Payments;
