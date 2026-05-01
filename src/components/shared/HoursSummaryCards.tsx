import { Banknote, Leaf } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface HoursSummaryCardsProps {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
}

export function HoursSummaryCards({ totalHours, billableHours, nonBillableHours }: HoursSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Hours</span>
          <span className="text-xl font-bold">{totalHours.toFixed(1)}h</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-950/80 px-2 py-0.5 text-xs font-medium text-blue-300">
            <Banknote className="h-3 w-3" /> Billable
          </span>
          <span className="text-xl font-bold">{billableHours.toFixed(1)}h</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-950/80 px-2 py-0.5 text-xs font-medium text-green-400">
            <Leaf className="h-3 w-3" /> Non-billable
          </span>
          <span className="text-xl font-bold">{nonBillableHours.toFixed(1)}h</span>
        </CardContent>
      </Card>
    </div>
  );
}
