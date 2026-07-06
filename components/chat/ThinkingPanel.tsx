import { useState, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Brain03Icon, ChevronDownIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ThinkingPanelProps {
  reasoning: string;
  isStreaming?: boolean;
  hasAnswerStarted?: boolean;
}

export function ThinkingPanel({
  reasoning,
  isStreaming,
  hasAnswerStarted,
}: ThinkingPanelProps) {
  const [open, setOpen] = useState(false);
  const showIndicator = isStreaming && !hasAnswerStarted;

  if (!reasoning && !showIndicator) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'mb-2 rounded-lg border border-border/60 bg-muted/40 text-sm',
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
        <HugeiconsIcon icon={Brain03Icon as IconSvgElement} className="size-3.5" />
        {showIndicator ? (
          <span className="flex items-center gap-1">
            Thinking
            <span className="inline-flex gap-0.5">
              <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:0ms]" />
              <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
              <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
            </span>
          </span>
        ) : (
          <span>Thinking</span>
        )}
        <HugeiconsIcon
          icon={ChevronDownIcon as IconSvgElement}
          className={cn(
            'ml-auto size-3.5 transition-transform',
            open && 'rotate-180',
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {reasoning ? (
          <div className="prose prose-sm dark:prose-invert max-h-60 max-w-none overflow-auto break-words px-3 pb-3 text-xs text-muted-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children, ...props }: ComponentPropsWithoutRef<'pre'>) => (
                  <pre
                    className="not-prose overflow-x-auto rounded-md bg-background/60 p-3 text-xs leading-relaxed"
                    {...props}
                  >
                    {children}
                  </pre>
                ),
                code: ({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) => {
                  const isBlock = /language-/.test(className ?? '');
                  if (isBlock) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code
                      className="rounded bg-muted/60 px-1 py-0.5 text-xs before:content-none after:content-none"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {reasoning}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="max-h-60 overflow-auto px-3 pb-3 text-xs text-muted-foreground">…</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}