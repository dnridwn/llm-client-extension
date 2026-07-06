import {
  Client,
  StreamableHTTPClientTransport,
  SSEClientTransport,
} from '@modelcontextprotocol/client';
import type {
  McpServerConfig,
  McpTool,
  OpenAiTool,
  McpHeader,
} from '@/lib/types';

interface ActiveSession {
  config: McpServerConfig;
  client: Client;
  transport: StreamableHTTPClientTransport | SSEClientTransport;
  tools: McpTool[];
}

const sessions = new Map<string, ActiveSession>();

function buildHeaders(headers: McpHeader[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) {
    if (h.name) out[h.name] = h.value;
  }
  return out;
}

function prefixName(serverName: string, toolName: string): string {
  const safe = serverName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safe}__${toolName}`;
}

export function unprefixToolName(prefixed: string): {
  serverName: string;
  originalName: string;
} | null {
  const idx = prefixed.indexOf('__');
  if (idx < 0) return null;
  return {
    serverName: prefixed.slice(0, idx),
    originalName: prefixed.slice(idx + 2),
  };
}

async function buildSession(config: McpServerConfig): Promise<ActiveSession> {
  const url = new URL(config.url);
  const headers = buildHeaders(config.headers);
  let transport: StreamableHTTPClientTransport | SSEClientTransport;
  if (config.transport === 'sse') {
    transport = new SSEClientTransport(url, {
      requestInit: { headers },
      eventSourceInit: { headers } as unknown as EventSourceInit,
    });
  } else {
    transport = new StreamableHTTPClientTransport(url, {
      requestInit: { headers },
    });
  }

  const client = new Client(
    { name: 'llm-client-extension', version: '1.0.0' },
    { capabilities: {} },
  );
  await client.connect(transport);

  const { tools } = await client.listTools();
  const mapped: McpTool[] = (tools ?? []).map((t) => ({
    serverId: config.id,
    serverName: config.name,
    originalName: t.name,
    prefixedName: prefixName(config.name, t.name),
    description: t.description,
    inputSchema: (t.inputSchema as object) ?? { type: 'object', properties: {} },
  }));

  return { config, client, transport, tools: mapped };
}

export async function connectServer(
  config: McpServerConfig,
): Promise<ActiveSession> {
  const existing = sessions.get(config.id);
  if (existing && existing.config.url === config.url && existing.config.transport === config.transport) {
    return existing;
  }
  if (existing) {
    await closeSession(config.id);
  }
  const session = await buildSession(config);
  sessions.set(config.id, session);
  return session;
}

export async function closeSession(serverId: string): Promise<void> {
  const session = sessions.get(serverId);
  if (!session) return;
  try {
    await session.transport.close();
  } catch {}
  sessions.delete(serverId);
}

export async function closeAllSessions(): Promise<void> {
  const ids = Array.from(sessions.keys());
  await Promise.all(ids.map(closeSession));
}

export async function discoverTools(
  config: McpServerConfig,
): Promise<McpTool[]> {
  const session = await connectServer(config);
  return session.tools;
}

export function getAllDiscoveredTools(): McpTool[] {
  return Array.from(sessions.values()).flatMap((s) => s.tools);
}

export async function ensureConnected(
  configs: McpServerConfig[],
): Promise<{ tools: McpTool[]; errors: { name: string; error: string }[] }> {
  const errors: { name: string; error: string }[] = [];
  const enabled = configs.filter((c) => c.enabled);
  await Promise.all(
    enabled.map(async (c) => {
      try {
        await discoverTools(c);
      } catch (err) {
        errors.push({
          name: c.name,
          error: err instanceof Error ? err.message : String(err),
        });
        await closeSession(c.id);
      }
    }),
  );
  return { tools: getAllDiscoveredTools(), errors };
}

export async function callTool(
  serverId: string,
  originalName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const session = sessions.get(serverId);
  if (!session) {
    throw new Error(`MCP server not connected: ${serverId}`);
  }
  const result = await session.client.callTool({
    name: originalName,
    arguments: args,
  });
  return stringifyCallResult(result);
}

function stringifyCallResult(result: unknown): string {
  if (!result || typeof result !== 'object') return String(result ?? '');
  const r = result as {
    content?: Array<{ type?: string; text?: string }>;
    isError?: boolean;
  };
  if (r.isError) {
    const text = (r.content ?? [])
      .map((c) => c.text ?? '')
      .join('\n');
    return `Error: ${text || 'tool call failed'}`;
  }
  if (Array.isArray(r.content)) {
    return r.content.map((c) => c.text ?? JSON.stringify(c)).join('\n');
  }
  return JSON.stringify(result, null, 2);
}

export function buildOpenAiTools(tools: McpTool[]): OpenAiTool[] {
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.prefixedName,
      description: t.description ?? t.originalName,
      parameters: t.inputSchema,
    },
  }));
}

export function findToolByPrefixedName(
  tools: McpTool[],
  prefixed: string,
): McpTool | undefined {
  return tools.find((t) => t.prefixedName === prefixed);
}