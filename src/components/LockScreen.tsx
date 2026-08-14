import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeService } from '../lib/native';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    try {
      const success = await NativeService.authenticate();
      if (success) {
        onUnlock();
      }
    } catch (error) {
      console.error('Authentication failed', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    handleAuthenticate();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6"
    >
      <div className="w-full max-w-xs space-y-12 text-center">
        <div className="space-y-4">
          <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto text-primary animate-pulse">
            <Lock className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight dark:text-white">FinTrack Pro</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px]">App is Locked</p>
          </div>
        </div>

        <div className="space-y-6">
          <Button 
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className="w-full h-16 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
          >
            <Fingerprint className="h-6 w-6" />
            {isAuthenticating ? 'Authenticating...' : 'Unlock App'}
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Biometric Security Active</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
