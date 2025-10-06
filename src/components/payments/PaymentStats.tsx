import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, CreditCard } from "lucide-react";

interface PaymentStatsProps {
  payments: any[];
}

const PaymentStats = ({ payments }: PaymentStatsProps) => {
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const todayPayments = payments.filter(payment => {
    const today = new Date().toISOString().split('T')[0];
    return payment.payment_date === today;
  });
  const todayAmount = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const thisMonthPayments = payments.filter(payment => {
    const paymentDate = new Date(payment.payment_date);
    return paymentDate.getMonth() === thisMonth && paymentDate.getFullYear() === thisYear;
  });
  const thisMonthAmount = thisMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const paymentMethods = payments.reduce((acc, payment) => {
    const method = payment.payment_method || 'unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostUsedMethod = Object.entries(paymentMethods).reduce((a, b) => 
    paymentMethods[a[0]] > paymentMethods[b[0]] ? a : b, 
    ['cash', 0]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Rs. {totalAmount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {payments.length} transactions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Collection</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Rs. {todayAmount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {todayPayments.length} payments today
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Rs. {thisMonthAmount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {thisMonthPayments.length} payments this month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Popular Method</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold capitalize">{mostUsedMethod[0]}</div>
          <p className="text-xs text-muted-foreground">
            {mostUsedMethod[1]} transactions
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentStats;
