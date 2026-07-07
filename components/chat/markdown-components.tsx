import type { Components } from 'react-markdown';
import { MermaidDiagram } from '@/components/chat/MermaidDiagram';
import { openExternalUrl } from '@/lib/links';

export const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    if (!href) return <a {...props}>{children}</a>;
    return (
      <a
        href={href}
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          openExternalUrl(href);
        }}
        className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
        {...props}
      >
        {children}
      </a>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="not-prose overflow-x-auto rounded-md bg-background/60 p-3 text-xs leading-relaxed"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isMermaid = /language-mermaid/.test(className ?? '');
    if (isMermaid) {
      const raw = String(children).replace(/\n$/, '');
      return <MermaidDiagram code={raw} />;
    }
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
};