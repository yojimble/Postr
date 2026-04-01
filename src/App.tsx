// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense, useState } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { AppConfig } from '@/contexts/AppContext';
import AppRouter from './AppRouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useAppContext } from '@/hooks/useAppContext';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

const defaultConfig: AppConfig = {
  theme: "light",
  relayUrls: ["wss://nos.lol", "wss://relay.primal.net"], // Default to two relays
};

const presetRelays = [
  { url: 'wss://ditto.pub/relay', name: 'Ditto' },
  { url: 'wss://relay.nostr.band', name: 'Nostr.Band' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
  { url: 'wss://nos.lol', name: 'nos.lol' },
];

function AppContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { config, updateConfig } = useAppContext();

  // Initialize relay inputs from current config or defaults
  const [relayInput1, setRelayInput1] = useState(config.relayUrls[0] || "wss://nos.lol");
  const [relayInput2, setRelayInput2] = useState(config.relayUrls[1] || "wss://relay.primal.net");
  const [relayInput3, setRelayInput3] = useState(config.relayUrls[2] || "");

  const handleSaveRelay = () => {
    const newRelayUrls: string[] = [];

    const validateAndAddRelay = (url: string) => {
      if (url.startsWith("wss://")) {
        newRelayUrls.push(url);
        return true;
      } else if (url !== "") {
        toast.error(`Invalid relay URL: ${url}. Must start with wss://`);
        return false;
      }
      return true; // Allow empty string, just don't add it
    };

    let allValid = true;
    if (!validateAndAddRelay(relayInput1)) allValid = false;
    if (!validateAndAddRelay(relayInput2)) allValid = false;
    if (!validateAndAddRelay(relayInput3)) allValid = false;

    if (!allValid) return;

    if (newRelayUrls.length === 0) {
      toast.error("Please enter at least one valid relay URL.");
      return;
    }

    updateConfig((prevConfig) => ({ ...prevConfig, relayUrls: newRelayUrls }));
    toast.success("Relay URLs updated successfully!");
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex-grow flex items-center justify-center"> {/* Removed min-h-screen */}
      <AppRouter />
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 rounded-full shadow-lg z-50"
        onClick={() => setIsSettingsOpen(true)}
      >
        <Settings className="h-5 w-5" />
      </Button>

      <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>
              Choose your preferred relays.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="relayUrl1" className="text-right col-span-1">
                Relay 1
              </label>
              <Input
                id="relayUrl1"
                value={relayInput1}
                onChange={(e) => setRelayInput1(e.target.value)}
                className="col-span-3"
                placeholder="wss://nos.lol"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="relayUrl2" className="text-right col-span-1">
                Relay 2
              </label>
              <Input
                id="relayUrl2"
                value={relayInput2}
                onChange={(e) => setRelayInput2(e.target.value)}
                className="col-span-3"
                placeholder="wss://relay.primal.net"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="relayUrl3" className="text-right col-span-1">
                Relay 3
              </label>
              <Input
                id="relayUrl3"
                value={relayInput3}
                onChange={(e) => setRelayInput3(e.target.value)}
                className="col-span-3"
                placeholder="wss://your-custom-relay.com"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveRelay}>Save changes</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function App() {
  return (
    <UnheadProvider head={head}>
      <div className="flex flex-col min-h-screen"> {/* Added flex-col min-h-screen */}
        <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
          <QueryClientProvider client={queryClient}>
            <NostrLoginProvider storageKey='nostr:login'>
              <NostrProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Suspense>
                    <AppContent /> {/* Render AppContent here */}
                  </Suspense>
                </TooltipProvider>
              </NostrProvider>
            </NostrLoginProvider>
          </QueryClientProvider>
        </AppProvider>
        <div className="text-center text-xs text-muted-foreground mt-8 mb-4"> {/* Footer */}
          <p>
            Vibecoded with love by <a href="https://njump.me/yojimble@getalby.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#ff07a9' }}>Yojimble</a> using <a href="https://soapbox.pub/mkstack" target="_blank" rel="noopener noreferrer" className="underline">MKStack</a>
          </p>
        </div>
      </div>
    </UnheadProvider>
  );
}

export default App;
