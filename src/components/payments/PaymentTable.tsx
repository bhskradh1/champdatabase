import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Printer, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface PaymentTableProps {
  payments: any[];
  onViewReceipt: (payment: any) => void;
  onPrintReceipt: (payment: any) => void;
  onRefetch: () => void;
}

const PaymentTable = ({ payments, onViewReceipt, onPrintReceipt, onRefetch }: PaymentTableProps) => {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      cash: "default",
      online: "secondary",
      cheque: "outline",
      card: "destructive",
    };
    
    return (
      <Badge variant={variants[method] || "outline"} className="capitalize">
        {method}
      </Badge>
    );
  };

  const handleDeletePayment = async (paymentId: string) => {
    setDeletingId(paymentId);
    try {
      const { error } = await supabase
        .from("fee_payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
      onRefetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (payments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No payments found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{payment.students?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {payment.students?.student_id} • {payment.students?.class}
                    {payment.students?.section && `-${payment.students.section}`}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-semibold">Rs. {payment.amount.toLocaleString()}</div>
              </TableCell>
              <TableCell>
                {getPaymentMethodBadge(payment.payment_method)}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{formatDate(payment.payment_date)}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatTime(payment.created_at)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-[200px] truncate">
                  {payment.remarks || "-"}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewReceipt(payment)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPrintReceipt(payment)}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={deletingId === payment.id}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this payment? This action cannot be undone.
                          <br />
                          <br />
                          <strong>Student:</strong> {payment.students?.name}
                          <br />
                          <strong>Amount:</strong> Rs. {payment.amount.toLocaleString()}
                          <br />
                          <strong>Date:</strong> {formatDate(payment.payment_date)}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePayment(payment.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PaymentTable;
