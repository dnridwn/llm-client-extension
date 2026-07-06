import { useState } from 'react';
import { HammerIcon, ChevronDownIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ToolCallPanelProps {
  toolName: string;
  result: string;
  defaultOpen?: boolean;
}

export function ToolCallPanel({
  toolName,
  result,
  defaultOpen = false,
}: ToolCallPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border/60 bg-muted/30 text-sm"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
        <HugeiconsIcon icon={HammerIcon as IconSvgElement} className="size-3.5" />
        <span>
          Tool: <code className="font-mono text-foreground">{toolName}</code>
        </span>
        <HugeiconsIcon
          icon={ChevronDownIcon as IconSvgElement}
          className={cn(
            'ml-auto size-3.5 transition-transform',
            open && 'rotate-180',
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words px-3 pb-3 font-mono text-xs text-muted-foreground">
          {result}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}