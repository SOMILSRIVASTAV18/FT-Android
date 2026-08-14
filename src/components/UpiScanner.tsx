import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { UserProfile, DEFAULT_CATEGORIES } from '../types';
import { db, collection, addDoc, doc, updateDoc, Timestamp, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  QrCode, 
  Camera, 
  Upload, 
  Check, 
  Copy, 
  Smartphone, 
  ArrowRight, 
  RefreshCw, 
  X, 
  Zap, 
  ZapOff,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Building2,
  AlertCircle,
  Search,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Edit2,
  Crop,
  ZoomIn,
  ZoomOut,
  Plus,
  Trash2,
  PlusCircle,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export interface CustomQrData {
  image?: string;
  label?: string;
  upiId?: string;
  payeeName?: string;
}

export interface QrAppInfo {
  id: string;
  name: string;
  tagline: string;
  accentColor: string;
  headerBg: string;
  badgeBg: string;
  qrBorder: string;
  upiId?: string;
  payeeName?: string;
  logo?: React.ReactNode;
}

export const getDefaultQrAppsForUser = (profile?: UserProfile | null): QrAppInfo[] => {
  const cleanName = profile?.displayName
    ? profile.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')
    : (profile?.email ? profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 'user');

  const userUpiId = (profile?.upiId && profile.upiId.trim() !== 'fintrackpro@nyes')
    ? profile.upiId.trim()
    : `${cleanName || 'user'}@upi`;
  const payeeName = profile?.displayName?.trim() || profile?.email?.split('@')[0] || 'FinTrack User';

  return [
    {
      id: 'primary_upi',
      name: 'Primary UPI QR',
      tagline: 'Scan & Pay with UPI',
      accentColor: 'from-blue-600 via-emerald-500 to-amber-500',
      headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white',
      badgeBg: 'bg-white/20 text-white',
      qrBorder: 'border-blue-500/40',
      upiId: userUpiId,
      payeeName: payeeName,
    }
  ];
};

export const QR_APPS: QrAppInfo[] = [
  {
    id: 'gpay',
    name: 'Google Pay',
    tagline: 'Scan & Pay with GPay',
    accentColor: 'from-blue-600 via-emerald-500 to-amber-500',
    headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white',
    badgeBg: 'bg-white/20 text-white',
    qrBorder: 'border-blue-500/40',
    logo: (
      <div className="flex items-center gap-1.5 font-black text-sm">
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Google Pay</span>
      </div>
    )
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    tagline: 'Scan & Pay with PhonePe',
    accentColor: 'from-purple-600 to-indigo-700',
    headerBg: 'bg-gradient-to-r from-purple-700 to-indigo-800 text-white',
    badgeBg: 'bg-white/20 text-white',
    qrBorder: 'border-purple-500/40',
    logo: (
      <div className="flex items-center gap-1.5 font-black text-sm">
        <div className="w-5 h-5 rounded-full bg-[#5f259f] text-white flex items-center justify-center text-[9px] font-black italic shrink-0">
          pe
        </div>
        <span>PhonePe</span>
      </div>
    )
  },
  {
    id: 'paytm',
    name: 'Paytm',
    tagline: 'Accepted Here via Paytm',
    accentColor: 'from-cyan-600 to-blue-800',
    headerBg: 'bg-gradient-to-r from-[#002E6E] to-[#00BAF2] text-white',
    badgeBg: 'bg-white/20 text-white',
    qrBorder: 'border-cyan-500/40',
    logo: (
      <div className="flex items-center gap-1.5 font-black text-sm">
        <span className="text-[10px] font-black text-[#00BAF2] bg-[#002E6E] px-1.5 py-0.5 rounded shrink-0">paytm</span>
        <span>Paytm QR</span>
      </div>
    )
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    tagline: 'Government Official NPCI QR',
    accentColor: 'from-orange-500 via-amber-500 to-emerald-600',
    headerBg: 'bg-gradient-to-r from-amber-600 via-orange-600 to-emerald-700 text-white',
    badgeBg: 'bg-white/20 text-white',
    qrBorder: 'border-orange-500/40',
    logo: (
      <div className="flex items-center gap-1.5 font-black text-sm">
        <span className="px-1.5 py-0.5 rounded bg-white text-orange-600 text-[10px] font-black shrink-0">BHIM</span>
        <span>BHIM NPCI</span>
      </div>
    )
  },
  {
    id: 'amazon',
    name: 'Amazon Pay',
    tagline: 'Scan using Amazon App',
    accentColor: 'from-amber-500 to-slate-900',
    headerBg: 'bg-gradient-to-r from-slate-900 to-amber-600 text-white',
    badgeBg: 'bg-white/20 text-white',
    qrBorder: 'border-amber-500/40',
    logo: (
      <div className="flex items-center gap-1.5 font-black text-sm text-amber-400">
        <span className="text-xs font-black tracking-widest uppercase">Amazon Pay</span>
      </div>
    )
  },
  {
    id: 'cred',
    name: 'CRED Pay',
    tagline: 'Scan with CRED for Rewards',
    accentColor: 'from-zinc-900 via-zinc-800 to-amber-500',
    headerBg: 'bg-gradient-to-r from-zinc-950 to-zinc-900 border-b border-amber-500/30 text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    qrBorder: 'border-amber-500/40',
    logo: (
      <div className="flex items-center gap-1.5 font-black text-sm tracking-widest text-amber-300">
        <span>C R E D</span>
      </div>
    )
  }
];

export interface UpiVerificationResult {
  isValid: boolean;
  vpa: string;
  handle: string;
  username: string;
  pspBank: string;
  accountType: 'Merchant / Business' | 'Personal / Individual';
  securityScore: number;
  checks: {
    formatValid: boolean;
    pspRecognized: boolean;
    secureHandle: boolean;
  };
  errorMessage?: string;
}

export function verifyUpiId(vpa: string, merchantCode?: string): UpiVerificationResult {
  const cleanVpa = (vpa || '').trim().toLowerCase();

  if (!cleanVpa || !cleanVpa.includes('@')) {
    return {
      isValid: false,
      vpa: cleanVpa,
      handle: '',
      username: cleanVpa,
      pspBank: 'Unknown Provider',
      accountType: 'Personal / Individual',
      securityScore: 0,
      checks: { formatValid: false, pspRecognized: false, secureHandle: false },
      errorMessage: 'UPI ID must contain an @ handle (e.g. name@upi)'
    };
  }

  const parts = cleanVpa.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      vpa: cleanVpa,
      handle: '',
      username: cleanVpa,
      pspBank: 'Unknown Provider',
      accountType: 'Personal / Individual',
      securityScore: 0,
      checks: { formatValid: false, pspRecognized: false, secureHandle: false },
      errorMessage: 'Multiple @ symbols found in UPI ID'
    };
  }

  const [username, handle] = parts;
  const usernameRegex = /^[a-zA-Z0-9.\-_]{2,256}$/;
  const handleRegex = /^[a-zA-Z0-9]{2,64}$/;

  const isFormatValid = usernameRegex.test(username) && handleRegex.test(handle);

  if (!isFormatValid) {
    return {
      isValid: false,
      vpa: cleanVpa,
      handle: `@${handle}`,
      username,
      pspBank: 'Invalid PSP',
      accountType: 'Personal / Individual',
      securityScore: 20,
      checks: { formatValid: false, pspRecognized: false, secureHandle: false },
      errorMessage: 'UPI ID contains invalid characters'
    };
  }

  // Known PSP Handle Mapping
  const handleLower = handle.toLowerCase();
  const pspMap: Record<string, string> = {
    'okicici': 'ICICI Bank (Google Pay)',
    'oksbi': 'State Bank of India (Google Pay)',
    'okaxis': 'Axis Bank (Google Pay)',
    'okhdfcbank': 'HDFC Bank (Google Pay)',
    'ybl': 'Yes Bank (PhonePe)',
    'ibl': 'IndusInd Bank (PhonePe)',
    'axl': 'Axis Bank (PhonePe)',
    'paytm': 'Paytm Payments Bank',
    'sbi': 'State Bank of India',
    'upi': 'BHIM NPCI',
    'bhim': 'BHIM NPCI',
    'apl': 'Amazon Pay (Axis Bank)',
    'barodampay': 'Bank of Baroda',
    'idfcbank': 'IDFC FIRST Bank',
    'aubank': 'AU Small Finance Bank',
    'kotak': 'Kotak Mahindra Bank',
    'indus': 'IndusInd Bank',
    'postbank': 'India Post Payments Bank',
    'federal': 'Federal Bank',
    'rbl': 'RBL Bank',
    'slice': 'Slice (North East Small Finance Bank)',
    'cred': 'CRED (Axis Bank)',
    'jupiteraxis': 'Jupiter (Axis Bank)',
    'fi': 'Fi Money (Federal Bank)',
    'navi': 'Navi (Karnataka Bank)',
    'nyes' : 'Navi',
    'freecharge': 'Freecharge (Axis Bank)',
    'mobi': 'Mobikwik (HDFC Bank)',
    'pnb': 'Punjab National Bank',
    'unionbank': 'Union Bank of India',
    'canarabank': 'Canara Bank',
    'dlb': 'Dhanlaxmi Bank',
    'icici': 'ICICI Bank'
  };

  const pspBank = pspMap[handleLower] || `${handle.toUpperCase()} Provider Bank`;
  const pspRecognized = !!pspMap[handleLower];

  const isMerchant = !!merchantCode || /^\d{10,12}$/.test(username) || ['paytm', 'okicici', 'ybl'].includes(handleLower) && username.toLowerCase().includes('store');
  const accountType = (isMerchant || merchantCode) ? 'Merchant / Business' : 'Personal / Individual';

  let securityScore = 70;
  if (isFormatValid) securityScore += 15;
  if (pspRecognized) securityScore += 15;

  return {
    isValid: true,
    vpa: cleanVpa,
    handle: `@${handle}`,
    username,
    pspBank,
    accountType,
    securityScore: Math.min(securityScore, 100),
    checks: {
      formatValid: true,
      pspRecognized,
      secureHandle: true
    }
  };
}
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

export interface UpiData {
  pa: string; // VPA / UPI ID
  pn: string; // Payee Name
  am: string; // Amount
  cu: string; // Currency
  tn: string; // Transaction note
  mc?: string;
  tr?: string;
  rawUrl: string;
}

interface UpiScannerProps {
  profile: UserProfile;
  onPaymentComplete?: () => void;
}

export function UpiScanner({ profile, onPaymentComplete }: UpiScannerProps) {
  // Step in the flow: 'scan' -> 'amount' (if no amount in QR) -> 'select_app'
  const [step, setStep] = useState<'scan' | 'amount' | 'select_app'>('scan');
  
  // Camera & Scan modes
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(true);

  // Parsed UPI Data
  const [upiData, setUpiData] = useState<UpiData | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('Payment via FinTrack');
  const [payeeName, setPayeeName] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [manualVpaInput, setManualVpaInput] = useState<string>('');
  
  // Flip card & App QRs carousel state
  const [isFlipped, setIsFlipped] = useState(false);

  // QR Serializers to avoid non-serializable objects (JSX logos) in Firestore
  const serializeQrAppsForStorage = (apps: QrAppInfo[]) => {
    return apps.map(app => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { logo, ...rest } = app;
      return rest;
    });
  };

  const restoreQrAppsWithLogos = (rawApps: any[], prof?: UserProfile | null): QrAppInfo[] => {
    const currentProf = prof || profile;
    if (!Array.isArray(rawApps) || rawApps.length === 0) {
      return getDefaultQrAppsForUser(currentProf);
    }

    const cleanName = currentProf?.displayName
      ? currentProf.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')
      : (currentProf?.email ? currentProf.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 'user');
    const defaultUserUpi = (currentProf?.upiId && currentProf.upiId.trim() !== 'fintrackpro@nyes')
      ? currentProf.upiId.trim()
      : `${cleanName || 'user'}@upi`;
    const defaultPayeeName = currentProf?.displayName?.trim() || currentProf?.email?.split('@')[0] || 'FinTrack User';

    return rawApps.map(app => {
      const presetMatch = QR_APPS.find(p => p.id === app.id || (typeof app.id === 'string' && app.id.startsWith(p.id + '_')));
      
      let appUpi = app.upiId;
      if (!appUpi || appUpi === 'fintrackpro@nyes') {
        if (app.id === 'primary_upi') {
          appUpi = defaultUserUpi;
        } else if (app.id.startsWith('gpay')) {
          appUpi = `${cleanName}@okaxis`;
        } else if (app.id.startsWith('phonepe')) {
          appUpi = `${cleanName}@ybl`;
        } else if (app.id.startsWith('paytm')) {
          appUpi = `${cleanName}@paytm`;
        } else if (app.id.startsWith('bhim')) {
          appUpi = `${cleanName}@upi`;
        } else if (app.id.startsWith('amazon')) {
          appUpi = `${cleanName}@apl`;
        } else if (app.id.startsWith('cred')) {
          appUpi = `${cleanName}@cred`;
        } else {
          appUpi = defaultUserUpi;
        }
      }

      let appPayee = app.payeeName;
      if (!appPayee || appPayee === 'FinTrack Pro' || appPayee === 'FinTrack User') {
        appPayee = defaultPayeeName;
      }

      return {
        ...app,
        upiId: appUpi,
        payeeName: appPayee,
        logo: presetMatch?.logo
      };
    });
  };

  // Cloud Firestore persistence helper
  const persistQrDataToCloud = async (appsToSave: QrAppInfo[], customMapToSave: Record<string, CustomQrData>, extraUserFields?: Record<string, any>) => {
    if (!profile?.uid) return;
    try {
      const cleanApps = serializeQrAppsForStorage(appsToSave);
      await updateDoc(doc(db, 'users', profile.uid), {
        customQrApps: cleanApps,
        customAppQrs: customMapToSave,
        ...(extraUserFields || {})
      });
    } catch (err) {
      console.error('Failed to sync QR configurations to Firestore:', err);
    }
  };

  // Dynamic list of QR apps strictly scoped per user
  const [qrApps, setQrApps] = useState<QrAppInfo[]>(() => {
    try {
      if (profile?.uid) {
        const saved = localStorage.getItem(`fintrack_qr_apps_list_${profile.uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return restoreQrAppsWithLogos(parsed, profile);
        }
      }
    } catch {}
    return getDefaultQrAppsForUser(profile);
  });

  const updateQrAppsList = (newList: QrAppInfo[], customMapToSync?: Record<string, CustomQrData>, extraFields?: Record<string, any>) => {
    setQrApps(newList);
    const cleanApps = serializeQrAppsForStorage(newList);
    try {
      if (profile?.uid) {
        localStorage.setItem(`fintrack_qr_apps_list_${profile.uid}`, JSON.stringify(cleanApps));
      }
    } catch {}
    persistQrDataToCloud(newList, customMapToSync || customAppQrs, extraFields);
  };

  const [activeQrAppIndex, setActiveQrAppIndex] = useState(0);
  const [myQrAmount, setMyQrAmount] = useState('');
  const [isEditingVpa, setIsEditingVpa] = useState(false);

  // Custom uploaded QR details store for each app (image data, separate upiId, custom label, and payeeName)
  const [customAppQrs, setCustomAppQrs] = useState<Record<string, CustomQrData>>(() => {
    try {
      if (profile?.uid) {
        const saved = localStorage.getItem(`fintrack_custom_qr_images_${profile.uid}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          const normalized: Record<string, CustomQrData> = {};
          Object.keys(parsed).forEach(key => {
            if (typeof parsed[key] === 'string') {
              normalized[key] = { image: parsed[key] };
            } else if (parsed[key] && typeof parsed[key] === 'object') {
              normalized[key] = {
                image: parsed[key].image || '',
                label: parsed[key].label,
                upiId: parsed[key].upiId,
                payeeName: parsed[key].payeeName,
              };
            }
          });
          return normalized;
        }
      }
    } catch {}
    return {};
  });

  // Sync profile customQrApps and customAppQrs from Firestore strictly isolated per user
  useEffect(() => {
    // Purge any stale legacy unscoped keys that previously leaked data across users
    try {
      localStorage.removeItem('fintrack_qr_apps_list');
      localStorage.removeItem('fintrack_custom_qr_images');
    } catch {}

    if (!profile?.uid) return;

    let currentApps: QrAppInfo[];
    let currentCustom = customAppQrs;

    // Check if Firestore has saved customQrApps for this specific user
    if (profile.customQrApps && Array.isArray(profile.customQrApps) && profile.customQrApps.length > 0) {
      const restored = restoreQrAppsWithLogos(profile.customQrApps, profile);
      currentApps = restored;
      setQrApps(restored);
      try {
        localStorage.setItem(`fintrack_qr_apps_list_${profile.uid}`, JSON.stringify(serializeQrAppsForStorage(restored)));
      } catch {}
    } else {
      // Check user-scoped localStorage
      try {
        const localSaved = localStorage.getItem(`fintrack_qr_apps_list_${profile.uid}`);
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const restored = restoreQrAppsWithLogos(parsed, profile);
            currentApps = restored;
            setQrApps(restored);
            persistQrDataToCloud(restored, currentCustom);
          } else {
            const defaultApps = getDefaultQrAppsForUser(profile);
            currentApps = defaultApps;
            setQrApps(defaultApps);
            persistQrDataToCloud(defaultApps, currentCustom);
          }
        } else {
          const defaultApps = getDefaultQrAppsForUser(profile);
          currentApps = defaultApps;
          setQrApps(defaultApps);
          persistQrDataToCloud(defaultApps, currentCustom);
        }
      } catch {
        const defaultApps = getDefaultQrAppsForUser(profile);
        currentApps = defaultApps;
        setQrApps(defaultApps);
      }
    }

    // Check if Firestore has saved customAppQrs for this specific user
    if (profile.customAppQrs && typeof profile.customAppQrs === 'object' && Object.keys(profile.customAppQrs).length > 0) {
      currentCustom = profile.customAppQrs;
      setCustomAppQrs(profile.customAppQrs);
      try {
        localStorage.setItem(`fintrack_custom_qr_images_${profile.uid}`, JSON.stringify(profile.customAppQrs));
      } catch {}
    } else {
      try {
        const localSaved = localStorage.getItem(`fintrack_custom_qr_images_${profile.uid}`);
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            currentCustom = parsed;
            setCustomAppQrs(parsed);
            persistQrDataToCloud(currentApps, parsed);
          }
        }
      } catch {}
    }
  }, [profile?.uid, profile?.customQrApps, profile?.customAppQrs, profile?.upiId, profile?.displayName]);

  // Helpers to get separate data per QR App
  const getQrUpiId = (app?: QrAppInfo): string => {
    if (!app) return '';
    const custom = customAppQrs[app.id];
    if (custom?.upiId && custom.upiId.trim() && custom.upiId.trim() !== 'fintrackpro@nyes') {
      return custom.upiId.trim();
    }
    if (app.upiId && app.upiId.trim() && app.upiId.trim() !== 'fintrackpro@nyes') {
      return app.upiId.trim();
    }

    const cleanName = profile?.displayName
      ? profile.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')
      : (profile?.email ? profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 'user');

    if (profile?.upiId && profile.upiId.trim() && profile.upiId.trim() !== 'fintrackpro@nyes') {
      return profile.upiId.trim();
    }

    if (app.id === 'primary_upi') {
      return `${cleanName || 'user'}@upi`;
    }
    if (app.id.startsWith('gpay')) return `${cleanName || 'user'}@okaxis`;
    if (app.id.startsWith('phonepe')) return `${cleanName || 'user'}@ybl`;
    if (app.id.startsWith('paytm')) return `${cleanName || 'user'}@paytm`;
    if (app.id.startsWith('bhim')) return `${cleanName || 'user'}@upi`;
    if (app.id.startsWith('amazon')) return `${cleanName || 'user'}@apl`;
    if (app.id.startsWith('cred')) return `${cleanName || 'user'}@cred`;

    return `${cleanName || 'user'}@upi`;
  };

  const getQrPayeeName = (app?: QrAppInfo): string => {
    const defaultName = profile?.displayName?.trim() || profile?.email?.split('@')[0] || 'FinTrack User';
    if (!app) return defaultName;
    const custom = customAppQrs[app.id];
    if (custom?.payeeName && custom.payeeName.trim() && custom.payeeName.trim() !== 'FinTrack Pro') return custom.payeeName.trim();
    if (app.payeeName && app.payeeName.trim() && app.payeeName.trim() !== 'FinTrack Pro') return app.payeeName.trim();
    return defaultName;
  };

  const getQrLabel = (app?: QrAppInfo): string => {
    if (!app) return 'UPI QR';
    const custom = customAppQrs[app.id];
    if (custom?.label && custom.label.trim()) return custom.label.trim();
    return app.name;
  };

  // Update specific QR details independently
  const updateQrDetails = (appId: string, updates: { upiId?: string; payeeName?: string; label?: string; image?: string }) => {
    const current = customAppQrs[appId] || {};
    const updatedData: CustomQrData = {
      ...current,
      ...updates
    };
    const updatedMap: Record<string, CustomQrData> = {
      ...customAppQrs,
      [appId]: updatedData
    };
    setCustomAppQrs(updatedMap);
    try {
      if (profile?.uid) {
        localStorage.setItem(`fintrack_custom_qr_images_${profile.uid}`, JSON.stringify(updatedMap));
      }
    } catch {}

    const updatedApps = qrApps.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          ...(updates.label !== undefined ? { name: updates.label } : {}),
          ...(updates.upiId !== undefined ? { upiId: updates.upiId } : {}),
          ...(updates.payeeName !== undefined ? { payeeName: updates.payeeName } : {})
        };
      }
      return a;
    });
    setQrApps(updatedApps);
    const cleanApps = serializeQrAppsForStorage(updatedApps);
    try {
      if (profile?.uid) {
        localStorage.setItem(`fintrack_qr_apps_list_${profile.uid}`, JSON.stringify(cleanApps));
      }
    } catch {}

    // If updating primary_upi, also update profile.upiId directly in Firestore for consistency
    const extraUserFields: Record<string, any> = {};
    if (appId === 'primary_upi' && updates.upiId) {
      extraUserFields.upiId = updates.upiId.trim();
    }

    persistQrDataToCloud(updatedApps, updatedMap, extraUserFields);
  };

  // Add QR Dialog State
  const [addQrDialogOpen, setAddQrDialogOpen] = useState(false);
  const [newQrNameInput, setNewQrNameInput] = useState('');
  const [newQrVpaInput, setNewQrVpaInput] = useState('');

  const handleAddNewQr = () => {
    const name = newQrNameInput.trim();
    const upi = newQrVpaInput.trim();
    if (!name) {
      toast.error('Please enter a name or label for the QR code.');
      return;
    }
    const newId = 'qr_' + Date.now();
    const newApp: QrAppInfo = {
      id: newId,
      name: name,
      tagline: 'Custom QR Code',
      accentColor: 'from-blue-600 to-indigo-600',
      headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white',
      badgeBg: 'bg-white/20 text-white',
      qrBorder: 'border-primary/40',
      upiId: upi || undefined,
      payeeName: profile?.displayName || 'FinTrack User',
    };

    const updatedApps = [...qrApps, newApp];
    const updatedCustomQrs: Record<string, CustomQrData> = {
      ...customAppQrs,
      [newId]: {
        image: '',
        label: name,
        upiId: upi || undefined,
        payeeName: profile?.displayName || 'FinTrack User',
      }
    };

    setQrApps(updatedApps);
    setCustomAppQrs(updatedCustomQrs);

    try {
      const cleanApps = serializeQrAppsForStorage(updatedApps);
      if (profile?.uid) {
        localStorage.setItem(`fintrack_qr_apps_list_${profile.uid}`, JSON.stringify(cleanApps));
        localStorage.setItem(`fintrack_custom_qr_images_${profile.uid}`, JSON.stringify(updatedCustomQrs));
      }
    } catch {}

    persistQrDataToCloud(updatedApps, updatedCustomQrs);

    setAddQrDialogOpen(false);
    setNewQrNameInput('');
    setNewQrVpaInput('');
    setActiveQrAppIndex(updatedApps.length - 1);
    toast.success(`Added QR "${name}" with separate UPI ID!`);
  };

  const handleAddPresetQr = (preset: QrAppInfo) => {
    const newId = `${preset.id}_${Date.now()}`;
    const cleanName = profile?.displayName
      ? profile.displayName.toLowerCase().replace(/[^a-z0-9]/g, '')
      : (profile?.email ? profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 'user');
    const defaultVpa = `${cleanName || 'user'}@${
      preset.id === 'gpay' ? 'okaxis' :
      preset.id === 'phonepe' ? 'ybl' :
      preset.id === 'paytm' ? 'paytm' :
      preset.id === 'bhim' ? 'upi' :
      preset.id === 'amazon' ? 'apl' : 'cred'
    }`;
    const newApp: QrAppInfo = {
      ...preset,
      id: newId,
      upiId: defaultVpa,
      payeeName: profile?.displayName || profile?.email?.split('@')[0] || 'FinTrack User',
    };
    const updatedApps = [...qrApps, newApp];
    const updatedCustomQrs: Record<string, CustomQrData> = {
      ...customAppQrs,
      [newId]: {
        image: '',
        label: preset.name,
        upiId: defaultVpa,
        payeeName: profile?.displayName || profile?.email?.split('@')[0] || 'FinTrack User',
      }
    };

    setQrApps(updatedApps);
    setCustomAppQrs(updatedCustomQrs);

    try {
      const cleanApps = serializeQrAppsForStorage(updatedApps);
      if (profile?.uid) {
        localStorage.setItem(`fintrack_qr_apps_list_${profile.uid}`, JSON.stringify(cleanApps));
        localStorage.setItem(`fintrack_custom_qr_images_${profile.uid}`, JSON.stringify(updatedCustomQrs));
      }
    } catch {}

    persistQrDataToCloud(updatedApps, updatedCustomQrs);

    setActiveQrAppIndex(updatedApps.length - 1);
    toast.success(`Added ${preset.name} with separate UPI ID "${defaultVpa}"`);
  };

  const handleDeleteCurrentQr = () => {
    if (qrApps.length <= 1) {
      toast.error('You must keep at least one QR code.');
      return;
    }
    const activeApp = qrApps[activeQrAppIndex] || qrApps[0];
    const newApps = qrApps.filter((_, idx) => idx !== activeQrAppIndex);
    updateQrAppsList(newApps);
    setActiveQrAppIndex(prev => Math.max(0, prev - 1));
    toast.success(`Deleted "${activeApp.name}" QR`);
  };

  // Image Crop Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageToCrop, setRawImageToCrop] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropPan, setCropPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [qrCustomLabelInput, setQrCustomLabelInput] = useState<string>('');
  
  // Modal title editing for active QR
  const [editingTitleForApp, setEditingTitleForApp] = useState<boolean>(false);
  const [tempTitleInput, setTempTitleInput] = useState<string>('');

  const customQrInputRef = useRef<HTMLInputElement>(null);

  const handleCustomQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    let targetApp = qrApps[activeQrAppIndex];
    if (!targetApp || activeQrAppIndex >= qrApps.length) {
      const newId = 'qr_' + Date.now();
      const newName = `Custom QR ${qrApps.length + 1}`;
      targetApp = {
        id: newId,
        name: newName,
        tagline: 'Custom QR Code',
        accentColor: 'from-blue-600 to-indigo-600',
        headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white',
        badgeBg: 'bg-white/20 text-white',
        qrBorder: 'border-primary/40',
        payeeName: profile?.displayName || 'FinTrack User',
      };
      const updatedApps = [...qrApps, targetApp];
      updateQrAppsList(updatedApps);
      setActiveQrAppIndex(updatedApps.length - 1);
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        const appKey = targetApp.id;
        const existingLabel = customAppQrs[appKey]?.label || targetApp.name || '';
        
        setRawImageToCrop(reader.result as string);
        setCropZoom(1);
        setCropPan({ x: 0, y: 0 });
        setQrCustomLabelInput(existingLabel);
        setCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveCroppedImage = (croppedBase64: string) => {
    const activeApp = qrApps[activeQrAppIndex] || qrApps[0];
    const appKey = activeApp.id;
    const existing = customAppQrs[appKey] || {};
    const updated: Record<string, CustomQrData> = {
      ...customAppQrs,
      [appKey]: {
        ...existing,
        image: croppedBase64,
        label: qrCustomLabelInput.trim() || existing.label || activeApp.name || undefined
      }
    };
    setCustomAppQrs(updated);
    try {
      if (profile?.uid) {
        localStorage.setItem(`fintrack_custom_qr_images_${profile.uid}`, JSON.stringify(updated));
      }
    } catch {}
    persistQrDataToCloud(qrApps, updated);
    setCropModalOpen(false);
    setRawImageToCrop(null);
    toast.success(`Custom ${activeApp.name} QR saved!`);
  };

  const removeCustomQr = (appId: string) => {
    const existing = customAppQrs[appId] || {};
    const updated: Record<string, CustomQrData> = {
      ...customAppQrs,
      [appId]: {
        ...existing,
        image: ''
      }
    };
    setCustomAppQrs(updated);
    try {
      if (profile?.uid) {
        localStorage.setItem(`fintrack_custom_qr_images_${profile.uid}`, JSON.stringify(updated));
      }
    } catch {}
    persistQrDataToCloud(qrApps, updated);
    toast.success('Reset to standard generated QR code');
  };

  const saveQrCustomLabel = (label: string) => {
    const activeApp = qrApps[activeQrAppIndex] || qrApps[0];
    const appKey = activeApp.id;
    updateQrDetails(appKey, { label: label.trim() || undefined });
    setEditingTitleForApp(false);
    toast.success('QR Code label updated!');
  };

  // Verification State
  const [verification, setVerification] = useState<UpiVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Transaction auto-logging options
  const [category, setCategory] = useState<string>('Shopping');
  const [paymentMode, setPaymentMode] = useState<string>('UPI');
  const [autoRecord, setAutoRecord] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasHandledScanRef = useRef<boolean>(false);

  const currencySymbol = profile?.settings?.currency || '₹';

  // Helper to parse UPI URI / URL
  const parseUpiUrl = (qrString: string): UpiData | null => {
    if (!qrString) return null;
    const cleanStr = qrString.trim();

    try {
      let urlStr = cleanStr;
      if (cleanStr.toLowerCase().startsWith('upi://') || cleanStr.toLowerCase().includes('pa=')) {
        if (!urlStr.toLowerCase().startsWith('upi://')) {
          urlStr = 'upi://pay?' + urlStr;
        } else if (!urlStr.toLowerCase().startsWith('upi://pay?')) {
          urlStr = urlStr.replace(/^upi:\/\/?/i, 'upi://pay?');
        }

        const url = new URL(urlStr);
        const params = new URLSearchParams(url.search);

        const pa = params.get('pa') || params.get('PA') || '';
        const pn = params.get('pn') || params.get('PN') || pa.split('@')[0] || 'Merchant';
        const am = params.get('am') || params.get('AM') || '';
        const cu = params.get('cu') || params.get('CU') || 'INR';
        const tn = params.get('tn') || params.get('TN') || params.get('note') || 'Payment';
        const mc = params.get('mc') || params.get('MC') || undefined;
        const tr = params.get('tr') || params.get('TR') || undefined;

        if (pa) {
          return {
            pa: pa.trim(),
            pn: decodeURIComponent(pn).trim(),
            am: am.trim(),
            cu: cu.trim(),
            tn: decodeURIComponent(tn).trim(),
            mc,
            tr,
            rawUrl: cleanStr
          };
        }
      }

      // Check if raw string is a VPA handle e.g. name@upi or phone@paytm
      const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (vpaRegex.test(cleanStr)) {
        return {
          pa: cleanStr,
          pn: cleanStr.split('@')[0],
          am: '',
          cu: 'INR',
          tn: 'Payment',
          rawUrl: `upi://pay?pa=${cleanStr}`
        };
      }

      // Fallback regex matching for pa=
      const paMatch = cleanStr.match(/pa=([a-zA-Z0-9.\-_]+@[a-zA-Z]+)/i);
      if (paMatch && paMatch[1]) {
        const pa = paMatch[1];
        const pnMatch = cleanStr.match(/pn=([^&]+)/i);
        const amMatch = cleanStr.match(/am=([0-9.]+)/i);
        const tnMatch = cleanStr.match(/tn=([^&]+)/i);

        return {
          pa,
          pn: pnMatch ? decodeURIComponent(pnMatch[1]) : pa.split('@')[0],
          am: amMatch ? amMatch[1] : '',
          cu: 'INR',
          tn: tnMatch ? decodeURIComponent(tnMatch[1]) : 'Payment',
          rawUrl: cleanStr
        };
      }
    } catch (err) {
      console.error('Failed to parse UPI URL:', err);
    }

    return null;
  };

  const handleScanSuccess = (decodedText: string) => {
    if (hasHandledScanRef.current) return;
    hasHandledScanRef.current = true;

    stopCamera();
    toast.dismiss();

    const parsed = parseUpiUrl(decodedText);
    if (parsed) {
      const vRes = verifyUpiId(parsed.pa, parsed.mc);
      setVerification(vRes);
      setUpiData(parsed);
      setUpiId(parsed.pa);
      setPayeeName(parsed.pn);
      setNote(parsed.tn || 'Payment via FinTrack');

      // Check if amount is pre-filled in QR
      if (parsed.am && parseFloat(parsed.am) > 0) {
        setAmount(parsed.am);
        setStep('select_app'); // Skip amount step, directly go to available apps screen
        toast.success(`Verified: ${parsed.pn}`, {
          description: `Provider: ${vRes.pspBank} • Amount: ${currencySymbol}${parsed.am}`,
          id: 'upi-scan-toast',
          duration: 2000
        });
      } else {
        setAmount('');
        setStep('amount'); // Show simple screen to enter amount
        toast.success(`Verified: ${parsed.pn}`, {
          description: `Provider: ${vRes.pspBank} • Enter payment amount`,
          id: 'upi-scan-toast',
          duration: 2000
        });
      }
    } else {
      toast.error('Invalid UPI QR code', {
        description: 'The scanned code is not a valid UPI payment handle.',
        id: 'upi-scan-toast',
        duration: 2000
      });
      setTimeout(() => {
        hasHandledScanRef.current = false;
        if (scanMode === 'camera') startCamera();
      }, 2000);
    }
  };

  // Forcefully stop and release any active browser MediaStream tracks to prevent camera hardware locks
  const releaseHardwareMediaTracks = () => {
    try {
      const videoElements = document.querySelectorAll('#upi-qr-reader video, video');
      videoElements.forEach((el) => {
        const videoElem = el as HTMLVideoElement;
        if (videoElem && videoElem.srcObject instanceof MediaStream) {
          videoElem.srcObject.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {}
          });
          videoElem.srcObject = null;
        }
      });
    } catch (e) {
      console.warn('Error releasing hardware tracks:', e);
    }
  };

  const stopCamera = async () => {
    setIsTorchOn(false);
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner instance:', e);
      }
      scannerRef.current = null;
    }
    releaseHardwareMediaTracks();
    const readerDom = document.getElementById('upi-qr-reader');
    if (readerDom) {
      readerDom.innerHTML = '';
    }
    setIsScanning(false);
  };

  const startCamera = async (overrideCameraId?: string) => {
    hasHandledScanRef.current = false;
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      // If already scanning or instance active, cleanly tear down
      if (scannerRef.current) {
        await stopCamera();
      }

      const readerContainer = document.getElementById('upi-qr-reader');
      if (!readerContainer) {
        setIsStartingCamera(false);
        return;
      }
      readerContainer.innerHTML = '';

      const html5Qrcode = new Html5Qrcode('upi-qr-reader', false);
      scannerRef.current = html5Qrcode;

      const config = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.floor(minEdge * 0.85);
          return {
            width: Math.max(boxSize, 180),
            height: Math.max(boxSize, 180)
          };
        },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false
        }
      };

      // Direct, instantaneous launch with standard facingMode or direct camera ID
      const cameraConstraint = overrideCameraId || { facingMode: facingMode };
      await html5Qrcode.start(
        cameraConstraint,
        config,
        (decodedText) => handleScanSuccess(decodedText),
        () => {}
      );

      // Asynchronous background device enumeration for multi-lens toggle without blocking camera start
      Html5Qrcode.getCameras().then((cams) => {
        if (Array.isArray(cams) && cams.length > 0) {
          setAvailableCameras(cams);
        }
      }).catch(() => {});

      setIsScanning(true);
      setIsTorchOn(false);

      // Check for torch capability after camera stream initializes
      setTimeout(() => {
        try {
          const videoElem = document.querySelector('#upi-qr-reader video') as HTMLVideoElement | null;
          if (videoElem && videoElem.srcObject instanceof MediaStream) {
            const track = videoElem.srcObject.getVideoTracks()[0];
            const caps = (track && typeof track.getCapabilities === 'function') ? (track.getCapabilities() as any) : null;
            if (caps && 'torch' in caps) {
              setIsTorchSupported(true);
            } else {
              setIsTorchSupported(facingMode === 'environment');
            }
          }
        } catch {
          setIsTorchSupported(facingMode === 'environment');
        }
      }, 500);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsScanning(false);
      let errorMessage = 'Failed to access camera.';
      const errStr = String(err?.message || err?.name || err || '').toLowerCase();
      if (errStr.includes('notallowed') || errStr.includes('permission') || errStr.includes('denied')) {
        errorMessage = 'Camera permission is blocked. Tap the lock/tune icon in your browser address bar to allow Camera access.';
      } else if (errStr.includes('notfound') || errStr.includes('device not found')) {
        errorMessage = 'No camera hardware found on this device. You can upload a QR image from your gallery instead.';
      } else if (errStr.includes('notreadable') || errStr.includes('in use') || errStr.includes('busy') || errStr.includes('could not start')) {
        errorMessage = 'Camera is currently locked or in use by another app/tab. Please close other camera apps and tap Retry.';
      } else {
        errorMessage = err?.message || 'Unable to start camera stream. Tap Retry or switch camera lens.';
      }
      setCameraError(errorMessage);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const toggleTorch = async () => {
    try {
      const nextState = !isTorchOn;
      let applied = false;

      // Method 1: HTML5 video element track constraint
      const videoElem = document.querySelector('#upi-qr-reader video') as HTMLVideoElement | null;
      if (videoElem && videoElem.srcObject instanceof MediaStream) {
        const track = videoElem.srcObject.getVideoTracks()[0];
        if (track) {
          await track.applyConstraints({
            advanced: [{ torch: nextState } as any]
          });
          applied = true;
        }
      }

      // Method 2: Html5Qrcode video constraints fallback
      if (!applied && scannerRef.current && (scannerRef.current as any).applyVideoConstraints) {
        try {
          await (scannerRef.current as any).applyVideoConstraints({
            advanced: [{ torch: nextState }]
          });
          applied = true;
        } catch {}
      }

      setIsTorchOn(nextState);
      if (nextState) {
        toast.success('Flashlight turned ON', { id: 'torch-status-toast', duration: 1500 });
      } else {
        toast.info('Flashlight turned OFF', { id: 'torch-status-toast', duration: 1500 });
      }
    } catch (err) {
      console.warn('Torch not supported or permission denied:', err);
      toast.error('Flashlight / Torch is not supported on this device camera.', {
        id: 'torch-status-toast',
        duration: 2000
      });
    }
  };

  useEffect(() => {
    if (step === 'scan' && scanMode === 'camera' && !isFlipped) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [step, scanMode, facingMode, isFlipped]);

  const toggleCameraFacing = () => {
    setIsTorchOn(false);
    // If we have more than 2 cameras, cycle through them
    if (availableCameras.length > 2) {
      const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      const nextCam = availableCameras[nextIndex];
      setSelectedCameraId(nextCam.id);
      startCamera(nextCam.id);
      toast.info(`Switched to ${nextCam.label || `Camera ${nextIndex + 1}`}`, { duration: 1500 });
    } else {
      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
      setSelectedCameraId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5Qrcode = new Html5Qrcode('upi-qr-reader-file-temp');
      const decodedText = await html5Qrcode.scanFile(file, true);
      html5Qrcode.clear();
      handleScanSuccess(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      toast.error('Could not read QR code from image', {
        description: 'Please select an image containing a clear UPI QR code.'
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualVpaInput) {
      toast.error('Please enter a valid UPI ID (VPA)');
      return;
    }

    const vRes = verifyUpiId(manualVpaInput);
    setVerification(vRes);

    if (!vRes.isValid) {
      toast.error('Invalid UPI VPA Format', {
        description: vRes.errorMessage || 'Please check for missing @ handle or invalid characters.'
      });
      return;
    }

    const parsed = parseUpiUrl(manualVpaInput);
    if (parsed) {
      setUpiData(parsed);
      setUpiId(parsed.pa);
      setPayeeName(parsed.pn);
      setNote(parsed.tn || 'Payment via FinTrack');
      
      toast.success(`Verified: ${parsed.pa}`, {
        description: `Provider: ${vRes.pspBank}`
      });

      if (parsed.am && parseFloat(parsed.am) > 0) {
        setAmount(parsed.am);
        setStep('select_app');
      } else {
        setAmount('');
        setStep('amount');
      }
    } else {
      toast.error('Invalid UPI format', {
        description: 'Example format: merchant@upi or 9876543210@paytm'
      });
    }
  };

  const constructFinalUpiUrl = (): string => {
    const cleanPa = upiId.trim();
    const cleanPn = encodeURIComponent(payeeName.trim() || cleanPa.split('@')[0]);
    const cleanAm = amount ? parseFloat(amount).toFixed(2) : '';
    const cleanTn = encodeURIComponent(note.trim() || 'Payment');

    let queryString = `pa=${cleanPa}&pn=${cleanPn}&cu=INR&tn=${cleanTn}`;
    if (cleanAm && parseFloat(cleanAm) > 0) {
      queryString += `&am=${cleanAm}`;
    }
    if (upiData?.mc) {
      queryString += `&mc=${upiData.mc}`;
    }
    if (upiData?.tr) {
      queryString += `&tr=${upiData.tr}`;
    }

    return `upi://pay?${queryString}`;
  };

  const handleExecutePayment = async () => {
    if (!upiId) {
      toast.error('Missing UPI ID');
      return;
    }

    // Safety Verification Check before sending money
    const currentVerification = verifyUpiId(upiId, upiData?.mc);
    if (!currentVerification.isValid) {
      toast.error('Verification Failed', {
        description: currentVerification.errorMessage || 'Invalid UPI VPA handle. Check the receiver ID before paying.'
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setIsProcessing(true);

    try {
      const finalUrl = constructFinalUpiUrl();

      // Auto-record transaction in FinTrack
      if (autoRecord && auth.currentUser) {
        const cleanCategory = (category || 'Shopping').trim().substring(0, 90);
        const cleanDescription = `UPI: ${payeeName || upiId} (${note || 'Payment'})`.trim().substring(0, 490);

        const txData = {
          userId: auth.currentUser.uid,
          amount: numAmount,
          type: 'expense' as const,
          category: cleanCategory,
          description: cleanDescription,
          date: Timestamp.now(),
          paymentMode: paymentMode || 'UPI',
          fromAccount: paymentMode !== 'Cash' ? (paymentMode || 'UPI') : null,
          toAccount: null,
          isFamily: !!(profile?.familyId),
          familyId: profile?.familyId || null
        };

        try {
          await addDoc(collection(db, 'transactions'), txData);
          toast.success('Logged in FinTrack Pro!', {
            description: `- ${currencySymbol}${numAmount.toFixed(2)} (${cleanCategory})`
          });
        } catch (dbErr) {
          console.error("Auto-record transaction error:", dbErr);
          try {
            handleFirestoreError(dbErr, OperationType.CREATE, 'transactions');
          } catch {
            // Non-blocking for the deep link redirection
          }
        }
      }

      // Trigger standard upi://pay URI intent
      try {
        window.location.href = finalUrl;
      } catch (e) {
        console.warn('Direct location.href assignment failed:', e);
      }

      // Fallback anchor tag click for native webviews
      setTimeout(() => {
        try {
          const link = document.createElement('a');
          link.href = finalUrl;
          link.target = '_self';
          link.rel = 'noopener';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          console.warn('Anchor tag click fallback failed:', e);
        }
      }, 100);

      toast.info('Opening System Payment Sheet...', {
        description: 'Choose your installed UPI payment app on your device.',
        duration: 3000
      });

      if (onPaymentComplete) {
        onPaymentComplete();
      }
    } catch (err) {
      console.error('Payment execution error:', err);
      toast.error('Failed to launch payment app');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyUpiLink = () => {
    const link = constructFinalUpiUrl();
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('UPI Payment Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    hasHandledScanRef.current = false;
    toast.dismiss();
    stopCamera();
    setStep('scan');
    setUpiData(null);
    setVerification(null);
    setAmount('');
    setUpiId('');
    setPayeeName('');
    setManualVpaInput('');
    setScanMode('camera');
  };

  // Preset quick amounts
  const handleAddPresetAmount = (addVal: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addVal).toString());
  };

  // UPI Apps available list
  const upiApps = [
    { id: 'gpay', name: 'Google Pay', color: 'from-blue-600 to-emerald-500', badge: 'Popular' },
    { id: 'phonepe', name: 'PhonePe', color: 'from-purple-600 to-violet-600', badge: 'Popular' },
    { id: 'paytmmp', name: 'Paytm', color: 'from-cyan-600 to-blue-700', badge: 'Fast' },
    { id: 'bhim', name: 'BHIM UPI', color: 'from-orange-500 to-amber-600', badge: 'Govt' },
    { id: 'cred', name: 'Cred Pay', color: 'from-zinc-800 to-black text-white', badge: 'Rewards' },
    { id: 'amazonpay', name: 'Amazon Pay', color: 'from-amber-500 to-orange-600', badge: 'Pay' },
  ];

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Hidden file input target */}
      <div id="upi-qr-reader-file-temp" className="hidden" />

      {/* STEP 1: SCAN QR CODE OR SHOW MY APP QRs */}
      {step === 'scan' && (
        <Card className="border-none glass shadow-2xl rounded-[2.5rem] overflow-hidden dark:bg-zinc-900/95 border border-white/10 relative transition-all duration-300">
          {isFlipped ? (
            /* BACK SIDE OF CARD: SWIPABLE APP QR CODES CAROUSEL */
            <div>
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, { offset }) => {
                  if (Math.abs(offset.x) > 35) {
                    setIsFlipped(false);
                  }
                }}
                className="touch-pan-y cursor-grab active:cursor-grabbing"
              >
                <CardHeader className="text-center pb-2 pt-6 px-6 relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-violet-600 text-white flex items-center justify-center mx-auto mb-2 shadow-lg shadow-primary/30">
                    <QrCode className="h-7 w-7" />
                  </div>

                  <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFlipped(false)}
                      className="h-8 rounded-full border-primary/30 text-xs font-bold gap-1.5 text-primary hover:bg-primary/10 shadow-xs"
                      title="Flip card to open scanner"
                    >
                      <RotateCw className="h-3.5 w-3.5 text-primary" />
                      Scanner
                    </Button>
                  </div>

                  <CardTitle className="text-xl font-black tracking-tight dark:text-white">
                    Receive UPI Payment
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-muted-foreground">
                    Swipe header for Scanner • Swipe below for QRs
                  </CardDescription>
                </CardHeader>
              </motion.div>

              <CardContent className="p-5 pt-2 space-y-4">
                {/* Hidden custom QR image file input */}
                <input
                  ref={customQrInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomQrUpload}
                  className="hidden"
                />

                {/* Swipeable QR Carousel */}
                <div className="relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeQrAppIndex}
                      initial={{ opacity: 0, x: 25 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -25 }}
                      transition={{ duration: 0.2 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(_, { offset }) => {
                        const totalSlides = qrApps.length + 1;
                        if (offset.x < -35) {
                          if (activeQrAppIndex === totalSlides - 1) {
                            setIsFlipped(false);
                            setActiveQrAppIndex(0);
                          } else {
                            setActiveQrAppIndex((prev) => (prev + 1) % totalSlides);
                          }
                        } else if (offset.x > 35) {
                          if (activeQrAppIndex === 0) {
                            setIsFlipped(false);
                          } else {
                            setActiveQrAppIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
                          }
                        }
                      }}
                      className={cn(
                        "rounded-3xl p-4 sm:p-5 px-7 sm:px-8 text-center space-y-3.5 border shadow-xl relative overflow-hidden transition-all bg-card/90 dark:bg-zinc-950/90",
                        activeQrAppIndex < qrApps.length
                          ? (qrApps[activeQrAppIndex] || qrApps[0]).qrBorder || "border-primary/40"
                          : "border-primary/40"
                      )}
                    >
                      {activeQrAppIndex >= qrApps.length ? (
                        /* SLIDE: UPLOAD QR / ENTER UPI ID & MANAGE AVAILABLE QRS */
                        <div className="space-y-3.5 text-center">
                          <div className="flex items-center justify-between pb-1 border-b border-border/50 gap-2">
                            <span className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-1.5 min-w-0">
                              <PlusCircle className="h-4 w-4 shrink-0" />
                              <span className="truncate">Add & Manage QRs</span>
                            </span>
                            <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 shrink-0">
                              {qrApps.length} {qrApps.length === 1 ? 'QR' : 'QRs'}
                            </span>
                          </div>

                          {/* Quick Action Upload & Add Box */}
                          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b from-primary/10 to-primary/5 border border-primary/20 space-y-2.5">
                            <div className="text-center space-y-0.5">
                              <h4 className="text-xs font-black dark:text-white uppercase tracking-wide">Upload Image or Add UPI ID</h4>
                              <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                                Add separate QR codes with independent UPI handles and labels.
                              </p>
                            </div>

                            <div className="flex flex-col gap-2 pt-1">
                              <Button
                                type="button"
                                onClick={() => customQrInputRef.current?.click()}
                                className="h-10 text-xs font-extrabold rounded-xl bg-primary text-white flex items-center justify-center gap-2 shadow-md hover:bg-primary/90 w-full"
                              >
                                <Upload className="h-4 w-4 shrink-0" />
                                <span>Upload QR Image</span>
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddQrDialogOpen(true)}
                                className="h-10 text-xs font-extrabold rounded-xl border-primary/40 text-primary hover:bg-primary/10 flex items-center justify-center gap-2 w-full"
                              >
                                <Plus className="h-4 w-4 shrink-0" />
                                <span>Add New Custom QR / UPI ID</span>
                              </Button>
                            </div>

                            {/* Preset Apps Quick Add */}
                            <div className="pt-2 border-t border-primary/10 text-left">
                              <p className="text-[10px] font-black uppercase text-muted-foreground mb-1.5">Quick Add App QR</p>
                              <div className="flex flex-wrap gap-1.5">
                                {QR_APPS.map(preset => (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleAddPresetQr(preset)}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-card border border-border/80 hover:border-primary text-foreground hover:text-primary transition-all flex items-center gap-1 shadow-2xs"
                                  >
                                    <Plus className="h-3 w-3" />
                                    <span>{preset.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Manage Available QRs Section */}
                          <div className="space-y-2 text-left">
                            <p className="text-[11px] font-black uppercase text-muted-foreground tracking-wider px-1">
                              Manage Available QRs ({qrApps.length})
                            </p>

                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
                              {qrApps.map((app, idx) => {
                                const hasCustomImg = !!customAppQrs[app.id]?.image;
                                const customLabel = getQrLabel(app);
                                const upiHandle = getQrUpiId(app);
                                return (
                                  <div
                                    key={app.id || idx}
                                    className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border/70 hover:border-primary/40 transition-all text-xs shadow-xs"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-black text-xs border border-primary/20">
                                        {idx + 1}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-extrabold truncate text-foreground">{customLabel}</p>
                                        <p className="text-[10px] text-muted-foreground truncate font-mono">
                                          {hasCustomImg ? 'Custom Cropped QR' : (upiHandle || 'No UPI ID')}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setActiveQrAppIndex(idx)}
                                        className="h-7 px-2.5 text-[10px] font-black bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors"
                                      >
                                        View QR
                                      </Button>
                                      {qrApps.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            const newApps = qrApps.filter((_, i) => i !== idx);
                                            updateQrAppsList(newApps);
                                            toast.success(`Deleted "${customLabel}"`);
                                          }}
                                          className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full"
                                          title="Delete QR"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Pagination Indicator */}
                          <div className="flex items-center justify-center gap-1.5 pt-1">
                            {Array.from({ length: qrApps.length + 1 }).map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setActiveQrAppIndex(i)}
                                className={cn(
                                  "h-1.5 rounded-full transition-all cursor-pointer",
                                  i === activeQrAppIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                )}
                                title={i === qrApps.length ? "Add / Manage QRs" : `QR ${i + 1}`}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* ACTIVE QR CODE CARD */
                        <>
                          {/* Top Bar: Centered UPI Label Only */}
                          <div className="flex items-center justify-center px-0.5 pb-1">
                            <span className="inline-flex items-center justify-center bg-primary/10 border border-primary/30 px-3.5 py-1 rounded-full text-xs font-mono font-black text-primary tracking-wide max-w-[210px] truncate shadow-xs">
                              {getQrLabel(qrApps[activeQrAppIndex] || qrApps[0])}
                            </span>
                          </div>

                          {/* QR Code Canvas Frame */}
                          <div className="relative max-w-[210px] mx-auto bg-white p-3.5 rounded-2xl shadow-lg border border-border">
                            <img
                              src={
                                customAppQrs[(qrApps[activeQrAppIndex] || qrApps[0]).id]?.image ||
                                `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                                  `upi://pay?pa=${getQrUpiId(qrApps[activeQrAppIndex] || qrApps[0])}&pn=${encodeURIComponent(
                                    getQrPayeeName(qrApps[activeQrAppIndex] || qrApps[0])
                                  )}&cu=INR${myQrAmount ? '&am=' + myQrAmount : ''}`
                                )}`
                              }
                              alt={`${getQrLabel(qrApps[activeQrAppIndex] || qrApps[0])} QR`}
                              className="w-full h-auto rounded-lg aspect-square object-contain"
                            />

                            {/* Upload & Reset Buttons */}
                            <div className="mt-2.5 pt-2 border-t border-zinc-200 flex flex-col items-center gap-1.5">
                              <div className="flex items-center justify-center gap-1.5 w-full">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => customQrInputRef.current?.click()}
                                  className="h-7 text-[10px] font-extrabold px-2.5 rounded-lg border-zinc-300 text-zinc-800 hover:bg-zinc-100 flex items-center gap-1 flex-1 justify-center"
                                >
                                  <Crop className="h-3 w-3 text-primary" />
                                  {customAppQrs[(qrApps[activeQrAppIndex] || qrApps[0]).id]?.image ? 'Crop / Replace' : 'Upload & Crop'}
                                </Button>

                                {customAppQrs[(qrApps[activeQrAppIndex] || qrApps[0]).id]?.image && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCustomQr((qrApps[activeQrAppIndex] || qrApps[0]).id)}
                                    className="h-7 text-[10px] font-extrabold px-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                                    title="Reset to auto-generated QR"
                                  >
                                    Reset
                                  </Button>
                                )}
                              </div>

                              <div className="flex items-center justify-center gap-1 text-[10px] font-black text-zinc-600">
                                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                                <span className="truncate max-w-[180px]">
                                  {customAppQrs[(qrApps[activeQrAppIndex] || qrApps[0]).id]?.image
                                    ? customAppQrs[(qrApps[activeQrAppIndex] || qrApps[0]).id]?.label || 'Custom Cropped QR'
                                    : `Official ${getQrLabel(qrApps[activeQrAppIndex] || qrApps[0])}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Payee Info & UPI Label / VPA */}
                          <div className="space-y-1.5 pt-1">
                            <p className="text-xs font-black dark:text-white truncate">
                              {getQrPayeeName(qrApps[activeQrAppIndex] || qrApps[0])}
                            </p>
                            
                            {!customAppQrs[(qrApps[activeQrAppIndex] || qrApps[0]).id]?.image && (
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-mono font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 truncate max-w-[180px]">
                                  {getQrUpiId(qrApps[activeQrAppIndex] || qrApps[0]) || 'No UPI ID'}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsEditingVpa(!isEditingVpa)}
                                  className="h-7 px-2 text-xs font-bold gap-1 text-primary hover:bg-primary/10 rounded-lg"
                                  title="Edit UPI ID / Details"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  <span className="text-[11px]">{isEditingVpa ? 'Hide Editor' : 'Edit UPI ID'}</span>
                                </Button>
                              </div>
                            )}

                            {customAppQrs[(qrApps[activeQrAppIndex] || qrApps[0]).id]?.image && (
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsEditingVpa(!isEditingVpa)}
                                  className="h-7 px-2 text-xs font-bold gap-1 text-primary hover:bg-primary/10 rounded-lg"
                                  title="Edit QR Details"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  <span className="text-[11px]">{isEditingVpa ? 'Hide Details' : 'Edit Label & Details'}</span>
                                </Button>
                              </div>
                            )}

                            {myQrAmount && (
                              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 pt-0.5">
                                Amount: {currencySymbol}{parseFloat(myQrAmount).toFixed(2)}
                              </p>
                            )}
                          </div>

                          {/* Pagination Indicator */}
                          <div className="flex items-center justify-center gap-1.5 pt-1">
                            {Array.from({ length: qrApps.length + 1 }).map((_, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setActiveQrAppIndex(i)}
                                className={cn(
                                  "h-1.5 rounded-full transition-all cursor-pointer",
                                  i === activeQrAppIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                )}
                                title={i === qrApps.length ? "Add / Manage QRs" : `QR ${i + 1}`}
                              />
                            ))}
                          </div>

                          <p className="text-[10px] font-bold text-muted-foreground/80 tracking-wider uppercase">
                            ← Swipe right for Scanner | Swipe left for QRs →
                          </p>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Nav Arrows */}
                  <button
                    type="button"
                    onClick={() => {
                      const totalSlides = qrApps.length + 1;
                      setActiveQrAppIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
                    }}
                    className="absolute -left-2 sm:left-0 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-background/95 dark:bg-zinc-800/95 border border-border flex items-center justify-center text-foreground shadow-md hover:bg-accent active:scale-95 transition-all z-20"
                    title="Previous Slide"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const totalSlides = qrApps.length + 1;
                      setActiveQrAppIndex((prev) => (prev + 1) % totalSlides);
                    }}
                    className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-background/95 dark:bg-zinc-800/95 border border-border flex items-center justify-center text-foreground shadow-md hover:bg-accent active:scale-95 transition-all z-20"
                    title="Next Slide"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Edit Form Drawer */}
                {isEditingVpa && activeQrAppIndex < qrApps.length && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-3 text-left">
                    <div className="flex items-center justify-between pb-1 border-b border-border/50">
                      <span className="text-xs font-black text-foreground">
                        Edit &ldquo;{getQrLabel(qrApps[activeQrAppIndex])}&rdquo; Settings
                      </span>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        QR #{activeQrAppIndex + 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Label / Title</Label>
                        <Input
                          value={getQrLabel(qrApps[activeQrAppIndex])}
                          onChange={(e) => updateQrDetails(qrApps[activeQrAppIndex].id, { label: e.target.value })}
                          placeholder="e.g. My GPay, Shop QR"
                          className="h-9 text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">UPI ID for this QR</Label>
                        <Input
                          value={getQrUpiId(qrApps[activeQrAppIndex])}
                          onChange={(e) => updateQrDetails(qrApps[activeQrAppIndex].id, { upiId: e.target.value })}
                          placeholder="e.g. name@okhdfcbank"
                          className="h-9 text-xs font-bold font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Payee Name</Label>
                        <Input
                          value={getQrPayeeName(qrApps[activeQrAppIndex])}
                          onChange={(e) => updateQrDetails(qrApps[activeQrAppIndex].id, { payeeName: e.target.value })}
                          placeholder="Your Name / Business"
                          className="h-9 text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Fix Amount (Optional)</Label>
                        <Input
                          type="number"
                          value={myQrAmount}
                          onChange={(e) => setMyQrAmount(e.target.value)}
                          placeholder="Open"
                          className="h-9 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const curApp = qrApps[activeQrAppIndex] || qrApps[0];
                      const curVpa = getQrUpiId(curApp);
                      const curName = getQrPayeeName(curApp);
                      navigator.clipboard.writeText(`upi://pay?pa=${curVpa}&pn=${encodeURIComponent(curName)}&cu=INR${myQrAmount ? '&am=' + myQrAmount : ''}`);
                      toast.success(`Copied UPI link for ${getQrLabel(curApp)}!`);
                    }}
                    className="flex-1 rounded-xl text-xs font-bold gap-1.5 h-10"
                  >
                    <Copy className="h-3.5 w-3.5 text-primary" /> Copy Link
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setIsFlipped(false)}
                    className="flex-1 rounded-xl text-xs font-black gap-1.5 h-10 bg-gradient-to-r from-primary to-violet-600 text-white shadow-md"
                  >
                    <Camera className="h-3.5 w-3.5" /> Back to Scanner
                  </Button>
                </div>
              </CardContent>
            </div>
          ) : (
            /* FRONT SIDE OF CARD: SCANNER */
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, { offset }) => {
                if (offset.x < -35 || offset.x > 35) {
                  setIsFlipped(true);
                }
              }}
              className="touch-pan-y"
            >
              <CardHeader className="text-center pb-2 pt-6 px-6 relative cursor-grab active:cursor-grabbing">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-violet-600 text-white flex items-center justify-center mx-auto mb-2 shadow-lg shadow-primary/30">
                  <QrCode className="h-7 w-7" />
                </div>

                <div className="absolute top-4 right-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFlipped(true)}
                    className="h-8 rounded-full border-primary/30 text-xs font-bold gap-1.5 text-primary hover:bg-primary/10 shadow-xs"
                    title="Flip card to show your QR codes"
                  >
                    <RotateCw className="h-3.5 w-3.5 text-primary" />
                    My QRs
                  </Button>
                </div>

                <CardTitle className="text-xl font-black tracking-tight dark:text-white">
                  Scan UPI QR
                </CardTitle>
                <CardDescription className="text-xs font-semibold text-muted-foreground">
                  Align any UPI QR code inside the box • Swipe for My QRs
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Mode Toggle */}
                <div className="flex bg-muted/60 p-1 rounded-2xl gap-1">
                  <button
                    type="button"
                    onClick={() => { setScanMode('camera'); setCameraError(null); }}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      scanMode === 'camera' 
                        ? "bg-card text-primary shadow-md dark:bg-zinc-800 dark:text-white" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => { setScanMode('upload'); stopCamera(); }}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      scanMode === 'upload' 
                        ? "bg-card text-primary shadow-md dark:bg-zinc-800 dark:text-white" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Gallery
                  </button>
                </div>

                {/* Camera Scanner Container */}
                {scanMode === 'camera' && (
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 bg-black min-h-[270px] max-h-[310px] flex items-center justify-center shadow-inner">
                      <div id="upi-qr-reader" className="w-full overflow-hidden" />

                      {/* Starting Camera Loading State */}
                      {isStartingCamera && !cameraError && (
                        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
                          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary animate-spin">
                            <Loader2 className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Starting camera...</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Initializing scanner hardware</p>
                          </div>
                        </div>
                      )}

                      {/* Error & Diagnostics Card */}
                      {cameraError && (
                        <div className="absolute inset-0 bg-zinc-950/95 flex flex-col items-center justify-center p-5 text-center z-20 space-y-3">
                          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                            <AlertCircle className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-bold text-red-400 max-w-[280px] leading-relaxed">
                            {cameraError}
                          </p>

                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <Button 
                              onClick={() => startCamera()} 
                              size="sm" 
                              className="rounded-xl font-bold text-xs shadow-md"
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry Camera
                            </Button>

                            <Button 
                              onClick={() => { setScanMode('upload'); stopCamera(); }} 
                              size="sm" 
                              variant="secondary"
                              className="rounded-xl font-bold text-xs"
                            >
                              <Upload className="h-3.5 w-3.5 mr-1.5" /> Use Gallery
                            </Button>
                          </div>

                          {availableCameras.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={toggleCameraFacing}
                              className="text-[11px] text-muted-foreground hover:text-white h-7 px-2"
                            >
                              <SlidersHorizontal className="h-3 w-3 mr-1" />
                              Try Different Camera Lens ({availableCameras.length} detected)
                            </Button>
                          )}
                        </div>
                      )}

                      {isScanning && !cameraError && (
                        <>
                          {/* Flash ON visual pill overlay */}
                          {isTorchOn && (
                            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/90 text-amber-950 text-[10px] font-black tracking-wide shadow-md backdrop-blur-xs animate-pulse">
                              <Zap className="h-3 w-3 fill-amber-950 text-amber-950" />
                              <span>FLASH ON</span>
                            </div>
                          )}

                          {/* Controls in top right */}
                          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                            {/* Flash / Torch Toggle */}
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              onClick={toggleTorch}
                              className={cn(
                                "h-9 w-9 rounded-full backdrop-blur-md transition-all shadow-md active:scale-95",
                                isTorchOn 
                                  ? "bg-amber-400 text-amber-950 hover:bg-amber-300 ring-2 ring-amber-300 shadow-amber-500/40" 
                                  : "bg-black/60 text-white hover:bg-black/80"
                              )}
                              title={isTorchOn ? "Turn Flash OFF" : "Turn Flash ON"}
                            >
                              {isTorchOn ? (
                                <Zap className="h-4 w-4 fill-amber-950 text-amber-950" />
                              ) : (
                                <ZapOff className="h-4 w-4 text-white/90" />
                              )}
                            </Button>

                            {/* Camera flip toggle */}
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              onClick={toggleCameraFacing}
                              className="h-9 w-9 rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 shadow-md active:scale-95"
                              title="Flip Camera / Switch Lens"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Supports Google Pay, PhonePe, Paytm, BHIM & Bank QR codes
                    </div>
                  </div>
                )}

                {/* Gallery Upload Mode */}
                {scanMode === 'upload' && (
                  <div className="space-y-3">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-primary/30 hover:border-primary/60 bg-accent/10 rounded-3xl p-6 text-center cursor-pointer transition-all duration-200 hover:bg-accent/20 flex flex-col items-center justify-center min-h-[200px]"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-black dark:text-white">Choose QR Code Screenshot</p>
                      <p className="text-[10px] font-medium text-muted-foreground mt-1">Tap to select image from gallery</p>
                    </div>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </Card>
      )}

      {/* CROP IMAGE MODAL */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Crop className="h-5 w-5 text-primary" />
              Crop & Label {(qrApps[activeQrAppIndex] || qrApps[0])?.name} QR
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* QR Label / Name Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase text-muted-foreground">Label / Name for QR Code</Label>
              <Input
                value={qrCustomLabelInput}
                onChange={(e) => setQrCustomLabelInput(e.target.value)}
                placeholder={`e.g. ${(qrApps[activeQrAppIndex] || qrApps[0])?.name} Shop / Personal`}
                className="h-10 text-xs font-bold rounded-xl"
              />
            </div>

            {/* Crop Viewport & Canvas Preview */}
            <div className="space-y-2 text-center">
              <p className="text-[11px] font-bold text-muted-foreground">Drag to pan & zoom to center the QR code:</p>
              
              <div
                className="relative w-64 h-64 mx-auto bg-zinc-950 rounded-2xl overflow-hidden border-2 border-primary/40 shadow-inner cursor-grab active:cursor-grabbing touch-none flex items-center justify-center select-none"
                onMouseDown={(e) => {
                  setIsDraggingCrop(true);
                  setDragStart({ x: e.clientX - cropPan.x, y: e.clientY - cropPan.y });
                }}
                onMouseMove={(e) => {
                  if (!isDraggingCrop) return;
                  setCropPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                }}
                onMouseUp={() => setIsDraggingCrop(false)}
                onMouseLeave={() => setIsDraggingCrop(false)}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    setIsDraggingCrop(true);
                    setDragStart({ x: e.touches[0].clientX - cropPan.x, y: e.touches[0].clientY - cropPan.y });
                  }
                }}
                onTouchMove={(e) => {
                  if (isDraggingCrop && e.touches.length === 1) {
                    setCropPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
                  }
                }}
                onTouchEnd={() => setIsDraggingCrop(false)}
              >
                {rawImageToCrop && (
                  <img
                    src={rawImageToCrop}
                    alt="Crop preview"
                    style={{
                      transform: `translate(${cropPan.x}px, ${cropPan.y}px) scale(${cropZoom})`,
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                  />
                )}
                
                {/* Crop Box Overlay Guide (224px x 224px inside 256px container) */}
                <div className="absolute inset-4 border-2 border-dashed border-primary/80 rounded-xl pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCropZoom(prev => Math.max(0.5, prev - 0.2))}
                  className="h-8 w-8 rounded-full"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono font-bold w-12 text-center">{Math.round(cropZoom * 100)}%</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCropZoom(prev => Math.min(3.0, prev + 0.2))}
                  className="h-8 w-8 rounded-full"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCropZoom(1); setCropPan({ x: 0, y: 0 }); }}
                  className="text-[11px] font-bold text-muted-foreground h-8 px-2"
                >
                  Reset Zoom
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setCropModalOpen(false)} className="rounded-xl font-bold text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (rawImageToCrop) {
                  const img = new Image();
                  img.onload = () => {
                    const OUTPUT_SIZE = 400;
                    const CROP_BOX_SIZE = 224;
                    const PREVIEW_CONTAINER_SIZE = 256;
                    const CROP_OFFSET = (PREVIEW_CONTAINER_SIZE - CROP_BOX_SIZE) / 2; // 16px

                    const canvas = document.createElement('canvas');
                    canvas.width = OUTPUT_SIZE;
                    canvas.height = OUTPUT_SIZE;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.fillStyle = '#ffffff';
                      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

                      const baseScale = Math.min(PREVIEW_CONTAINER_SIZE / img.naturalWidth, PREVIEW_CONTAINER_SIZE / img.naturalHeight);
                      const scaleToCanvas = OUTPUT_SIZE / CROP_BOX_SIZE;

                      const drawWidth = img.naturalWidth * baseScale * cropZoom * scaleToCanvas;
                      const drawHeight = img.naturalHeight * baseScale * cropZoom * scaleToCanvas;

                      const centerX = (PREVIEW_CONTAINER_SIZE / 2 + cropPan.x - CROP_OFFSET) * scaleToCanvas;
                      const centerY = (PREVIEW_CONTAINER_SIZE / 2 + cropPan.y - CROP_OFFSET) * scaleToCanvas;

                      ctx.drawImage(
                        img,
                        centerX - drawWidth / 2,
                        centerY - drawHeight / 2,
                        drawWidth,
                        drawHeight
                      );

                      const croppedData = canvas.toDataURL('image/jpeg', 0.88);
                      saveCroppedImage(croppedData);
                    }
                  };
                  img.src = rawImageToCrop;
                }
              }}
              className="rounded-xl font-black text-xs bg-primary text-white shadow-md gap-1.5"
            >
              <Check className="h-4 w-4" /> Save Cropped QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT LABEL DIALOG */}
      <Dialog open={editingTitleForApp} onOpenChange={setEditingTitleForApp}>
        <DialogContent className="max-w-sm rounded-3xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              Set Label for {(qrApps[activeQrAppIndex] || qrApps[0])?.name} QR
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground">Custom Label</Label>
            <Input
              value={tempTitleInput}
              onChange={(e) => setTempTitleInput(e.target.value)}
              placeholder={`e.g. My ${(qrApps[activeQrAppIndex] || qrApps[0])?.name} Business`}
              className="h-10 text-xs font-bold rounded-xl"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-1">
            <Button variant="outline" onClick={() => setEditingTitleForApp(false)} className="rounded-xl font-bold text-xs">
              Cancel
            </Button>
            <Button onClick={() => saveQrCustomLabel(tempTitleInput)} className="rounded-xl font-black text-xs bg-primary text-white">
              Save Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD NEW QR DIALOG */}
      <Dialog open={addQrDialogOpen} onOpenChange={setAddQrDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Add New QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-black uppercase text-muted-foreground">UPI Label / Name *</Label>
              <Input
                value={newQrNameInput}
                onChange={(e) => setNewQrNameInput(e.target.value)}
                placeholder="e.g. My HDFC QR / Shop Pay"
                className="h-10 text-xs font-bold rounded-xl"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-black uppercase text-muted-foreground">UPI ID / VPA Handle (Optional)</Label>
              <Input
                value={newQrVpaInput}
                onChange={(e) => setNewQrVpaInput(e.target.value)}
                placeholder="e.g. username@upi"
                className="h-10 text-xs font-bold rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-1">
            <Button variant="outline" onClick={() => setAddQrDialogOpen(false)} className="rounded-xl font-bold text-xs">
              Cancel
            </Button>
            <Button onClick={handleAddNewQr} className="rounded-xl font-black text-xs bg-primary text-white">
              Add QR Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STEP 2: SIMPLE ENTER AMOUNT SCREEN (If QR had no amount) */}
      {step === 'amount' && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-none glass shadow-2xl rounded-[2.5rem] overflow-hidden dark:bg-zinc-900/95 border border-white/10">
            <CardHeader className="pb-3 pt-6 px-6 relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="absolute top-4 left-4 h-8 w-8 rounded-full"
                title="Scan again"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="text-center pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-2 border border-emerald-500/20">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified Receiver VPA
                </div>
                <CardTitle className="text-lg font-black dark:text-white truncate">
                  {payeeName || upiId}
                </CardTitle>
                <CardDescription className="text-xs font-mono font-bold text-muted-foreground truncate">
                  {upiId}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* Verification Badge */}
             

              {/* Large Simple Amount Input */}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground text-center block">
                  Enter Payment Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-black text-primary">
                    {currencySymbol}
                  </span>
                  <Input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="h-20 pl-12 pr-4 text-4xl font-black text-center rounded-2xl border-2 border-primary/30 focus:border-primary text-foreground shadow-inner"
                    autoFocus
                  />
                </div>

                {/* Preset Chips */}
                <div className="flex justify-center gap-2 pt-1">
                  {[100, 500, 1000, 2000].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddPresetAmount(preset)}
                      className="px-3 py-1.5 rounded-xl bg-accent/20 hover:bg-primary/20 text-xs font-bold text-foreground transition-all active:scale-95 border border-primary/10"
                    >
                      +{currencySymbol}{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note input */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Remark / Note (Optional)
                </Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Payment note"
                  className="h-10 rounded-xl text-xs font-medium"
                />
              </div>

              {/* Proceed Button */}
              <Button
                onClick={() => {
                  if (!amount || parseFloat(amount) <= 0) {
                    toast.error('Please enter an amount greater than 0');
                    return;
                  }
                  setStep('select_app');
                }}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full h-14 rounded-2xl text-base font-black bg-gradient-to-r from-primary to-violet-600 shadow-xl shadow-primary/25 hover:opacity-95 transition-all"
              >
                Proceed to Payment <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* STEP 3: SIMPLE & EASY TO USE PAYMENT SCREEN */}
      {step === 'select_app' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          {/* Header Bar with Back Button */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setStep(upiData?.am ? 'scan' : 'amount')}
              className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors text-foreground"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full">
              <Zap className="h-3.5 w-3.5 fill-current" /> Instant UPI Payment
            </span>
          </div>

          {/* Payment Card */}
          <Card className="border border-border/80 shadow-2xl rounded-[2.2rem] overflow-hidden bg-card dark:bg-zinc-900/95">
            <CardContent className="p-6 text-center space-y-5">
              {/* Payee Info & Amount */}
              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">Paying To</p>
                <h3 className="text-xl font-black dark:text-white truncate">{payeeName || upiId}</h3>
                <div className="inline-block px-3 py-1 rounded-full bg-muted/50 border border-border text-[11px] font-mono font-bold text-muted-foreground truncate max-w-full">
                  {upiId}
                </div>

                <div className="pt-2">
                  <div className="inline-flex items-baseline justify-center px-6 py-2.5 rounded-2xl bg-gradient-to-b from-primary/15 to-primary/5 border border-primary/20">
                    <span className="text-3xl font-black text-primary tracking-tight">
                      {currencySymbol}{parseFloat(amount || '0').toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Info Box */}
              

              {/* Main Action Button */}
              <div className="space-y-3 pt-1">
                <Button
                  type="button"
                  onClick={() => handleExecutePayment()}
                  disabled={isProcessing}
                  className="w-full h-15 rounded-2xl text-base font-black bg-gradient-to-r from-primary to-violet-600 hover:from-primary/95 hover:to-violet-600/95 text-white shadow-xl shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
                >
                  <Zap className="h-5 w-5 fill-current shrink-0" />
                  <span>Pay {currencySymbol}{parseFloat(amount || '0').toFixed(2)}</span>
                </Button>

                <p className="text-[11px] text-muted-foreground font-medium px-2">
                  Tapping opens your phone's payment chooser showing installed apps (Google Pay, PhonePe, Paytm, BHIM, etc.).
                </p>
              </div>

              {/* Visual App Badges */}
              <div className="pt-2 border-t border-border/60">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3">
                  Supported Payment Apps
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {/* GPay */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border shadow-xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span className="text-xs font-bold">Google Pay</span>
                  </div>

                  {/* PhonePe */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border shadow-xs">
                    <div className="w-4 h-4 rounded-full bg-[#5f259f] text-white flex items-center justify-center text-[8px] font-black italic">
                      pe
                    </div>
                    <span className="text-xs font-bold">PhonePe</span>
                  </div>

                  {/* Paytm */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border shadow-xs">
                    <span className="text-[10px] font-black text-[#00BAF2] bg-[#002E6E] px-1 rounded">paytm</span>
                    <span className="text-xs font-bold">Paytm</span>
                  </div>

                  {/* BHIM / Other */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border shadow-xs">
                    <Smartphone className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold">BHIM & More</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-record in FinTrack Toggle */}
          <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-black dark:text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Auto-Record in FinTrack Pro
                </Label>
                <p className="text-[10px] text-muted-foreground font-medium">Log expense automatically when paying</p>
              </div>
              <Switch checked={autoRecord} onCheckedChange={setAutoRecord} />
            </div>

            {autoRecord && (
              <div className="pt-2 border-t border-border/50">
                <Label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1 block">
                  Category
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat} className="text-xs font-medium">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-2 text-xs">
            <button
              type="button"
              onClick={handleCopyUpiLink}
              className="flex items-center gap-1.5 font-bold text-muted-foreground hover:text-primary transition-colors py-1"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Link Copied!' : 'Copy UPI Link'}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="font-bold text-muted-foreground hover:text-primary transition-colors py-1"
            >
              Scan Another QR
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
