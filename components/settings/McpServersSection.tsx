import { useState } from 'react';
import { toast } from 'sonner';
import {
  Add01Icon,
  Delete01Icon,
  Cancel01Icon,
  GlobeIcon,
  Refresh01Icon,
  Key01Icon,
  ChevronDownIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { discoverTools, closeSession } from '@/lib/api/mcp';
import type {
  McpServerConfig,
  McpHeader,
  McpTransport,
} from '@/lib/types';

interface McpServersSectionProps {
  servers: McpServerConfig[];
  onChange: (servers: McpServerConfig[]) => void;
}

const NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
const URL_REGEX = /^https?:\/\/.+/;

function blankServer(): McpServerConfig {
  return {
    id: crypto.randomUUID(),
    name: '',
    url: '',
    transport: 'streamable-http',
    headers: [],
    enabled: true,
  };
}

export function McpServersSection({ servers, onChange }: McpServersSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<McpServerConfig | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  function startAdd() {
    const s = blankServer();
    setDraft(s);
    setEditingId(s.id);
  }

  function startEdit(s: McpServerConfig) {
    setDraft({ ...s, headers: s.headers.map((h) => ({ ...h })) });
    setEditingId(s.id);
  }

  function cancelEdit() {
    setDraft(null);
    setEditingId(null);
  }

  function saveDraft() {
    if (!draft) return;
    const nameValid = NAME_REGEX.test(draft.name);
    const urlValid = URL_REGEX.test(draft.url);
    const nameUnique =
      servers.filter((s) => s.id !== draft.id).every((s) => s.name !== draft.name);
    if (!nameValid) {
      toast.error('Server name must start with a letter and contain only letters, numbers, _ or -');
      return;
    }
    if (!urlValid) {
      toast.error('Server URL must start with http:// or https://');
      return;
    }
    if (!nameUnique) {
      toast.error('Server name must be unique');
      return;
    }
    const exists = servers.some((s) => s.id === draft.id);
    const next = exists
      ? servers.map((s) => (s.id === draft.id ? draft : s))
      : [...servers, draft];
    onChange(next);
    void closeSession(draft.id);
    setDraft(null);
    setEditingId(null);
  }

  function removeServer(id: string) {
    onChange(servers.filter((s) => s.id !== id));
    void closeSession(id);
  }

  function toggleEnabled(id: string, value: boolean) {
    onChange(servers.map((s) => (s.id === id ? { ...s, enabled: value } : s)));
    void closeSession(id);
  }

  async function handleTest(s: McpServerConfig) {
    setTesting(s.id);
    try {
      const tools = await discoverTools(s);
      toast.success(`Connected — ${tools.length} tool(s) discovered`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      toast.error(`${s.name}: ${msg}`);
    } finally {
      setTesting(null);
    }
  }

  function addHeader() {
    if (!draft) return;
    setDraft({
      ...draft,
      headers: [
        ...draft.headers,
        { id: crypto.randomUUID(), name: '', value: '', isSecret: false },
      ],
    });
  }

  function updateHeader(id: string, patch: Partial<McpHeader>) {
    if (!draft) return;
    setDraft({
      ...draft,
      headers: draft.headers.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    });
  }

  function removeHeader(id: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      headers: draft.headers.filter((h) => h.id !== id),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">MCP Servers</Label>
        <Button variant="ghost" size="xs" onClick={startAdd}>
          <HugeiconsIcon icon={Add01Icon as IconSvgElement} className="size-3.5" />
          Add server
        </Button>
      </div>

      {servers.length === 0 && !draft && (
        <p className="text-xs text-muted-foreground">
          No MCP servers configured. Add a remote server to enable tool calling.
        </p>
      )}

      <div className="space-y-2">
        {servers.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2 rounded-md border px-3 py-2"
          >
            <HugeiconsIcon icon={GlobeIcon as IconSvgElement} className="size-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {s.url} · {s.transport}
              </p>
            </div>
            <Switch
              checked={s.enabled}
              onCheckedChange={(v) => toggleEnabled(s.id, v)}
              aria-label="Enable server"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleTest(s)}
              disabled={testing === s.id}
              aria-label="Test"
            >
              <HugeiconsIcon
                icon={Refresh01Icon as IconSvgElement}
                className={cn('size-3.5', testing === s.id && 'animate-spin')}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => startEdit(s)}
              aria-label="Edit"
            >
              <HugeiconsIcon icon={GlobeIcon as IconSvgElement} className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => removeServer(s.id)}
              aria-label="Delete"
            >
              <HugeiconsIcon icon={Delete01Icon as IconSvgElement} className="size-3.5" />
            </Button>
          </div>
        ))}

        {draft && (
          <div className="rounded-md border p-3">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mcp-name">Name</Label>
                <Input
                  id="mcp-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="github"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mcp-url">URL</Label>
                <Input
                  id="mcp-url"
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  placeholder="https://example.com/mcp"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Transport</Label>
                <Select
                  value={draft.transport}
                  onValueChange={(v) => setDraft({ ...draft, transport: v as McpTransport })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="streamable-http">streamable-http</SelectItem>
                    <SelectItem value="sse">sse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Headers</Label>
                  <Button variant="ghost" size="xs" onClick={addHeader}>
                    <HugeiconsIcon icon={Add01Icon as IconSvgElement} className="size-3.5" />
                    Add header
                  </Button>
                </div>
                {draft.headers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No custom headers. Add for authentication (e.g. Authorization).
                  </p>
                )}
                {draft.headers.map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Header name"
                      value={h.name}
                      onChange={(e) => updateHeader(h.id, { name: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Header value"
                      type={h.isSecret ? 'password' : 'text'}
                      value={h.value}
                      onChange={(e) => updateHeader(h.id, { value: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => updateHeader(h.id, { isSecret: !h.isSecret })}
                      aria-label="Toggle secret"
                      title={h.isSecret ? 'Secret' : 'Plain'}
                    >
                      <HugeiconsIcon icon={Key01Icon as IconSvgElement} className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeHeader(h.id)}
                      aria-label="Remove header"
                    >
                      <HugeiconsIcon icon={Cancel01Icon as IconSvgElement} className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label className="text-sm">Enabled</Label>
                <Switch
                  checked={draft.enabled}
                  onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveDraft}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}