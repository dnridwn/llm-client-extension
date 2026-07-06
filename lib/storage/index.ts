import { useEffect, useState } from 'react';
import type {
  Settings,
  ChatHistory,
} from '@/lib/types';

const defaultSettings: Settings = {
  baseUrl: '',
  apiKey: '',
  model: '',
  availableModels: [],
  showThinking: false,
  reasoningEffort: 'medium',
  systemInstruction: '',
  mcpServers: [],
};

const defaultChatHistory: ChatHistory = {
  messages: [],
};

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: defaultSettings,
});

export const chatHistoryItem = storage.defineItem<ChatHistory>(
  'local:chat-history',
  {
    fallback: defaultChatHistory,
  },
);

export function useSettings(): [
  Settings,
  (value: Settings | ((prev: Settings) => Settings)) => void,
] {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    settingsItem.getValue().then(setSettings);
    const unwatch = settingsItem.watch((newVal) => {
      setSettings(newVal);
    });
    return unwatch;
  }, []);

  const update = (value: Settings | ((prev: Settings) => Settings)) => {
    setSettings((prev) => {
      const next =
        typeof value === 'function'
          ? (value as (prev: Settings) => Settings)(prev)
          : value;
      settingsItem.setValue(next);
      return next;
    });
  };

  return [settings, update];
}

export function useChatHistory(): [
  ChatHistory,
  (value: ChatHistory | ((prev: ChatHistory) => ChatHistory)) => void,
] {
  const [history, setHistory] = useState<ChatHistory>(defaultChatHistory);

  useEffect(() => {
    chatHistoryItem.getValue().then(setHistory);
    const unwatch = chatHistoryItem.watch((newVal) => {
      setHistory(newVal);
    });
    return unwatch;
  }, []);

  const update = (
    value: ChatHistory | ((prev: ChatHistory) => ChatHistory),
  ) => {
    setHistory((prev) => {
      const next =
        typeof value === 'function'
          ? (value as (prev: ChatHistory) => ChatHistory)(prev)
          : value;
      chatHistoryItem.setValue(next);
      return next;
    });
  };

  return [history, update];
}