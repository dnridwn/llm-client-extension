export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

export type McpTransport = 'streamable-http' | 'sse';

export interface McpHeader {
  id: string;
  name: string;
  value: string;
  isSecret: boolean;
}

export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  transport: McpTransport;
  headers: McpHeader[];
  enabled: boolean;
}

export interface Settings {
  baseUrl: string;
  apiKey: string;
  model: string;
  availableModels: string[];
  showThinking: boolean;
  reasoningEffort: ReasoningEffort;
  temperature?: number;
  systemInstruction?: string;
  mcpServers: McpServerConfig[];
  discoveredTools: McpToolsByServer;
}

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  text?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  reasoning?: string;
  attachments?: Attachment[];
  createdAt: number;
  model?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ChatHistory {
  messages: Message[];
}

export interface McpTool {
  serverId: string;
  serverName: string;
  originalName: string;
  prefixedName: string;
  description?: string;
  inputSchema: object;
}

export type McpToolsByServer = Record<string, McpTool[]>;

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface ApiMessage {
  role: Role;
  content: string | ContentPart[] | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface OpenAiTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: object;
  };
}

export interface PartialToolCallDelta {
  index: number;
  id?: string;
  type?: 'function';
  function?: { name?: string; arguments?: string };
}

export interface StreamCallbacks {
  onDelta: (delta: {
    content?: string;
    reasoning?: string;
    tool_calls?: PartialToolCallDelta[];
  }) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export interface ChatCompletionParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ApiMessage[];
  reasoningEffort?: ReasoningEffort;
  temperature?: number;
  tools?: OpenAiTool[];
  tool_choice?: 'auto' | 'none';
}

export class PayloadTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayloadTooLargeError';
  }
}