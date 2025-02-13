import { Transaction } from "@shared/schema";
import { format } from "date-fns";

export async function exportToExcel(transactions: Transaction[], month: Date) {
  const XLSX = await import("xlsx");
  
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Date", "Type", "Amount", "Payer/Withdrawn By", "Notes"],
    ...transactions.map(t => [
      format(new Date(t.date), "MM/dd/yyyy"),
      t.type === "payment" ? "Payment" : "Withdrawal",
      (t.amount / 100).toFixed(2),
      t.type === "payment" ? t.payer : t.withdrawnBy,
      t.notes || ""
    ])
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook, 
    worksheet, 
    format(month, "MMMM yyyy")
  );

  XLSX.writeFile(workbook, `bluepay-${format(month, "yyyy-MM")}.xlsx`);
}
