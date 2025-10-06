import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { syncService, SyncStatus } from '@/lib/sync-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const OfflineIndicator = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: localStorage.getItem('lastSync'),
    pendingChanges: 0,
    isSyncing: false
  });

  useEffect(() => {
    const unsubscribe = syncService.addSyncListener(setSyncStatus);
    return unsubscribe;
  }, []);

  const handleSyncNow = async () => {
    if (syncStatus.isOnline && !syncStatus.isSyncing) {
      await syncService.syncAllData();
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Online/Offline Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {syncStatus.isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {syncStatus.isOnline 
                ? 'Connected to internet' 
                : 'Working offline - changes will sync when online'
              }
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Pending Changes Badge */}
        {syncStatus.pendingChanges > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                {syncStatus.pendingChanges} pending
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{syncStatus.pendingChanges} changes waiting to sync</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Sync Button */}
        {syncStatus.isOnline && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSyncNow}
                disabled={syncStatus.isSyncing || syncStatus.pendingChanges === 0}
                className="h-8 px-2"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                {syncStatus.isSyncing ? 'Syncing...' : 'Sync'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {syncStatus.isSyncing 
                  ? 'Syncing data...' 
                  : syncStatus.pendingChanges > 0 
                    ? 'Sync pending changes' 
                    : 'All data synced'
                }
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Last Sync Info */}
        {syncStatus.lastSync && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">
                Last sync: {formatLastSync(syncStatus.lastSync)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Last successful sync: {new Date(syncStatus.lastSync).toLocaleString()}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default OfflineIndicator;
