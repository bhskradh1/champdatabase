import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Download } from "lucide-react";

interface ReceiptPrintProps {
  payment: {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    remarks: string | null;
    created_at: string;
    students: {
      id: string;
      student_id: string;
      name: string;
      roll_number: string;
      class: string;
      section: string | null;
      total_fee: number;
      fee_paid: number;
    };
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReceiptPrint = ({ payment, open, onOpenChange }: ReceiptPrintProps) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a printable version and trigger download
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Fee Payment Receipt - ${payment.students.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .receipt { max-width: 600px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .school-name { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .receipt-title { font-size: 16px; color: #666; }
            .details { margin-bottom: 30px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .detail-label { font-weight: bold; }
            .student-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .payment-info { margin-bottom: 30px; }
            .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
            .footer { border-top: 1px solid #ccc; padding-top: 20px; margin-top: 40px; }
            .signature-line { border-bottom: 1px dashed #000; width: 200px; margin: 20px 0 5px 0; }
            .print-only { display: block; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          ${document.getElementById('receipt-content')?.innerHTML || ''}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const feeDue = payment.students.total_fee - payment.students.fee_paid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="flex justify-end gap-2 print:hidden no-print">
          <Button onClick={handlePrint} size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="outline" size="sm">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div id="receipt-content" className="bg-white p-8 space-y-6">
          {/* Header */}
          <div className="text-center border-b-2 border-primary pb-6">
            <h1 className="text-4xl font-bold text-primary mb-2">Champion English School</h1>
            <p className="text-lg text-muted-foreground">Fee Payment Receipt</p>
            <p className="text-sm text-muted-foreground mt-2">
              Receipt No: {payment.id.slice(0, 8).toUpperCase()} | 
              Date: {formatDate(payment.payment_date)} | 
              Time: {formatTime(payment.created_at)}
            </p>
          </div>

          {/* Student Information */}
          <div className="bg-muted/50 p-6 rounded-lg">
            <h3 className="font-bold text-xl border-b pb-3 mb-4">Student Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Student Name</p>
                <p className="font-semibold text-lg">{payment.students.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-semibold text-lg">{payment.students.student_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Roll Number</p>
                <p className="font-semibold text-lg">{payment.students.roll_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class & Section</p>
                <p className="font-semibold text-lg">
                  {payment.students.class} {payment.students.section && `- ${payment.students.section}`}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="font-bold text-xl border-b pb-3">Payment Details</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-semibold capitalize">{payment.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Date:</span>
                  <span className="font-semibold">{formatDate(payment.payment_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction Time:</span>
                  <span className="font-semibold">{formatTime(payment.created_at)}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Fee:</span>
                  <span className="font-semibold">₹{payment.students.total_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previously Paid:</span>
                  <span className="font-semibold">₹{(payment.students.fee_paid - payment.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-lg font-bold">Amount Paid:</span>
                  <span className="text-2xl font-bold text-primary">₹{payment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining Due:</span>
                  <span className="font-semibold text-destructive">₹{feeDue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {payment.remarks && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Remarks:</p>
                <p className="font-medium">{payment.remarks}</p>
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="font-semibold text-green-800">Payment Successfully Recorded</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              This payment has been recorded in the school's fee management system.
            </p>
          </div>

          {/* Footer */}
          <div className="border-t pt-6 mt-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Received By</p>
                <div className="signature-line"></div>
                <p className="text-xs text-muted-foreground mt-1">Authorized Signature</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Parent/Guardian Signature</p>
                <div className="signature-line"></div>
                <p className="text-xs text-muted-foreground mt-1">Date: _______________</p>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground">
                This is a computer-generated receipt. Please preserve it for your records.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                For any queries, contact the school administration.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptPrint;
