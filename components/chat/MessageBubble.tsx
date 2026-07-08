import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  Copy01Icon,
  Refresh01Icon,
  User02Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { ThinkingPanel } from '@/components/chat/ThinkingPanel';
import { ToolCallPanel } from '@/components/chat/ToolCallPanel';
import { AttachmentChip } from '@/components/chat/AttachmentChip';
import { LinkifiedText } from '@/components/chat/LinkifiedText';
import { markdownComponents } from '@/components/chat/markdown-components';
import type { Message } from '@/lib/types';

interface MessageBubbleProps {
  message: Message;
  showThinking: boolean;
  isLastAssistant: boolean;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

export function MessageBubble({
  message,
  showThinking,
  isLastAssistant,
  isStreaming,
  onRegenerate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const hasAnswerStarted = message.content.length > 0;
  const showReasoning = showThinking && !!message.reasoning;

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (isTool) {
    const toolName = message.tool_calls?.[0]?.function.name ?? 'tool';
    return (
      <div className="px-4 py-2">
        <ToolCallPanel toolName={toolName} result={message.content} />
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex flex-row-reverse gap-3 px-4 py-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-primary text-primary-foreground">
          <HugeiconsIcon icon={User02Icon as IconSvgElement} className="size-4" />
        </div>
        <div className="flex min-w-0 max-w-[85%] flex-col items-end gap-1">
          <div className="rounded-2xl bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
            <p className="whitespace-pre-wrap break-words">
              <LinkifiedText text={message.content} />
            </p>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {message.attachments.map((a) => (
                  <AttachmentChip key={a.id} attachment={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      {message.model && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {message.model}
        </p>
      )}
      {showReasoning && (
        <ThinkingPanel
          reasoning={message.reasoning ?? ''}
          isStreaming={isStreaming}
          hasAnswerStarted={hasAnswerStarted}
        />
      )}
      {message.content ? (
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      ) : isStreaming ? (
        <span className="inline-flex gap-0.5">
          <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
          <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
        </span>
      ) : null}

      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {message.attachments.map((a) => (
            <AttachmentChip key={a.id} attachment={a} />
          ))}
        </div>
      )}

      {!isStreaming && message.content && (
        <div className="mt-1 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            aria-label="Copy"
            title="Copy"
          >
            <HugeiconsIcon
              icon={(copied ? CheckmarkCircle02Icon : Copy01Icon) as IconSvgElement}
              className="size-3.5"
            />
          </Button>
          {isLastAssistant && onRegenerate && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onRegenerate}
              aria-label="Regenerate"
              title="Regenerate"
            >
              <HugeiconsIcon icon={Refresh01Icon as IconSvgElement} className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}