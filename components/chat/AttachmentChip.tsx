import { Cancel01Icon, FileAttachmentIcon, Image01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/files';
import type { Attachment } from '@/lib/types';

interface AttachmentChipProps {
  attachment: Attachment;
  onRemove?: (id: string) => void;
}

export function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  const isImage = !!attachment.dataUrl;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs',
        'max-w-[200px]',
      )}
    >
      {isImage && attachment.dataUrl ? (
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          className="size-6 shrink-0 rounded object-cover"
        />
      ) : (
        <HugeiconsIcon
          icon={FileAttachmentIcon as IconSvgElement}
          className="size-4 shrink-0 text-muted-foreground"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{attachment.name}</p>
        <p className="text-muted-foreground">{formatFileSize(attachment.size)}</p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Remove attachment"
        >
          <HugeiconsIcon icon={Cancel01Icon as IconSvgElement} className="size-3.5" />
        </button>
      )}
    </div>
  );
}