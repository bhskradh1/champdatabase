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
    fee_paid_current_year?: number;
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
            body { font-family: Arial, sans-serif; margin: 0; padding: 15px; }
            .receipt { max-width: 600px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
            .school-name { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
            .receipt-title { font-size: 14px; color: #666; }
            .details { margin-bottom: 20px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .detail-label { font-weight: bold; }
            .student-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .payment-info { margin-bottom: 20px; }
            .amount { font-size: 20px; font-weight: bold; color: #2563eb; }
            .footer { border-top: 1px solid #ccc; padding-top: 15px; margin-top: 20px; }
            .signature-line { border-bottom: 1px dashed #000; width: 200px; margin: 15px 0 5px 0; }
            .print-only { display: block; }
            @media print { 
              .no-print { display: none; }
              body { padding: 10px; }
              .receipt { max-width: 100%; }
            }
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

  // Prefer fee_paid_current_year for display; include previous_year_balance if present
  const paidThisYear = payment.students.fee_paid_current_year ?? payment.students.fee_paid ?? 0;
  const prevBal = (payment.students as any).previous_year_balance ?? 0;
  const feeDue = (payment.students.total_fee + prevBal) - paidThisYear;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="flex justify-end gap-2 print:hidden no-print mb-4">
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

        <div id="receipt-content" className="bg-white p-6 space-y-4 print:p-4 print:space-y-3">
          {/* Header */}
          <div className="text-center border-b-2 border-primary pb-4 print:pb-3">
            <h1 className="text-3xl font-bold text-primary mb-1 print:text-2xl">Champion English School</h1>
            <p className="text-lg text-muted-foreground print:text-base">Fee Payment Receipt</p>
            <p className="text-sm text-muted-foreground mt-1 print:text-xs">
              Receipt No: {payment.id.slice(0, 8).toUpperCase()} | 
              Date: {formatDate(payment.payment_date)} | 
              Time: {formatTime(payment.created_at)}
            </p>
          </div>

          {/* Student Information */}
          <div className="bg-muted/50 p-4 rounded-lg print:p-3">
            <h3 className="font-bold text-lg border-b pb-2 mb-3 print:text-base">Student Information</h3>
            <div className="grid grid-cols-2 gap-3 print:gap-2">
              <div>
                <p className="text-sm text-muted-foreground print:text-xs">Student Name</p>
                <p className="font-semibold text-base print:text-sm">{payment.students.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground print:text-xs">Student ID</p>
                <p className="font-semibold text-base print:text-sm">{payment.students.student_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground print:text-xs">Roll Number</p>
                <p className="font-semibold text-base print:text-sm">{payment.students.roll_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground print:text-xs">Class & Section</p>
                <p className="font-semibold text-base print:text-sm">
                  {payment.students.class} {payment.students.section && `- ${payment.students.section}`}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-3 print:space-y-2">
            <h3 className="font-bold text-lg border-b pb-2 print:text-base">Payment Details</h3>
            
            <div className="grid grid-cols-2 gap-4 print:gap-3">
              <div className="space-y-2 print:space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-xs">Payment Method:</span>
                  <span className="font-semibold capitalize print:text-sm">{payment.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-xs">Payment Date:</span>
                  <span className="font-semibold print:text-sm">{formatDate(payment.payment_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-xs">Transaction Time:</span>
                  <span className="font-semibold print:text-sm">{formatTime(payment.created_at)}</span>
                </div>
              </div>
              
              <div className="space-y-2 print:space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-xs">Total Fee:</span>
                  <span className="font-semibold print:text-sm">Rs. {payment.students.total_fee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-xs">Previously Paid (This Year):</span>
                  <span className="font-semibold print:text-sm">Rs. {(paidThisYear - payment.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2 print:pt-1">
                  <span className="text-base font-bold print:text-sm">Amount Paid:</span>
                  <span className="text-xl font-bold text-primary print:text-lg">Rs. {payment.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground print:text-xs">Remaining Due:</span>
                  <span className="font-semibold text-destructive print:text-sm">Rs. {feeDue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {payment.remarks && (
              <div className="bg-blue-50 p-3 rounded-lg print:p-2">
                <p className="text-sm text-muted-foreground print:text-xs">Remarks:</p>
                <p className="font-medium print:text-sm">{payment.remarks}</p>
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className="bg-green-50 p-3 rounded-lg print:p-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full print:w-2 print:h-2"></div>
              <span className="font-semibold text-green-800 print:text-sm">Payment Successfully Recorded</span>
            </div>
            <p className="text-sm text-green-700 mt-1 print:text-xs">
              This payment has been recorded in the school's fee management system.
            </p>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 mt-4 print:pt-3 print:mt-3">
            <div className="grid grid-cols-2 gap-6 print:gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2 print:text-xs">Received By</p>
                <div className="signature-line"></div>
                <p className="text-xs text-muted-foreground mt-1 print:text-[10px]">Authorized Signature</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2 print:text-xs">Parent/Guardian Signature</p>
                <div className="signature-line"></div>
                <p className="text-xs text-muted-foreground mt-1 print:text-[10px]">Date: _______________</p>
              </div>
            </div>
            
            <div className="mt-4 text-center print:mt-3">
              <p className="text-xs text-muted-foreground print:text-[10px]">
                This is a computer-generated receipt. Please preserve it for your records.
              </p>
              <p className="text-xs text-muted-foreground mt-1 print:text-[10px]">
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
