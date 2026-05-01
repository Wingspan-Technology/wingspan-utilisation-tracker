"use client";

import { useRouter } from "next/navigation";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";

export type AuditEntry = {
  id: string;
  userId: string;
  createdAtFormatted: string;
  dateFormatted: string;
  dateMonth: string;
  hours: number;
  userName: string;
  clientName: string;
  projectName: string;
  taskName: string;
};

export function AuditLogRows({ entries }: { entries: AuditEntry[] }) {
  const router = useRouter();

  if (entries.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
            No time entries found.
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {entries.map((entry) => (
        <TableRow
          key={entry.id}
          className="cursor-pointer"
          onClick={() =>
            router.push(`/admin/time-entries?userId=${entry.userId}&month=${entry.dateMonth}`)
          }
        >
          <TableCell className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
            {entry.createdAtFormatted}
          </TableCell>
          <TableCell className="font-medium">{entry.userName}</TableCell>
          <TableCell className="text-muted-foreground">{entry.clientName}</TableCell>
          <TableCell className="text-muted-foreground">{entry.projectName}</TableCell>
          <TableCell className="text-muted-foreground">{entry.taskName}</TableCell>
          <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
            {entry.dateFormatted}
          </TableCell>
          <TableCell className="text-right tabular-nums">{entry.hours}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}
