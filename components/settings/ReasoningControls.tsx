import {
  Brain03Icon,
  ChevronDownIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReasoningEffort } from '@/lib/types';

interface ReasoningControlsProps {
  showThinking: boolean;
  reasoningEffort: ReasoningEffort;
  onShowThinkingChange: (v: boolean) => void;
  onEffortChange: (v: ReasoningEffort) => void;
  compact?: boolean;
}

export function ReasoningControls({
  showThinking,
  reasoningEffort,
  onShowThinkingChange,
  onEffortChange,
  compact = false,
}: ReasoningControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onShowThinkingChange(!showThinking)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        aria-pressed={showThinking}
      >
        <HugeiconsIcon
          icon={Brain03Icon as IconSvgElement}
          className={`size-4 ${showThinking ? 'text-foreground' : ''}`}
        />
        {!compact && <span>Thinking</span>}
        <Switch checked={showThinking} onCheckedChange={onShowThinkingChange} />
      </button>
      <Select
        value={reasoningEffort}
        onValueChange={(v) => onEffortChange(v as ReasoningEffort)}
        disabled={!showThinking}
      >
        <SelectTrigger className="h-7 w-28 text-xs">
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
  );
}