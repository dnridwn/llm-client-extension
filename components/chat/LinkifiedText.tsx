import { Fragment, type ReactNode } from 'react';
import { openExternalUrl } from '@/lib/links';

const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

export function LinkifiedText({ text, className }: LinkifiedTextProps) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  let key = 0;

  while ((match = URL_RE.exec(text)) !== null) {
    const start = match.index;
    const url = match[0];
    if (start > lastIndex) {
      nodes.push(<Fragment key={key++}>{text.slice(lastIndex, start)}</Fragment>);
    }
    nodes.push(
      <a
        key={key++}
        href={url}
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          openExternalUrl(url);
        }}
        className={
          className ?? 'font-medium underline underline-offset-2 hover:opacity-80'
        }
      >
        {url}
      </a>,
    );
    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return <>{nodes}</>;
}