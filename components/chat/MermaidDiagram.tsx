import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Copy01Icon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MermaidDiagramProps {
  code: string;
}

type MermaidModule = typeof import('mermaid');

const DEBOUNCE_MS = 250;
const COPY_FEEDBACK_MS = 1500;

function getTheme(): 'default' | 'dark' {
  if (typeof window === 'undefined') return 'default';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'default';
}

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const mermaidRef = useRef<MermaidModule | null>(null);
  const themeRef = useRef<'default' | 'dark'>(getTheme());
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diagramIdRef = useRef<string>(`mermaid-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    let cancelled = false;
    let media: MediaQueryList | null = null;

    async function load() {
      const mermaid = await import('mermaid');
      if (cancelled) return;
      mermaidRef.current = mermaid;
      mermaid.default.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: themeRef.current,
      });
      render();
    }

    function handleThemeChange() {
      const next = getTheme();
      if (next === themeRef.current) return;
      themeRef.current = next;
      const mermaid = mermaidRef.current;
      if (!mermaid) return;
      mermaid.default.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: next,
      });
      render();
    }

    media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', handleThemeChange);

    load();

    return () => {
      cancelled = true;
      media?.removeEventListener('change', handleThemeChange);
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    render();
    return () => {
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  function render() {
    if (renderTimerRef.current) clearTimeout(renderTimerRef.current);
    const mermaid = mermaidRef.current;
    if (!mermaid) return;
    if (!code.trim()) {
      setSvg(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    renderTimerRef.current = setTimeout(async () => {
      try {
        const { svg: rendered } = await mermaid.default.render(
          diagramIdRef.current,
          code,
        );
        setSvg(rendered);
        setError(null);
        setLoading(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setSvg(null);
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      toast.error('Copy failed — clipboard not available');
    }
  }

  if (loading) {
    return (
      <div className="my-2 flex h-[200px] items-center justify-center rounded-md border border-border/60 bg-background/60">
        <span className="size-4 animate-pulse rounded-full bg-muted-foreground/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-2 rounded-md border border-destructive/40 bg-background/60 p-3">
        <p className="mb-1 text-xs font-medium text-destructive">
          Invalid Mermaid
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed">
          {code}
        </pre>
        <p className="mt-2 text-xs text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-md border border-border/60 bg-background/60 p-3">
      <div
        className="overflow-x-auto"
        style={{ maxWidth: '100%' }}
        dangerouslySetInnerHTML={{ __html: svg ?? '' }}
      />
      <div className="mt-2 flex justify-end">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleCopyCode}
          aria-label="Copy code"
          title="Copy code"
        >
          <HugeiconsIcon
            icon={(copied ? CheckmarkCircle02Icon : Copy01Icon) as IconSvgElement}
            className={cn('size-3.5')}
          />
        </Button>
      </div>
    </div>
  );
}