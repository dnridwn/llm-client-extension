import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SettingsScreen } from '@/components/settings/SettingsScreen';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { useSettings } from '@/lib/storage';
import type { McpToolsByServer } from '@/lib/types';

function App() {
  const [settings, setSettings, loaded] = useSettings();
  const [view, setView] = useState<'chat' | 'settings'>('settings');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (loaded && !initialized) {
      setView(settings.baseUrl === '' ? 'settings' : 'chat');
      setInitialized(true);
    }
  }, [loaded, initialized, settings.baseUrl]);

  const isFirstRun = loaded && settings.baseUrl === '';

  return (
    <TooltipProvider>
      {view === 'settings' ? (
        <SettingsScreen
          settings={settings}
          onSave={(next) => {
            setSettings(next);
            setView('chat');
          }}
          onDiscoveredToolsChange={(updater) =>
            setSettings((prev) => ({
              ...prev,
              discoveredTools: updater(prev.discoveredTools ?? {}),
            }))
          }
          onBack={isFirstRun ? undefined : () => setView('chat')}
        />
      ) : (
        <ChatScreen onOpenSettings={() => setView('settings')} />
      )}
      <Toaster position="top-center" closeButton />
    </TooltipProvider>
  );
}

export default App;