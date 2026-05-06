"use client";

import { format, isSameMonth } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthNavProps {
  currentMonth: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function MonthNav({ currentMonth, onPrev, onNext, onToday }: MonthNavProps) {
  const isCurrentMonth = isSameMonth(currentMonth, new Date());

  return (
    <div className="flex flex-col items-center gap-1 w-full md:w-72 md:mx-auto">
      <div className="flex items-center gap-3 w-full">
        <Button variant="outline" size="icon-sm" onClick={onPrev}><ChevronLeft /></Button>
        <p className="text-xl font-bold text-foreground flex-1 text-center">
          {format(currentMonth, "MMMM yyyy")}
        </p>
        <Button variant="outline" size="icon-sm" onClick={onNext}><ChevronRight /></Button>
      </div>
      {!isCurrentMonth && (
        <Button variant="ghost" size="sm" onClick={onToday} className="text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Today
        </Button>
      )}
    </div>
  );
}
