"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <p className="text-muted-foreground text-sm mt-1">Manage client organisations</p>
        </div>
        <Button onClick={() => { setEditClient(null); setFormOpen(true); }}>Add Client</Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : clients.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No clients yet.</TableCell></TableRow>
            ) : clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>
                  <Badge variant={client.isActive ? "outline" : "destructive"}>
                    {client.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditClient(client); setFormOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteClient(client)}>Delete</Button>
                  </div>
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
