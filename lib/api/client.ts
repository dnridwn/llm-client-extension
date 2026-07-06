import { parseSSEStream } from '@/lib/api/sse';
import type {
  ChatCompletionParams,
  StreamCallbacks,
  ApiMessage,
  OpenAiTool,
  ToolCall,
} from '@/lib/types';

export class ChatRequestError extends Error {
  status: number;
  bodyText: string;
  isToolsUnsupported: boolean;
  constructor(status: number, bodyText: string, message?: string) {
    super(message ?? `Chat request failed: ${status} ${bodyText}`);
    this.name = 'ChatRequestError';
    this.status = status;
    this.bodyText = bodyText;
    const t = bodyText.toLowerCase();
    this.isToolsUnsupported =
      status === 400 &&
      /tool|function|unsupported/.test(t);
  }
}

function buildHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}${path}`;
}

export async function fetchModels(
  baseUrl: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const res = await fetch(buildUrl(baseUrl, '/v1/models'), {
    method: 'GET',
    headers: buildHeaders(apiKey),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const models: string[] = (data?.data ?? [])
    .map((m: { id?: string }) => m?.id)
    .filter((id: unknown): id is string => typeof id === 'string');
  return models;
}

function buildBody(
  params: ChatCompletionParams,
  stream: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    stream,
  };
  if (params.reasoningEffort !== undefined) {
    body['reasoning_effort'] = params.reasoningEffort;
  }
  if (params.temperature !== undefined) {
    body['temperature'] = params.temperature;
  }
  if (params.tools && params.tools.length > 0) {
    body['tools'] = params.tools;
    body['tool_choice'] = params.tool_choice ?? 'auto';
  }
  return body;
}

export function streamChatCompletion(
  params: ChatCompletionParams,
  callbacks: StreamCallbacks,
): AbortController {
  const controller = new AbortController();
  const { signal } = controller;

  (async () => {
    try {
      const res = await fetch(buildUrl(params.baseUrl, '/v1/chat/completions'), {
        method: 'POST',
        headers: buildHeaders(params.apiKey),
        body: JSON.stringify(buildBody(params, true)),
        signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        callbacks.onError(new ChatRequestError(res.status, text));
        return;
      }

      await parseSSEStream(res, callbacks, signal);
    } catch (err) {
      if (signal.aborted) {
        callbacks.onDone();
        return;
      }
      callbacks.onError(
        err instanceof Error ? err : new Error('Request failed'),
      );
    }
  })();

  return controller;
}

export async function chatCompletion(
  params: ChatCompletionParams,
  signal?: AbortSignal,
): Promise<{
  content: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
}> {
  const res = await fetch(buildUrl(params.baseUrl, '/v1/chat/completions'), {
    method: 'POST',
    headers: buildHeaders(params.apiKey),
    body: JSON.stringify(buildBody(params, false)),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ChatRequestError(res.status, text);
  }

  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  return {
    content: message?.content ?? '',
    reasoning: message?.reasoning_content ?? message?.reasoning,
    tool_calls: message?.tool_calls,
  };
}

export type { ApiMessage, OpenAiTool };