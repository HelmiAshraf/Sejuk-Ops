import { useEffect, useState } from 'react';
import { Download, X, Wind } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if already dismissed this session
    if (sessionStorage.getItem('pwa-install-dismissed')) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as any).standalone;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after a short delay
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setIsDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!show || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-sm mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Wind size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">Install SejukOps</p>
            {isIOS ? (
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                Tap <span className="font-medium text-blue-600">Share</span> then{' '}
                <span className="font-medium text-blue-600">Add to Home Screen</span> for the best experience.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                Install for quick access — works offline too.
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0 -mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        {!isIOS && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Download size={15} />
            Install App
          </button>
        )}
      </div>
    </div>
  );
}
