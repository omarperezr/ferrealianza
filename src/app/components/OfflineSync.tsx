import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { flushOutbox, pendingCount, isOnline } from '../utils/dataStore';
import { toast } from 'sonner';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Watches connectivity, flushes queued offline changes when the connection
 * returns, and shows a small offline/pending indicator.
 */
export function OfflineSync() {
  const { accessToken } = useAuth();
  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = async () => setPending(await pendingCount());

  // Periodic tick: refresh the pending count and auto-retry queued changes
  // whenever we're online, so they sync on their own without a manual click.
  const tick = async () => {
    const n = await pendingCount();
    setPending(n);
    if (n > 0 && isOnline()) sync();
  };

  const sync = async () => {
    if (!accessToken || !isOnline() || syncing) return;
    setSyncing(true);
    try {
      const synced = await flushOutbox(accessToken);
      if (synced > 0) {
        toast.success(`${synced} cambio(s) sincronizado(s)`, { id: 'sync' });
      }
    } finally {
      setSyncing(false);
      await refreshPending();
    }
  };

  useEffect(() => {
    refreshPending();
    sync();

    const goOnline = () => {
      setOnline(true);
      sync();
    };
    const goOffline = () => {
      setOnline(false);
      toast.info('Sin conexión: trabajando en modo local', { id: 'net' });
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const interval = setInterval(tick, 5000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  if (online && pending === 0) return null;

  // Online with pending changes but not actively syncing => let the user retry.
  const idlePending = online && pending > 0 && !syncing;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        type="button"
        onClick={idlePending ? sync : undefined}
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg ${
          online ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-white'
        } ${idlePending ? 'cursor-pointer hover:brightness-95' : 'cursor-default'}`}
      >
        {online ? (
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
        {!online
          ? pending > 0
            ? `Sin conexión · ${pending} cambio(s) pendiente(s)`
            : 'Sin conexión · modo local'
          : syncing
            ? `Sincronizando ${pending} cambio(s)...`
            : `${pending} cambio(s) pendiente(s) · toca para reintentar`}
      </button>
    </div>
  );
}
