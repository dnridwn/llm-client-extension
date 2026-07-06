import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {
  Attachment,
  ContentPart,
} from '@/lib/types';
import { PayloadTooLargeError } from '@/lib/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
];

export const ACCEPTED_TEXT_EXTENSIONS = [
  'txt',
  'md',
  'csv',
  'json',
  'xml',
  'html',
  'pdf',
];

export const MAX_PAYLOAD_BYTES = 20 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'txt',
  'md',
  'csv',
  'json',
  'xml',
  'html',
  'pdf',
];

export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',');

function getExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function isImage(mime: string): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(mime.toLowerCase());
}

function isPdf(ext: string): boolean {
  return ext === 'pdf';
}

function isTextLike(ext: string): boolean {
  return ACCEPTED_TEXT_EXTENSIONS.includes(ext) && ext !== 'pdf';
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n\n';
  }
  return fullText.trim();
}

export async function fileToAttachment(file: File): Promise<Attachment> {
  const ext = getExtension(file.name);
  const attachment: Attachment = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
  };

  if (isImage(file.type)) {
    attachment.dataUrl = await readFileAsDataURL(file);
  } else if (isPdf(ext)) {
    attachment.text = await extractPdfText(file);
  } else if (isTextLike(ext)) {
    attachment.text = await readFileAsText(file);
  } else {
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  return attachment;
}

export function checkPayloadSize(attachments: Attachment[]): void {
  const total = attachments.reduce((sum, a) => {
    if (a.dataUrl) return sum + a.dataUrl.length;
    if (a.text) return sum + a.text.length;
    return sum;
  }, 0);
  if (total > MAX_PAYLOAD_BYTES) {
    throw new PayloadTooLargeError(
      `Attachments exceed ${MAX_PAYLOAD_BYTES / (1024 * 1024)} MB limit`,
    );
  }
}

export async function ingestFiles(
  files: File[],
  existing: Attachment[],
): Promise<{ attachments: Attachment[]; errors: string[] }> {
  const next: Attachment[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      const att = await fileToAttachment(file);
      next.push(att);
    } catch (err) {
      errors.push(
        `${file.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  checkPayloadSize([...existing, ...next]);
  return { attachments: next, errors };
}

export function buildMessageContent(
  text: string,
  attachments: Attachment[],
): string | ContentPart[] {
  if (attachments.length === 0) return text;

  const parts: ContentPart[] = [];
  const textParts: string[] = [];
  if (text) textParts.push(text);

  for (const a of attachments) {
    if (a.dataUrl) {
      parts.push({ type: 'image_url', image_url: { url: a.dataUrl } });
    } else if (a.text) {
      textParts.push(`[${a.name}]\n${a.text}`);
    }
  }

  if (textParts.length > 0) {
    parts.unshift({ type: 'text', text: textParts.join('\n\n') });
  }

  return parts;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}