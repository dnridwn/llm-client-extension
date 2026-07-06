import type { StreamCallbacks } from '@/lib/types';

interface SSEChunkDelta {
  content?: string;
  reasoning_content?: string;
  reasoning?: string;
  tool_calls?: {
    index: number;
    id?: string;
    type?: 'function';
    function?: { name?: string; arguments?: string };
  }[];
}

interface SSEChunkChoice {
  delta?: SSEChunkDelta;
  message?: SSEChunkDelta;
}

interface SSEChunk {
  choices?: SSEChunkChoice[];
}

export async function parseSSEStream(
  response: Response,
  callbacks: StreamCallbacks,
  signal: AbortSignal,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error('No response body'));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          callbacks.onDone();
          return;
        }

        try {
          const parsed: SSEChunk = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta) {
            const hasToolCalls =
              Array.isArray(delta.tool_calls) && delta.tool_calls.length > 0;
            if (delta.content || delta.reasoning_content || delta.reasoning || hasToolCalls) {
              callbacks.onDelta({
                content: delta.content,
                reasoning: delta.reasoning_content ?? delta.reasoning,
                tool_calls: hasToolCalls ? delta.tool_calls : undefined,
              });
            }
          }
        } catch {
          // skip malformed JSON lines
        }
      }
    }
    callbacks.onDone();
  } catch (err) {
    if (signal.aborted) {
      callbacks.onDone();
      return;
    }
    callbacks.onError(
      err instanceof Error ? err : new Error('Stream read failed'),
    );
  }
}