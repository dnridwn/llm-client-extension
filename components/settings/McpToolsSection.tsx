import { useState } from 'react';
import { HammerIcon, ChevronDownIcon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { McpServerConfig, McpTool } from '@/lib/types';

interface McpToolsSectionProps {
  server: McpServerConfig;
  tools: McpTool[] | undefined;
  loading: boolean;
  onDiscover: () => void;
}

export function McpToolsSection({
  server,
  tools,
  loading,
  onDiscover,
}: McpToolsSectionProps) {
  const [open, setOpen] = useState(false);
  const isHint = tools === undefined;
  const isEmpty = tools !== undefined && tools.length === 0;
  const hasTools = tools !== undefined && tools.length > 0;
  const buttonLabel = isHint ? 'Discover' : 'Refresh';

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <div className="flex items-center gap-1.5">
        <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground">
          <HugeiconsIcon icon={HammerIcon as IconSvgElement} className="size-3.5" />
          <span>Tools{tools !== undefined ? ` — ${tools.length}` : ''}</span>
          <HugeiconsIcon
            icon={ChevronDownIcon as IconSvgElement}
            className={cn(
              'ml-auto size-3.5 transition-transform',
              open && 'rotate-180',
            )}
          />
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDiscover}
          disabled={loading}
          aria-label={buttonLabel}
          title={buttonLabel}
        >
          <HugeiconsIcon
            icon={Refresh01Icon as IconSvgElement}
            className={cn('size-3.5', loading && 'animate-spin')}
          />
        </Button>
      </div>
      <CollapsibleContent>
        <div className="px-2 pb-2 pt-1">
          {loading && isHint ? (
            <p className="text-xs text-muted-foreground">Discovering tools…</p>
          ) : isHint ? (
            <p className="text-xs text-muted-foreground">
              No tools discovered yet.
            </p>
          ) : isEmpty ? (
            <p className="text-xs text-muted-foreground">No tools exposed.</p>
          ) : hasTools ? (
            <div className="max-h-40 overflow-y-auto pr-1">
              <ul className="flex flex-col gap-1.5">
                {tools!.map((t) => (
                  <li
                    key={`${server.id}-${t.originalName}`}
                    className="flex flex-col"
                  >
                    <code className="font-mono text-xs text-foreground">
                      {t.originalName}
                    </code>
                    {t.description && (
                      <span className="text-xs text-muted-foreground">
                        {t.description}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}