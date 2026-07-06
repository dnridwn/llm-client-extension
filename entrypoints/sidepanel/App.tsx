import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SettingsScreen } from '@/components/settings/SettingsScreen';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { useSettings } from '@/lib/storage';

function App() {
  const [settings, setSettings] = useSettings();
  const [view, setView] = useState<'chat' | 'settings'>(
    settings.baseUrl === '' ? 'settings' : 'chat',
  );
  const isFirstRun = settings.baseUrl === '';

  return (
    <TooltipProvider>
      {view === 'settings' ? (
        <SettingsScreen
          settings={settings}
          onSave={(next) => {
            setSettings(next);
            setView('chat');
          }}
          onBack={isFirstRun ? undefined : () => setView('chat')}
        />
      ) : (
        <ChatScreen onOpenSettings={() => setView('settings')} />
      )}
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}

export default App;