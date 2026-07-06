import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CleanIcon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { MessageList } from '@/components/chat/MessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import {
  streamChatCompletion,
  ChatRequestError,
} from '@/lib/api/client';
import {
  buildOpenAiTools,
  callTool,
  closeAllSessions,
  ensureConnected,
  findToolByPrefixedName,
  unprefixToolName,
} from '@/lib/api/mcp';
import { buildMessageContent } from '@/lib/files';
import { useChatHistory, useSettings } from '@/lib/storage';
import { toast } from 'sonner';
import type {
  ApiMessage,
  Attachment,
  Message,
  McpTool,
  OpenAiTool,
  ToolCall,
} from '@/lib/types';

const MAX_TOOL_TURNS = 10;

interface ChatScreenProps {
  onOpenSettings: () => void;
}

export function ChatScreen({ onOpenSettings }: ChatScreenProps) {
  const [settings, setSettings] = useSettings();
  const [history, setHistory] = useChatHistory();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef<{ content: string; reasoning: string }>({
    content: '',
    reasoning: '',
  });
  const pendingToolCallsRef = useRef<ToolCall[]>([]);
  const toolsRef = useRef<McpTool[]>([]);
  const disableToolsRef = useRef(false);
  const mcpReadyRef = useRef(false);
  const [mcpToolsCount, setMcpToolsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    mcpReadyRef.current = false;
    if (settings.mcpServers && settings.mcpServers.some((s) => s.enabled)) {
      ensureConnected(settings.mcpServers)
        .then(({ tools, errors }) => {
          if (cancelled) return;
          toolsRef.current = tools;
          if (errors.length > 0) {
            toast.error(
              `MCP: ${errors.map((e) => `${e.name}: ${e.error}`).join(', ')}`,
            );
          }
          setMcpToolsCount(tools.length);
          mcpReadyRef.current = true;
        })
        .catch(() => {
          if (cancelled) return;
          mcpReadyRef.current = true;
        });
    } else {
      toolsRef.current = [];
      setMcpToolsCount(0);
      mcpReadyRef.current = true;
    }
    return () => {
      cancelled = true;
    };
  }, [settings.mcpServers]);

  useEffect(() => {
    return () => {
      void closeAllSessions();
    };
  }, []);

  const flushDelta = useCallback(
    (id: string) => {
      rafRef.current = requestAnimationFrame(() => {
        const pending = pendingDeltaRef.current;
        if (pending.content || pending.reasoning) {
          setHistory((prev) => ({
            messages: prev.messages.map((m) =>
              m.id === id
                ? {
                    ...m,
                    content: m.content + pending.content,
                    reasoning: (m.reasoning ?? '') + pending.reasoning,
                  }
                : m,
            ),
          }));
          pendingDeltaRef.current = { content: '', reasoning: '' };
        }
      });
    },
    [setHistory],
  );

  function buildOpenAiToolsFromState(): OpenAiTool[] | undefined {
    if (disableToolsRef.current) return undefined;
    const tools = toolsRef.current;
    if (tools.length === 0) return undefined;
    return buildOpenAiTools(tools);
  }

  function buildApiMessages(allMessages: Message[]): ApiMessage[] {
    const out: ApiMessage[] = [];
    if (settings.systemInstruction && settings.systemInstruction.trim()) {
      out.push({ role: 'system', content: settings.systemInstruction });
    }
    for (const m of allMessages) {
      if (m.role === 'user') {
        out.push({
          role: 'user',
          content: buildMessageContent(m.content, m.attachments ?? []),
        });
      } else if (m.role === 'assistant') {
        const hasToolCalls = !!m.tool_calls && m.tool_calls.length > 0;
        if (!m.content && !hasToolCalls) continue;
        out.push({
          role: 'assistant',
          content: m.content || null,
          ...(hasToolCalls ? { tool_calls: m.tool_calls } : {}),
        });
      } else if (m.role === 'tool') {
        out.push({
          role: 'tool',
          content: m.content,
          tool_call_id: m.tool_call_id,
          name: m.tool_calls?.[0]?.function.name,
        });
      }
    }
    return out;
  }

  function mergeToolCallDeltas(
    into: ToolCall[],
    deltas: import('@/lib/types').PartialToolCallDelta[],
  ) {
    for (const d of deltas) {
      const existing = into[d.index];
      if (!existing) {
        into[d.index] = {
          id: d.id ?? '',
          type: 'function',
          function: {
            name: d.function?.name ?? '',
            arguments: d.function?.arguments ?? '',
          },
        };
        continue;
      }
      if (d.id && existing.id && d.id !== existing.id) {
        const nextIndex = into.length;
        into[nextIndex] = {
          id: d.id,
          type: 'function',
          function: {
            name: d.function?.name ?? '',
            arguments: d.function?.arguments ?? '',
          },
        };
        continue;
      }
      if (d.id) existing.id = d.id;
      if (d.function?.name) existing.function.name = d.function.name;
      if (d.function?.arguments)
        existing.function.arguments += d.function.arguments;
    }
  }

  function splitMultiJson(raw: string): unknown[] {
    const out: unknown[] = [];
    let depth = 0;
    let start = -1;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          const slice = raw.slice(start, i + 1);
          try {
            out.push(JSON.parse(slice));
          } catch {}
          start = -1;
        }
      }
    }
    return out;
  }

  async function handleToolsAfterStream(
    assistantId: string,
    allMessages: Message[],
    turn: number,
  ): Promise<void> {
    const calls = pendingToolCallsRef.current.filter(
      (c) => c.id || c.function.name,
    );
    pendingToolCallsRef.current = [];
    if (calls.length === 0) return;

    const finalContent = pendingDeltaRef.current.content || '';
    const finalReasoning = pendingDeltaRef.current.reasoning || '';
    pendingDeltaRef.current = { content: '', reasoning: '' };

    const updatedAssistant: Message[] = allMessages.map((m) =>
      m.id === assistantId
        ? {
            ...m,
            content: m.content + finalContent,
            reasoning: (m.reasoning ?? '') + finalReasoning,
            tool_calls: calls,
          }
        : m,
    );

    const toolMessages: Message[] = new Array(calls.length);
    await Promise.all(
      calls.map(async (c, i) => {
        const base = {
          id: crypto.randomUUID(),
          role: 'tool' as const,
          tool_call_id: c.id,
          tool_calls: [c],
          createdAt: Date.now(),
        };
        const parsed = unprefixToolName(c.function.name);
        if (!parsed) {
          toolMessages[i] = { ...base, content: `Error: invalid tool name ${c.function.name}` };
          return;
        }
        let argObjects: Record<string, unknown>[] = [];
        const rawArgs = c.function.arguments?.trim() ?? '';
        if (rawArgs) {
          try {
            argObjects = [JSON.parse(rawArgs) as Record<string, unknown>];
          } catch {
            const split = splitMultiJson(rawArgs);
            if (split.length > 0) {
              argObjects = split as Record<string, unknown>[];
            } else {
              toolMessages[i] = { ...base, content: 'Error: invalid arguments JSON' };
              return;
            }
          }
        } else {
          argObjects = [{}];
        }
        const tool = findToolByPrefixedName(toolsRef.current, c.function.name);
        if (!tool) {
          toolMessages[i] = { ...base, content: `Error: tool ${c.function.name} not found` };
          return;
        }
        try {
          const results = await Promise.all(
            argObjects.map((a) => callTool(tool.serverId, tool.originalName, a)),
          );
          toolMessages[i] = {
            ...base,
            content: argObjects.length > 1
              ? results.map((r, idx) => `--- call ${idx + 1} ---\n${r}`).join('\n\n')
              : results[0],
          };
        } catch (err) {
          toolMessages[i] = {
            ...base,
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }),
    );

    const withTools: Message[] = [...updatedAssistant, ...toolMessages];
    setHistory({ messages: withTools });

    if (turn + 1 >= MAX_TOOL_TURNS) {
      toast.error('Max tool turns reached — stopping.');
      setIsStreaming(false);
      setStreamingId(undefined);
      abortRef.current = null;
      return;
    }

    const nextAssistant: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      reasoning: '',
      createdAt: Date.now(),
      model: settings.model,
    };
    const withAssistant: Message[] = [...withTools, nextAssistant];
    setHistory({ messages: withAssistant });

    await runStream(withAssistant, nextAssistant.id, turn + 1);
  }

  async function runStream(allMessages: Message[], assistantId: string, turn = 0) {
    setIsStreaming(true);
    setStreamingId(assistantId);
    pendingDeltaRef.current = { content: '', reasoning: '' };
    pendingToolCallsRef.current = [];

    const tools = buildOpenAiToolsFromState();
    const apiMessages = buildApiMessages(allMessages);

    const controller = streamChatCompletion(
      {
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        messages: apiMessages,
        reasoningEffort: settings.showThinking
          ? settings.reasoningEffort
          : undefined,
        temperature: settings.temperature,
        tools,
      },
      {
        onDelta: (delta) => {
          if (delta.content) {
            pendingDeltaRef.current.content += delta.content;
          }
          if (delta.reasoning) {
            pendingDeltaRef.current.reasoning += delta.reasoning;
          }
          if (delta.tool_calls && delta.tool_calls.length > 0) {
            mergeToolCallDeltas(pendingToolCallsRef.current, delta.tool_calls);
          }
          flushDelta(assistantId);
        },
        onDone: () => {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          if (pendingToolCallsRef.current.length > 0) {
            void handleToolsAfterStream(assistantId, allMessages, turn).catch((e) => {
              toast.error(`Tool execution failed: ${e instanceof Error ? e.message : String(e)}`);
              setIsStreaming(false);
              setStreamingId(undefined);
              abortRef.current = null;
            });
            return;
          }
          const pending = pendingDeltaRef.current;
          if (pending.content || pending.reasoning) {
            setHistory((prev) => ({
              messages: prev.messages.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: m.content + pending.content,
                      reasoning: (m.reasoning ?? '') + pending.reasoning,
                    }
                  : m,
              ),
            }));
          }
          pendingDeltaRef.current = { content: '', reasoning: '' };
          setIsStreaming(false);
          setStreamingId(undefined);
          abortRef.current = null;
        },
        onError: async (err) => {
          if (
            err instanceof ChatRequestError &&
            err.isToolsUnsupported &&
            !disableToolsRef.current &&
            tools
          ) {
            disableToolsRef.current = true;
            toast.warning(
              'Endpoint does not support tool/function calling — retrying without tools.',
            );
            setIsStreaming(false);
            setStreamingId(undefined);
            void runStream(allMessages, assistantId, turn);
            return;
          }
          setIsStreaming(false);
          setStreamingId(undefined);
          abortRef.current = null;
          toast.error(err.message);
        },
      },
    );
    abortRef.current = controller;
  }

  function handleSend(text: string, attachments: Attachment[]) {
    if (isStreaming) return;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: Date.now(),
    };
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      reasoning: '',
      createdAt: Date.now(),
      model: settings.model,
    };

    const newMessages = [...history.messages, userMessage, assistantMessage];
    setHistory({ messages: newMessages });

    void runStream(newMessages, assistantMessage.id, 0);
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function handleClear() {
    if (isStreaming) handleStop();
    setHistory({ messages: [] });
    toast.success('Chat cleared');
  }

  function handleRegenerate() {
    if (isStreaming) return;
    const msgs = history.messages;
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex < 0) return;

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      reasoning: '',
      createdAt: Date.now(),
      model: settings.model,
    };

    const trimmed = msgs.slice(0, lastUserIndex + 1);
    const newMessages = [...trimmed, assistantMessage];
    setHistory({ messages: newMessages });

    void runStream(newMessages, assistantMessage.id, 0);
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <span className="truncate text-xs text-muted-foreground">
          {settings.model}
          {mcpToolsCount > 0 ? ` · ${mcpToolsCount} tools` : ''}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            aria-label="Clear chat"
            disabled={isStreaming || history.messages.length === 0}
          >
            <HugeiconsIcon icon={CleanIcon as IconSvgElement} className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenSettings}
            aria-label="Settings"
          >
            <HugeiconsIcon
              icon={Settings01Icon as IconSvgElement}
              className="size-4"
            />
          </Button>
        </div>
      </header>

      <MessageList
        messages={history.messages}
        showThinking={settings.showThinking}
        isStreaming={isStreaming}
        streamingId={streamingId}
        onRegenerate={handleRegenerate}
      />

      <ChatComposer
        isStreaming={isStreaming}
        onSend={handleSend}
        onStop={handleStop}
      />
    </div>
  );
}