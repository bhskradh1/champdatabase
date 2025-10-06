import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

interface FeeSlipPrintProps {
  payment: {
    id: string;
    student_name: string;
    student_id: string;
    roll_number: string;
    class: string;
    section: string | null;
    amount: number;
    payment_date: string;
    payment_method: string;
    remarks: string | null;
  };
  onClose: () => void;
}

const FeeSlipPrint = ({ payment, onClose }: FeeSlipPrintProps) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <div className="flex justify-end gap-2 print:hidden">
          <Button onClick={handlePrint} size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print Slip
          </Button>
          <Button onClick={onClose} variant="outline" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div id="fee-slip" className="bg-white p-8 space-y-6">
          {/* Header */}
          <div className="text-center border-b-2 border-primary pb-4">
            <h1 className="text-3xl font-bold text-primary">Champion English School</h1>
            <p className="text-sm text-muted-foreground mt-1">Fee Payment Receipt</p>
          </div>

          {/* Receipt Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Receipt No.</p>
              <p className="font-semibold">{payment.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-semibold">
                {new Date(payment.payment_date).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Student Details */}
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">Student Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Student Name</p>
                <p className="font-medium">{payment.student_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-medium">{payment.student_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Roll Number</p>
                <p className="font-medium">{payment.roll_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class</p>
                <p className="font-medium">
                  {payment.class} {payment.section && `- ${payment.section}`}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg border-b pb-2">Payment Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium capitalize">{payment.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Paid</p>
                <p className="text-2xl font-bold text-primary">₹{payment.amount.toLocaleString()}</p>
              </div>
            </div>
            {payment.remarks && (
              <div>
                <p className="text-sm text-muted-foreground">Remarks</p>
                <p className="font-medium">{payment.remarks}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t pt-4 mt-8 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Received By</p>
                <div className="border-t border-dashed border-foreground/20 w-40 mt-8"></div>
                <p className="text-xs text-muted-foreground mt-1">Authorized Signature</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Parent/Guardian Signature</p>
                <div className="border-t border-dashed border-foreground/20 w-40 mt-8 ml-auto"></div>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              This is a computer-generated receipt. Please preserve it for your records.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeeSlipPrint;
