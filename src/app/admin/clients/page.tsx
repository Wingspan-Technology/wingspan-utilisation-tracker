"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientForm } from "@/components/admin/ClientForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Client } from "@/types";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const res = await fetch("/api/clients");
    if (res.ok) setClients(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function handleSuccess(updated: Client) {
    setClients((prev) => {
      const idx = prev.findIndex((c) => c.id === updated.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = updated; return next; }
      return [...prev, updated].sort((a, b) => a.name.localeCompare(b.name));
    });
    setEditClient(null);
  }

  async function handleDelete() {
    if (!deleteClient) return;
    setDeleting(true);
    const res = await fetch(`/api/clients/${deleteClient.id}`, { method: "DELETE" });
    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== deleteClient.id));
      toast.success("Client deleted");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to delete client");
    }
    setDeleting(false);
    setDeleteClient(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        </div>
        <Button onClick={() => { setEditClient(null); setFormOpen(true); }}>Add Client</Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : clients.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">No clients yet.</TableCell></TableRow>
            ) : clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/clients/${client.slug}`} className="font-medium hover:underline">
                      {client.name}
                    </Link>
                    {!client.isActive && <EyeOff className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
                  </div>
                </TableCell>
                <TableCell>
                  <Tooltip.Provider delay={300}>
                    <div className="flex gap-2 justify-end">
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          onClick={() => router.push(`/admin/clients/${client.slug}`)}
                          className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Eye className="h-6 w-6 sm:h-5 sm:w-5" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner sideOffset={8}>
                            <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                              View client
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          onClick={() => { setEditClient(client); setFormOpen(true); }}
                          className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-6 w-6 sm:h-5 sm:w-5" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner sideOffset={8}>
                            <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                              Edit client
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          onClick={() => !client._count?.projects && setDeleteClient(client)}
                          className={client._count?.projects ? "cursor-not-allowed opacity-30" : "cursor-pointer text-muted-foreground hover:text-red-400 transition-colors"}
                        >
                          <Trash2 className="h-6 w-6 sm:h-5 sm:w-5" />
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner sideOffset={8}>
                            <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                              {client._count?.projects ? "Can't delete clients with projects" : "Delete client"}
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </div>
                  </Tooltip.Provider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ClientForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditClient(null); }}
        client={editClient}
        onSuccess={handleSuccess}
      />
      <ConfirmDialog
        open={!!deleteClient}
        onOpenChange={(v) => !v && setDeleteClient(null)}
        title="Delete Client"
        description={`Delete ${deleteClient?.name}? This will fail if it has projects — deactivate instead.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
