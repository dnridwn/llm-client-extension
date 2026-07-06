import { useEffect, useRef } from 'react';
import { MessageBubble } from '@/components/chat/MessageBubble';
import type { Message } from '@/lib/types';

interface MessageListProps {
  messages: Message[];
  showThinking: boolean;
  isStreaming: boolean;
  streamingId?: string;
  onRegenerate?: () => void;
}

export function MessageList({
  messages,
  showThinking,
  isStreaming,
  streamingId,
  onRegenerate,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <p className="text-sm">Start a conversation by typing below.</p>
      </div>
    );
  }

  let lastAssistantId: string | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      lastAssistantId = messages[i].id;
      break;
    }
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          showThinking={showThinking}
          isLastAssistant={m.id === lastAssistantId}
          isStreaming={isStreaming && m.id === streamingId}
          onRegenerate={onRegenerate}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}