import type { Dispatch, SetStateAction } from 'react';
import {
  Add01Icon,
  Cancel01Icon,
  Key01Icon,
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
import type { McpServerConfig, McpHeader, McpTransport } from '@/lib/types';

interface McpServerFormProps {
  draft: McpServerConfig;
  setDraft: Dispatch<SetStateAction<McpServerConfig | null>>;
  onCancel: () => void;
  onSave: () => void;
  addHeader: () => void;
  updateHeader: (id: string, patch: Partial<McpHeader>) => void;
  removeHeader: (id: string) => void;
}

export function McpServerForm({
  draft,
  setDraft,
  onCancel,
  onSave,
  addHeader,
  updateHeader,
  removeHeader,
}: McpServerFormProps) {
  return (
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
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}