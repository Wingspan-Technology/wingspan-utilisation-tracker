"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client, Project } from "@/types";

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  onSuccess: (project: Project) => void;
}

export function ProjectForm({ open, onOpenChange, project, onSuccess }: ProjectFormProps) {
  const isEdit = !!project;
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    clientId: project?.clientId ?? "",
    name: project?.name ?? "",
    isActive: project?.isActive ?? true,
  });

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
  }, []);

  function reset() {
    setForm({ clientId: project?.clientId ?? "", name: project?.name ?? "", isActive: project?.isActive ?? true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        isEdit ? `/api/projects/${project!.id}` : "/api/projects",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to save"); return; }
      toast.success(isEdit ? "Project updated" : "Project created");
      onSuccess(data);
      onOpenChange(false);
      reset();
    } finally {
      setLoading(false);
    }
  }

  const activeClients = clients.filter((c) => c.isActive);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Project" : "Add Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={form.clientId}
              onValueChange={(v) => setForm({ ...form, clientId: v ?? "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client…" />
              </SelectTrigger>
              <SelectContent>
                {activeClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Website Redesign"
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !form.clientId}>
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
