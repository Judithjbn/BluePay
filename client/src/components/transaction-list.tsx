import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Transaction } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { exportToExcel } from "@/lib/excel";
import { cn } from "@/lib/utils";
import { useState } from "react";

function getLastSixMonths() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const date = subMonths(now, i);
    months.push(startOfMonth(date));
  }
  return months;
}

export function TransactionList() {
  const months = getLastSixMonths();
  const [selectedMonth, setSelectedMonth] = useState(months[0]);

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: [
      "/api/transactions",
      {
        startDate: format(startOfMonth(selectedMonth), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(selectedMonth), 'yyyy-MM-dd'),
      },
    ],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Historial de Transacciones</CardTitle>
            <CardDescription>
              Ver y exportar tu historial de transacciones
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select
              value={format(selectedMonth, "yyyy-MM-dd")}
              onValueChange={(value) => setSelectedMonth(new Date(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem
                    key={format(month, "yyyy-MM-dd")}
                    value={format(month, "yyyy-MM-dd")}
                  >
                    {format(month, "MMMM yyyy", { locale: es })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => exportToExcel(transactions || [], selectedMonth)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Pagador/Retirado Por</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.date), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="capitalize">
                  {transaction.type === "payment" ? "Pago" : "Retiro"}
                </TableCell>
                <TableCell
                  className={cn(
                    transaction.type === "payment"
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                >
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }).format(transaction.amount)}
                </TableCell>
                <TableCell>
                  {transaction.type === "payment"
                    ? transaction.payer
                    : transaction.withdrawnBy}
                </TableCell>
                <TableCell>{transaction.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}