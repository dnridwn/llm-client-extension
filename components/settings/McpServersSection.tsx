import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  Add01Icon,
  Delete01Icon,
  GlobeIcon,
  Refresh01Icon,
  Edit02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { discoverTools, closeSession } from '@/lib/api/mcp';
import { McpToolsSection } from '@/components/settings/McpToolsSection';
import { McpServerForm } from '@/components/settings/McpServerForm';
import type {
  McpServerConfig,
  McpHeader,
  McpToolsByServer,
} from '@/lib/types';

interface McpServersSectionProps {
  servers: McpServerConfig[];
  onChange: (servers: McpServerConfig[]) => void;
  discoveredTools: McpToolsByServer;
  onDiscoveredToolsChange: (
    updater: (prev: McpToolsByServer) => McpToolsByServer,
  ) => void;
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

export function McpServersSection({
  servers,
  onChange,
  discoveredTools,
  onDiscoveredToolsChange,
}: McpServersSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<McpServerConfig | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [toolsLoading, setToolsLoading] = useState<Record<string, boolean>>({});
  const reqCounterRef = useRef<Record<string, number>>({});

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
    onDiscoveredToolsChange((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setToolsLoading((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    delete reqCounterRef.current[id];
  }

  function toggleEnabled(id: string, value: boolean) {
    onChange(servers.map((s) => (s.id === id ? { ...s, enabled: value } : s)));
    void closeSession(id);
  }

  async function handleTest(s: McpServerConfig) {
    setTesting(s.id);
    const reqId = (reqCounterRef.current[s.id] ?? 0) + 1;
    reqCounterRef.current[s.id] = reqId;
    setToolsLoading((prev) => ({ ...prev, [s.id]: true }));
    try {
      const tools = await discoverTools(s);
      if (reqCounterRef.current[s.id] !== reqId) return;
      onDiscoveredToolsChange((prev) => ({ ...prev, [s.id]: tools }));
      toast.success(`Connected — ${tools.length} tool(s) discovered`);
    } catch (err) {
      if (reqCounterRef.current[s.id] !== reqId) return;
      const msg = err instanceof Error ? err.message : 'Connection failed';
      toast.error(`${s.name}: ${msg}`);
    } finally {
      if (reqCounterRef.current[s.id] === reqId) {
        setTesting(null);
        setToolsLoading((prev) => ({ ...prev, [s.id]: false }));
      }
    }
  }

  async function handleDiscoverTools(s: McpServerConfig) {
    const reqId = (reqCounterRef.current[s.id] ?? 0) + 1;
    reqCounterRef.current[s.id] = reqId;
    setToolsLoading((prev) => ({ ...prev, [s.id]: true }));
    try {
      const tools = await discoverTools(s);
      if (reqCounterRef.current[s.id] !== reqId) return;
      onDiscoveredToolsChange((prev) => ({ ...prev, [s.id]: tools }));
      toast.success(`Connected — ${tools.length} tool(s) discovered`);
    } catch (err) {
      if (reqCounterRef.current[s.id] !== reqId) return;
      const msg = err instanceof Error ? err.message : 'Connection failed';
      toast.error(`${s.name}: ${msg}`);
    } finally {
      if (reqCounterRef.current[s.id] === reqId) {
        setToolsLoading((prev) => ({ ...prev, [s.id]: false }));
      }
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
        {draft && !servers.some((s) => s.id === draft.id) && (
          <McpServerForm
            draft={draft}
            setDraft={setDraft}
            onCancel={cancelEdit}
            onSave={saveDraft}
            addHeader={addHeader}
            updateHeader={updateHeader}
            removeHeader={removeHeader}
          />
        )}

        {servers.map((s) => (
          <div key={s.id} className="rounded-md border px-3 py-2">
            {editingId === s.id && draft ? (
              <McpServerForm
                draft={draft}
                setDraft={setDraft}
                onCancel={cancelEdit}
                onSave={saveDraft}
                addHeader={addHeader}
                updateHeader={updateHeader}
                removeHeader={removeHeader}
              />
            ) : (
              <>
                <div className="flex items-center gap-2">
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
                    <HugeiconsIcon icon={Edit02Icon as IconSvgElement} className="size-3.5" />
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
                <McpToolsSection
                  server={s}
                  tools={discoveredTools[s.id]}
                  loading={toolsLoading[s.id] ?? false}
                  onDiscover={() => handleDiscoverTools(s)}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}