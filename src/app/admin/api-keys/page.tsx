"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Copy, Check } from "lucide-react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiKey {
  id: string;
  label: string;
  hint: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  createdBy: { name: string };
}

function formatDate(iso: string | null) {
  if (!iso) return <span className="text-muted-foreground/50">Never</span>;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteKey, setDeleteKey] = useState<ApiKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/api-keys");
    if (res.ok) setKeys(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!label.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (res.ok) {
      const data = await res.json();
      setKeys((prev) => [data, ...prev]);
      setNewKey(data.rawKey);
      setLabel("");
      setCreateOpen(false);
    } else {
      const text = await res.text();
      let data: { error?: string } = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      toast.error(data.error || "Failed to create key");
    }
    setCreating(false);
  }

  async function handleDelete() {
    if (!deleteKey) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/api-keys/${deleteKey.id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== deleteKey.id));
      toast.success("API key revoked");
    } else {
      const text = await res.text();
      let data: { error?: string } = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      toast.error(data.error || "Failed to revoke key");
    }
    setDeleting(false);
    setDeleteKey(null);
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage API keys for third-party integrations
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
          Create API Key
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Key hint</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No API keys yet. Create one to allow third-party access.
                </TableCell>
              </TableRow>
            ) : keys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.label}</TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  wt_…{key.hint}
                </TableCell>
                <TableCell className="text-muted-foreground">{key.createdBy.name}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(key.createdAt)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(key.lastUsedAt)}</TableCell>
                <TableCell>
                  <Badge variant={key.isActive ? "outline" : "destructive"}>
                    {key.isActive ? "Active" : "Revoked"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Tooltip.Provider delay={300}>
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        onClick={() => setDeleteKey(key)}
                        className="cursor-pointer text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Positioner sideOffset={8}>
                          <Tooltip.Popup className="rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
                            Revoke key
                          </Tooltip.Popup>
                        </Tooltip.Positioner>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setLabel(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Give this key a label so you can identify it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="e.g. Power BI integration"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <div className="flex flex-col-reverse gap-2 *:w-full sm:flex-row sm:justify-end sm:*:w-auto">
              <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating || !label.trim()}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New key reveal dialog */}
      <Dialog open={!!newKey} onOpenChange={(v) => !v && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your key now — it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <code className="flex-1 break-all text-sm font-mono select-all">{newKey}</code>
              <button
                onClick={copyKey}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy key"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setNewKey(null)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteKey}
        onOpenChange={(v) => !v && setDeleteKey(null)}
        title="Revoke API Key"
        description={`Revoking "${deleteKey?.label}" will immediately invalidate it. Any integrations using this key will stop working.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
