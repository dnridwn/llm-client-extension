import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft01Icon,
  EyeOffIcon,
  ViewIcon,
  Settings01Icon,
  Loading03Icon,
  CloudCheckIcon,
  AlertCircleIcon,
  UnfoldMoreIcon,
  Tick02Icon,
  Refresh01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { McpServersSection } from '@/components/settings/McpServersSection';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { fetchModels } from '@/lib/api';
import { ensureConnected } from '@/lib/api/mcp';
import { settingsItem } from '@/lib/storage';
import type { McpToolsByServer, ReasoningEffort, Settings } from '@/lib/types';

interface SettingsScreenProps {
  settings: Settings;
  onSave: (next: Settings) => void;
  onDiscoveredToolsChange: (
    updater: (prev: McpToolsByServer) => McpToolsByServer,
  ) => void;
  onBack?: () => void;
}

const URL_REGEX = /^https?:\/\/.+/;

export function SettingsScreen({
  settings,
  onSave,
  onDiscoveredToolsChange,
  onBack,
}: SettingsScreenProps) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [availableModels, setAvailableModels] = useState<string[]>(
    settings.availableModels,
  );
  const [manualModel, setManualModel] = useState('');
  const [open, setOpen] = useState(false);
  const [isManual, setIsManual] = useState(
    settings.availableModels.length === 0 && !!settings.model,
  );
  const [showKey, setShowKey] = useState(false);
  const [temperature, setTemperature] = useState<number>(
    settings.temperature ?? 0.7,
  );
  const [showThinking, setShowThinking] = useState(settings.showThinking);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>(
    settings.reasoningEffort,
  );
  const [systemInstruction, setSystemInstruction] = useState(
    settings.systemInstruction ?? '',
  );
  const [mcpServers, setMcpServers] = useState(settings.mcpServers ?? []);
  const [isTesting, setIsTesting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setBaseUrl(settings.baseUrl);
    setApiKey(settings.apiKey);
    setModel(settings.model);
    setAvailableModels(settings.availableModels);
    setIsManual(settings.availableModels.length === 0 && !!settings.model);
    setManualModel(
      settings.availableModels.length === 0 ? settings.model : '',
    );
    setTemperature(settings.temperature ?? 0.7);
    setShowThinking(settings.showThinking);
    setReasoningEffort(settings.reasoningEffort);
    setSystemInstruction(settings.systemInstruction ?? '');
    setMcpServers(settings.mcpServers ?? []);
  }, [settings]);

  const urlValid = URL_REGEX.test(baseUrl);
  const effectiveModel = isManual ? manualModel : model;
  const canSave = urlValid && effectiveModel.length > 0;
  const sortedModels = [...availableModels].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );

  async function handleTest() {
    if (!urlValid) {
      toast.error('Base URL must start with http:// or https://');
      return;
    }
    setIsTesting(true);
    try {
      const models = await fetchModels(baseUrl, apiKey);
      setAvailableModels(models);
      if (models.length > 0 && !isManual && !models.includes(model)) {
        setModel(models[0]);
      }
      toast.success(`Connection OK — ${models.length} model(s) available`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Connection failed: ${msg}`);
    } finally {
      setIsTesting(false);
    }
  }

  async function handleFetchModels() {
    if (!urlValid) {
      toast.error('Base URL must start with http:// or https://');
      return;
    }
    setIsFetching(true);
    try {
      const models = await fetchModels(baseUrl, apiKey);
      setAvailableModels(models);
      if (models.length > 0 && !isManual && !models.includes(model)) {
        setModel(models[0]);
      }
      toast.success(`${models.length} model(s) fetched`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Fetch failed: ${msg}`);
    } finally {
      setIsFetching(false);
    }
  }

  async function handleSave() {
    if (!canSave) {
      toast.error('Please fix the form before saving');
      return;
    }
    setIsSaving(true);
    let models = availableModels;
    let selectedModel = effectiveModel;
    try {
      models = await fetchModels(baseUrl, apiKey);
      if (models.length > 0 && !isManual) {
        selectedModel = models.includes(effectiveModel)
          ? effectiveModel
          : models[0];
      }
    } catch {
      // keep manual entry if fetch fails
    }

    let discoveredTools: McpToolsByServer = settings.discoveredTools ?? {};
    try {
      const { tools, errors } = await ensureConnected(mcpServers);
      const newByServer: McpToolsByServer = {};
      for (const t of tools) {
        (newByServer[t.serverId] ??= []).push(t);
      }
      const current = await settingsItem.getValue();
      discoveredTools = {
        ...(current.discoveredTools ?? {}),
        ...newByServer,
      };
      if (errors.length > 0) {
        toast.warning(
          `${errors.length} MCP server(s) failed: ${errors.map((e) => e.name).join(', ')}`,
        );
      }
    } catch {
      // best-effort, jangan block save
    }

    const next: Settings = {
      baseUrl,
      apiKey,
      model: selectedModel,
      availableModels: models,
      showThinking,
      reasoningEffort,
      temperature,
      systemInstruction,
      mcpServers,
      discoveredTools,
    };
    onSave(next);
    toast.success('Settings saved');
    setIsSaving(false);
  }

  return (
    <div
      className={
        onBack
          ? 'flex h-screen flex-col overflow-auto bg-background'
          : 'flex h-screen overflow-auto bg-background p-4'
      }
    >
      {onBack && (
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label="Back to chat"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon as IconSvgElement} className="size-4" />
          </Button>
          <span className="text-sm font-semibold">Settings</span>
        </header>
      )}
      <div className={onBack ? 'w-full max-w-md my-auto mx-auto p-4 space-y-5' : 'w-full max-w-md my-auto mx-auto p-4 space-y-5'}>
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <HugeiconsIcon
            icon={Settings01Icon as IconSvgElement}
            className="size-5"
          />
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure your OpenAI-compatible endpoint to start chatting.
        </p>
      </div>
          <div className="space-y-2">
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com"
              aria-invalid={!urlValid && baseUrl.length > 0}
            />
            {!urlValid && baseUrl.length > 0 && (
              <p className="text-xs text-destructive">
                URL must start with http:// or https://
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-... (optional for local endpoints)"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                <HugeiconsIcon
                  icon={(showKey ? EyeOffIcon : ViewIcon) as IconSvgElement}
                  className="size-4"
                />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Model</Label>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setIsManual((m) => !m)}
              >
                {isManual ? 'Use list' : 'Manual entry'}
              </Button>
            </div>
            {isManual ? (
              <Input
                value={manualModel}
                onChange={(e) => setManualModel(e.target.value)}
                placeholder="model-id"
              />
            ) : (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                    aria-expanded={open}
                  >
                    {model || 'Select a model'}
                    <HugeiconsIcon
                      icon={UnfoldMoreIcon as IconSvgElement}
                      className="size-4 opacity-50"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-(--radix-popover-trigger-width) p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search models..." />
                    <CommandList>
                      <CommandEmpty>No models match.</CommandEmpty>
                      {sortedModels.map((m) => (
                        <CommandItem
                          key={m}
                          value={m}
                          onSelect={(v) => {
                            setModel(v);
                            setOpen(false);
                          }}
                        >
                          {m}
                          {model === m && (
                            <HugeiconsIcon
                              icon={Tick02Icon as IconSvgElement}
                              className="ml-auto size-4"
                            />
                          )}
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            <div className="flex items-center justify-between gap-2">
              {!isManual && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleFetchModels}
                  disabled={isFetching || !urlValid}
                >
                  <HugeiconsIcon
                    icon={Refresh01Icon as IconSvgElement}
                    className={cn('size-3.5', isFetching && 'animate-spin')}
                  />
                  {isFetching ? 'Fetching…' : 'Fetch models'}
                </Button>
              )}
              {availableModels.length > 0 && !isManual && (
                <Badge variant="secondary" className="text-xs">
                  {availableModels.length} available
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">Thinking</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Show thinking</span>
              <Switch checked={showThinking} onCheckedChange={setShowThinking} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Reasoning effort
              </span>
              <Select
                value={reasoningEffort}
                onValueChange={(v) => setReasoningEffort(v as ReasoningEffort)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">minimal</SelectItem>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {temperature.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[temperature]}
              onValueChange={([v]) => setTemperature(v)}
              min={0}
              max={2}
              step={0.1}
              aria-label="Temperature"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="system-instruction">System instruction (optional)</Label>
            <Textarea
              id="system-instruction"
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              placeholder="e.g. You are a helpful assistant. Answer concisely."
              className="min-h-[80px] resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Prepended as a system message on every chat request.
            </p>
          </div>

          <Separator />

          <McpServersSection
            servers={mcpServers}
            onChange={setMcpServers}
            discoveredTools={settings.discoveredTools ?? {}}
            onDiscoveredToolsChange={onDiscoveredToolsChange}
          />

        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleTest}
            disabled={isTesting || !urlValid}
          >
            <HugeiconsIcon
              icon={isTesting ? Loading03Icon : CloudCheckIcon}
              className={`size-4 ${isTesting ? 'animate-spin' : ''}`}
            />
            {isTesting ? 'Testing…' : 'Test Connection'}
          </Button>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isSaving || !canSave}
          >
            {isSaving ? 'Saving…' : 'Save & Continue'}
          </Button>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <HugeiconsIcon
              icon={AlertCircleIcon as IconSvgElement}
              className="size-3"
            />
            HTTP allowed for localhost only — use HTTPS otherwise.
          </p>
        </div>
      </div>
    </div>
  );
}