import {
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import {
  AttachmentIcon,
  Sent02Icon,
  StopIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AttachmentChip } from '@/components/chat/AttachmentChip';
import { ACCEPT_ATTR, ingestFiles } from '@/lib/files';
import { PayloadTooLargeError } from '@/lib/types';
import { toast } from 'sonner';
import type { Attachment } from '@/lib/types';

interface ChatComposerProps {
  isStreaming: boolean;
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
}

export type ChatComposerHandle = { addFiles: (files: File[]) => void };

export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer({ isStreaming, onSend, onStop }, ref) {
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachmentsRef = useRef<Attachment[]>([]);

    useEffect(() => {
      attachmentsRef.current = attachments;
    }, [attachments]);

    function autoGrow() {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }

    async function handleFiles(files: File[]) {
      if (files.length === 0) return;
      setIsProcessingFile(true);
      try {
        const { attachments: next, errors } = await ingestFiles(
          files,
          attachmentsRef.current,
        );
        for (const msg of errors) toast.error(msg);
        if (next.length > 0) {
          setAttachments((prev) => [...prev, ...next]);
        }
      } catch (err) {
        if (err instanceof PayloadTooLargeError) {
          toast.error(err.message);
        } else {
          toast.error(
            err instanceof Error ? err.message : 'Failed to process file',
          );
        }
      } finally {
        setIsProcessingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }

    useImperativeHandle(ref, () => ({ addFiles: handleFiles }), []);

    function removeAttachment(id: string) {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    }

    function handleSend() {
      if (isStreaming) return;
      const trimmed = text.trim();
      if (!trimmed && attachments.length === 0) return;
      onSend(trimmed, attachments);
      setText('');
      setAttachments([]);
      requestAnimationFrame(() => {
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      });
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }

    function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        void handleFiles(files);
      }
    }

    function suppressDragDefault(e: DragEvent) {
      e.preventDefault();
    }

    return (
      <div
        className="border-t bg-background p-3"
        onDragOver={suppressDragDefault}
        onDrop={suppressDragDefault}
      >
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((a) => (
              <AttachmentChip
                key={a.id}
                attachment={a}
                onRemove={removeAttachment}
              />
            ))}
          </div>
        )}
        <div className="flex items-start gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || isProcessingFile}
            aria-label="Attach file"
          >
            <HugeiconsIcon icon={AttachmentIcon as IconSvgElement} className="size-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              autoGrow();
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onDragOver={suppressDragDefault}
            onDrop={suppressDragDefault}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="min-h-[40px] max-h-40 resize-none"
          />
          {isStreaming ? (
            <Button variant="destructive" size="icon" onClick={onStop} aria-label="Stop">
              <HugeiconsIcon icon={StopIcon as IconSvgElement} className="size-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={(!text.trim() && attachments.length === 0) || isProcessingFile}
              aria-label="Send"
            >
              <HugeiconsIcon icon={Sent02Icon as IconSvgElement} className="size-4" />
            </Button>
          )}
        </div>
      </div>
    );
  },
);