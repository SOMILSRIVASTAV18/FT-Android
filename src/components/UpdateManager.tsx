import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { APP_VERSION, BUILD_NUMBER, APK_URL, VERSION_CHECK_URL } from '../constants';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface VersionInfo {
  version: string;
  build: number;
  releaseNotes?: string;
  mandatory?: boolean;
}

export interface UpdateManagerHandle {
  checkForUpdates: (manual?: boolean) => Promise<void>;
}

export const UpdateManager = forwardRef<UpdateManagerHandle>((props, ref) => {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [localApkPath, setLocalApkPath] = useState<string | null>(null);

  const checkForUpdates = useCallback(async (manual = false) => {
    if (Capacitor.getPlatform() === 'web') {
      if (manual) toast.info('Updates are managed by the browser');
      return;
    }

    setIsChecking(true);
    try {
      // Use CapacitorHttp which provides a more robust native-backed fetch
      const options = {
        url: `${VERSION_CHECK_URL}?t=${Date.now()}`,
        headers: { 'Content-Type': 'application/json' },
      };

      const response = await CapacitorHttp.get(options);
      
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: Failed to reach update server`);
      }
      
      const data: VersionInfo = response.data;
      
      if (data && typeof data.build === 'number' && data.build > BUILD_NUMBER) {
        setUpdateInfo(data);
        setIsOpen(true);
      } else if (manual) {
        toast.success('App is up to date!', {
          description: `Current version: ${APP_VERSION} (Build ${BUILD_NUMBER})`
        });
      }
    } catch (error: any) {
      console.error('Update check failed:', error);
      if (manual) {
        toast.error('Update Check Failed', {
          description: error.message || 'The update server could not be reached. Please check your internet connection.'
        });
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    checkForUpdates
  }));

  useEffect(() => {
    checkForUpdates();
    const interval = setInterval(() => checkForUpdates(), 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdates]);

  const handleUpdate = async () => {
    if (Capacitor.getPlatform() === 'web') {
      window.open(APK_URL, '_blank');
      return;
    }

    if (isReadyToInstall && localApkPath) {
      try {
        await FileOpener.open({
          filePath: localApkPath,
          contentType: 'application/vnd.android.package-archive'
        });
      } catch (error: any) {
        toast.error('Installation failed', {
          description: 'Could not open the installer. Please try again.'
        });
      }
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const fileName = `FinTrackPro_update.apk`;
      
      // Step 1 & 2: Download the file directly to the filesystem using native bridge
      // This is much more reliable for APKs than browser fetch
      const downloadResult = await Filesystem.downloadFile({
        url: APK_URL,
        path: fileName,
        directory: Directory.Cache,
        // Filesystem.downloadFile supports progress tracking in some versions, 
        // but simple call is most reliable for now.
      });

      if (!downloadResult.path) {
        throw new Error('Download failed to save file');
      }

      setLocalApkPath(downloadResult.path);
      setDownloadProgress(100);
      setIsReadyToInstall(true);
      
      // Step 3: Trigger Install automatically
      await FileOpener.open({
        filePath: downloadResult.path,
        contentType: 'application/vnd.android.package-archive'
      });

      toast.success('Download complete', {
        description: 'Installation triggered. Please follow system prompts.'
      });

    } catch (error: any) {
      console.error('Update failed:', error);
      toast.error('Update Failed', {
        description: error.message || 'Check your connection and try again.'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={updateInfo?.mandatory ? undefined : (isDownloading ? undefined : setIsOpen)}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden glass p-0">
        <div className="absolute inset-0 bg-primary/5 -z-10 pointer-events-none" />
        
        <div className="p-8 space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-primary/10 rounded-[2rem] flex items-center justify-center animate-pulse shadow-inner relative">
              {isDownloading ? (
                <div className="relative flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-primary">
                    {downloadProgress}%
                  </span>
                </div>
              ) : isReadyToInstall ? (
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              ) : (
                <RefreshCw className="h-10 w-10 text-primary" />
              )}
            </div>
          </div>

          <DialogHeader className="text-center space-y-3">
            <DialogTitle className="text-3xl font-black tracking-tighter uppercase">
              {isReadyToInstall ? 'Ready to Install' : isDownloading ? 'Downloading...' : 'Update Available'}
            </DialogTitle>
            <DialogDescription className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">
              {isDownloading 
                ? 'Please wait while we fetch the latest version'
                : <>A new version of <span className="text-primary">FinTrack Pro</span> is ready.<br />{updateInfo?.version} (Build {updateInfo?.build})</>
              }
            </DialogDescription>
          </DialogHeader>

          {isDownloading && (
            <div className="space-y-2">
              <Progress value={downloadProgress} className="h-2 rounded-full" />
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                <span>Downloading Data</span>
                <span>{downloadProgress}%</span>
              </div>
            </div>
          )}

          {!isDownloading && updateInfo?.releaseNotes && (
            <div className="bg-white/40 dark:bg-black/20 p-5 rounded-3xl border border-white/20 shadow-sm max-h-[150px] overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2 flex items-center gap-2">
                <AlertCircle className="h-3 w-3" /> What's New
              </p>
              <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap dark:text-gray-300">
                {updateInfo.releaseNotes}
              </p>
            </div>
          )}

          <div className="grid gap-3 pt-2">
            <Button 
              className={cn(
                "h-14 rounded-2xl font-black text-lg shadow-xl transition-all hover:scale-[1.02] active:scale-95 group overflow-hidden relative",
                isDownloading ? "opacity-50 cursor-not-allowed" : "shadow-primary/20 bg-primary hover:bg-primary/90"
              )}
              onClick={handleUpdate}
              disabled={isDownloading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Downloading {downloadProgress}%
                </>
              ) : isReadyToInstall ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Install Now
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Update Now
                </>
              )}
            </Button>
            
            {!updateInfo?.mandatory && !isDownloading && (
              <Button 
                variant="ghost" 
                className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                onClick={() => setIsOpen(false)}
              >
                Later
              </Button>
            )}
          </div>
        </div>

        <div className="bg-primary/5 py-4 px-8 border-t border-primary/10 flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Latest Security patch included
          </p>
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
            <div className="h-1.5 w-4 rounded-full bg-primary" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
