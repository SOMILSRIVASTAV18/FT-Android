import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot, collection, query, where, orderBy, handleFirestoreError, OperationType, Timestamp, limit, getRedirectResult, updateDoc, getDocs, sendEmailVerification, goOnline, goOffline } from './lib/firebase';
import { Auth } from './components/Auth';
import { UserProfile, Transaction, Family, Budget, DEFAULT_CATEGORIES, AppNotification } from './types';
import { Toaster } from '@/components/ui/sonner';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { FamilyView } from './components/Family';
import { Budgets } from './components/Budgets';
import { Settings } from './components/Settings';
import { Help } from './components/Help';
import { DuesReminders } from './components/DuesReminders';
import { SplitSharing } from './components/SplitSharing';
import { FinanceCalculator } from './components/FinanceCalculator';
import { Passbook } from './components/Passbook';
import { LockScreen } from './components/LockScreen';
import { Goals } from './components/Goals';
import { Bills } from './components/Bills';
import { Subscriptions } from './components/Subscriptions';
import { AssetsLiabilities } from './components/AssetsLiabilities';
import { NotificationPanel } from './components/NotificationPanel';
import { Logo } from './components/Logo';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Users, 
  PieChart, 
  Settings as SettingsIcon, 
  HelpCircle,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Coins,
  Plus,
  Target,
  Receipt,
  RefreshCw,
  Landmark,
  UserPlus,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

import { NativeService } from './lib/native';
import { parseSMS } from './lib/smsParser';
import { addDoc } from './lib/firebase';
import { toast } from 'sonner';

import { parseSMSWithAI } from './lib/gemini';
import { UpdateManager, UpdateManagerHandle } from './components/UpdateManager';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [personalTxs, setPersonalTxs] = useState<Transaction[]>([]);
  const [familyTxs, setFamilyTxs] = useState<Transaction[]>([]);
  const [family, setFamily] = useState<Family | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [showMockEmail, setShowMockEmail] = useState(false);
  const updateManagerRef = React.useRef<UpdateManagerHandle>(null);

  const transactions = useMemo(() => {
    const combined = [...personalTxs, ...familyTxs];
    // Deduplicate by ID
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    
    // Sort by date descending
    return unique.sort((a, b) => {
      const dateA = a.date?.toMillis?.() || 0;
      const dateB = b.date?.toMillis?.() || 0;
      return dateB - dateA;
    });
  }, [personalTxs, familyTxs]);
  const notifiedBudgets = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    const initNative = async () => {
      try {
        await NativeService.initPush();
        if (Capacitor.getPlatform() !== 'web') {
          const granted = await NativeService.requestSMSPermissions();
          if (granted) {
            toast.success('SMS Permissions granted');
          }

          // Reconnect when app returns to foreground
          CapacitorApp.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
              goOnline();
            } else {
              goOffline();
            }
          });
        }
      } catch (error) {
        console.error('Native initialization failed', error);
      } finally {
        setIsInitializing(false);
      }
    };
    initNative();

    // Handle Google Redirect result
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect login success', result.user);
        }
      } catch (error) {
        console.error('Redirect login error', error);
        toast.error('Failed to complete Google login');
      }
    };
    checkRedirect();
  }, []);

  // Handle Android Back Button
  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') return;

    const backButtonListenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // If we are in a mobile view/menu, close it first
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        return;
      }

      // If sidebar is open, close it
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
        return;
      }

      // If we are not on the dashboard tab, go back to dashboard
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return;
      }

      // If we are on the dashboard and at the root, exit the app
      CapacitorApp.exitApp();
    });

    return () => {
      backButtonListenerPromise.then(handle => handle.remove());
    };
  }, [activeTab, isMobileMenuOpen, isSidebarOpen]);

  const smsInitialized = React.useRef(false);

  // Handle Biometric Lock
  useEffect(() => {
    if (profile?.settings.biometricLock) {
      setIsLocked(true);
    }
  }, [profile?.settings.biometricLock]);

  // Handle App Lifecycle for Locking
  useEffect(() => {
    if (!profile?.settings.biometricLock) return;

    NativeService.onAppExit(() => {
      setIsLocked(true);
    });
  }, [profile?.settings.biometricLock]);

  useEffect(() => {
    if (user && profile && !isInitializing && !smsInitialized.current && profile.settings.smsSyncEnabled) {
      const runSMSInit = async () => {
        try {
          // Try to read inbox first for past SMS
          await NativeService.readInbox(async (messages) => {
            for (const msg of messages) {
              const aiData = await parseSMSWithAI(msg.body);
              if (aiData && aiData.amount > 0) {
                // Check if already exists in passbook to avoid duplicates
                const q = query(
                  collection(db, 'smsPassbook'),
                  where('userId', '==', user.uid),
                  where('body', '==', msg.body)
                );
                const snapshot = await getDocs(q);
                if (snapshot.empty) {
                  const txData = {
                    userId: user.uid,
                    amount: aiData.amount,
                    type: aiData.type === 'other' ? 'expense' : aiData.type,
                    category: aiData.category,
                    description: aiData.description || `SMS from ${msg.address}`,
                    date: Timestamp.fromMillis(msg.date),
                    isFamily: !!profile.familyId,
                    familyId: profile.familyId || null,
                    fromAccount: aiData.accountLast4 ? `${aiData.bankName || 'Bank'} (${aiData.accountLast4})` : undefined,
                    paymentMode: 'Account'
                  };
                  
                  await addDoc(collection(db, 'smsPassbook'), {
                    userId: user.uid,
                    address: msg.address,
                    body: msg.body,
                    date: Timestamp.fromMillis(msg.date),
                    parsedAmount: aiData.amount,
                    parsedType: aiData.type,
                    bankName: aiData.bankName,
                    accountLast4: aiData.accountLast4,
                    isAdded: true
                  });
                  await addDoc(collection(db, 'transactions'), txData);
                }
              }
            }
          });

          NativeService.initSMS(async (address, body) => {
          const aiData = await parseSMSWithAI(body);
          if (aiData && aiData.amount > 0) {
            const txData = {
              userId: user.uid,
              amount: aiData.amount,
              type: aiData.type === 'other' ? 'expense' : aiData.type,
              category: aiData.category,
              description: aiData.description || `SMS from ${address}`,
              date: Timestamp.now(),
              isFamily: !!profile.familyId,
              familyId: profile.familyId || null,
              fromAccount: aiData.accountLast4 ? `${aiData.bankName || 'Bank'} (${aiData.accountLast4})` : undefined,
              paymentMode: 'Account'
            };

            try {
              // Save to SMS Passbook
              const smsEntry = {
                userId: user.uid,
                address,
                body,
                date: Timestamp.now(),
                parsedAmount: aiData.amount,
                parsedType: aiData.type,
                bankName: aiData.bankName,
                accountLast4: aiData.accountLast4,
                isAdded: true
              };
              await addDoc(collection(db, 'smsPassbook'), smsEntry);

              // Add Transaction
              await addDoc(collection(db, 'transactions'), txData);

              // Auto-detect bank account
              const bankAccount = aiData.accountLast4 ? `${aiData.bankName || 'Bank'} (${aiData.accountLast4})` : null;
              if (bankAccount && profile && !profile.bankAccounts?.includes(bankAccount)) {
                await updateDoc(doc(db, 'users', user.uid), {
                  bankAccounts: [...(profile.bankAccounts || []), bankAccount]
                });
              }

              // Auto-add Bill if detected
              if (aiData.isBill) {
                await addDoc(collection(db, 'bills'), {
                  userId: user.uid,
                  name: aiData.merchantName || aiData.description,
                  amount: aiData.amount,
                  dueDate: Timestamp.now(),
                  category: aiData.category,
                  isRecurring: false,
                  status: 'paid',
                  lastPaidDate: Timestamp.now()
                });
              }

              // Auto-add Subscription if detected
              if (aiData.isSubscription) {
                await addDoc(collection(db, 'subscriptions'), {
                  userId: user.uid,
                  name: aiData.merchantName || aiData.description,
                  amount: aiData.amount,
                  billingCycle: 'monthly',
                  nextBillingDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
                  category: aiData.category,
                  isActive: true
                });
              }

              toast.success('Transaction auto-detected', {
                description: `${aiData.type === 'income' ? '+' : '-'}₹${aiData.amount} (${aiData.category})`
              });
            } catch (error) {
              console.error('Failed to add SMS transaction', error);
            }
          }
        });
        smsInitialized.current = true;
      } catch (error) {
        console.error('SMS initialization failed', error);
      }
    };
    runSMSInit();
  }
}, [user, profile, isInitializing]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthChecking(false);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time profile listener
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const timeout = setTimeout(() => {
      if (!profile) {
        toast.error("Connecting to server...", {
          description: "Data loading is taking longer than usual. Please check your internet connection.",
          duration: 5000,
        });
      }
    }, 10000);

    const profileUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
      clearTimeout(timeout);
      try {
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          const initialProfile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName,
            photoURL: user.photoURL,
            categories: DEFAULT_CATEGORIES,
            settings: {
              darkMode: false,
              notifications: true,
              currency: 'INR'
            },
            createdAt: Timestamp.now()
          };
          setDoc(doc(db, 'users', user.uid), initialProfile).catch(err => {
            handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
          });
          setProfile(initialProfile);
        }
      } catch (err) {
        console.error("Profile error", err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      clearTimeout(timeout);
      setLoading(false);
      if (auth.currentUser) {
        console.error("Profile snapshot error:", error);
        toast.error("Failed to sync profile");
      }
    });

    return () => {
      profileUnsubscribe();
      clearTimeout(timeout);
    };
  }, [user?.uid]);

  // Listen to personal transactions
  useEffect(() => {
    if (!user) {
      setPersonalTxs([]);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPersonalTxs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'personal transactions');
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Listen to family transactions
  useEffect(() => {
    if (!user || !profile?.familyId) {
      setFamilyTxs([]);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('familyId', '==', profile.familyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFamilyTxs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'family transactions');
      }
    });

    return () => unsubscribe();
  }, [user, profile?.familyId]);

  // Auto-detect bank accounts from SMS passbook
  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, 'smsPassbook'), where('userId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const accounts = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.bankName && data.accountLast4) {
          accounts.add(`${data.bankName} (${data.accountLast4})`);
        }
      });

      const detectedAccounts = Array.from(accounts);
      const currentAccounts = profile.bankAccounts || [];
      
      if (detectedAccounts.length > 0 && JSON.stringify(detectedAccounts.sort()) !== JSON.stringify(currentAccounts.sort())) {
        await updateDoc(doc(db, 'users', profile.uid), {
          bankAccounts: detectedAccounts
        });
      }
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'smsPassbook (bank detection)');
      }
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  // Listen to notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Listen to family transactions if in a family
  useEffect(() => {
    if (!profile?.familyId) {
      setFamily(null);
      return;
    }

    const unsubscribeFamily = onSnapshot(doc(db, 'families', profile.familyId), (doc) => {
      if (doc.exists()) {
        setFamily({ id: doc.id, ...doc.data() } as Family);
      }
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, `families/${profile.familyId}`);
      }
    });

    return () => {
      unsubscribeFamily();
    };
  }, [profile?.familyId]);

  // Listen to budgets for monitoring
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'budgets'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'budgets');
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Monitor budgets
  useEffect(() => {
    if (budgets.length === 0 || transactions.length === 0) return;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    budgets.forEach(budget => {
      const spent = transactions
        .filter(tx => {
          const txDate = tx.date.toDate();
          return tx.type === 'expense' && 
                 tx.category === budget.category && 
                 isWithinInterval(txDate, { start: monthStart, end: monthEnd }) &&
                 (budget.familyId ? tx.familyId === budget.familyId : tx.userId === budget.userId);
        })
        .reduce((acc, tx) => acc + tx.amount, 0);

      if (spent >= budget.limit && !notifiedBudgets.current.has(budget.id!)) {
        const title = 'Budget Alert!';
        const message = `You have exceeded your ${budget.category} budget of ${profile?.settings.currency} ${budget.limit}.`;
        
        // Local notification
        NativeService.sendLocalNotification(title, message);
        
        // Persistent notification
        addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title,
          message,
          type: 'error',
          read: false,
          createdAt: Timestamp.now()
        });

        notifiedBudgets.current.add(budget.id!);
      } else if (spent >= budget.limit * 0.8 && !notifiedBudgets.current.has(`${budget.id!}_80`)) {
        const title = 'Budget Warning';
        const message = `You have used 80% of your ${budget.category} budget.`;
        
        // Local notification
        NativeService.sendLocalNotification(title, message);

        // Persistent notification
        addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title,
          message,
          type: 'warning',
          read: false,
          createdAt: Timestamp.now()
        });

        notifiedBudgets.current.add(`${budget.id!}_80`);
      }
    });
  }, [budgets, transactions, profile?.settings.currency]);
  
  if (isInitializing || isAuthChecking || (user && !profile)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        >
          <Logo size="xl" />
        </motion.div>
        <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mt-8">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full bg-primary"
          />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
          {isInitializing ? 'Initializing Environment' : isAuthChecking ? 'Checking Authentication' : 'Loading Profile...'}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth />
        <Toaster position="top-center" richColors closeButton />
      </>
    );
  }

  const isEmailAuth = user?.providerData.some(p => p.providerId === 'password');
  const needsVerification = isEmailAuth && !user?.emailVerified;

  if (user && needsVerification) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-background to-background p-4">
        <Card className="w-full max-w-md border-none glass shadow-2xl rounded-[40px] overflow-hidden">
          <CardHeader className="space-y-2 pb-8 pt-10 text-center">
            <div className="flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tighter">Verify Your Email</CardTitle>
            <CardDescription className="font-bold">
              We've sent a verification link to <span className="text-primary">{user.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8">
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground font-medium">
                Please check your inbox and click the link to verify your account. Once verified, click the button below to continue.
              </p>
              <Button 
                className="w-full h-14 font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 mt-4"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await user.reload();
                    if (user.emailVerified) {
                      toast.success("Email verified successfully!");
                    } else {
                      toast.error("Email not verified yet. Please check your inbox.");
                    }
                  } catch (error) {
                    toast.error("Failed to refresh status.");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                I've Verified My Email
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pb-8">
            <div className="flex w-full gap-2">
              <Button variant="ghost" className="flex-1 text-xs font-bold" onClick={async () => {
                try {
                  await sendEmailVerification(user);
                  toast.success("Verification email resent!");
                } catch (error) {
                  toast.error("Failed to resend email.");
                }
              }}>
                Resend Email
              </Button>
              <Button variant="ghost" className="flex-1 text-xs font-bold text-destructive" onClick={() => auth.signOut()}>
                Back to Login
              </Button>
            </div>
          </CardFooter>
        </Card>
        <Toaster position="top-center" richColors closeButton />
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'budgets', label: 'Budget', icon: PieChart },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
    { id: 'assets-liabilities', label: 'Net Worth', icon: Landmark },
    { id: 'dues', label: 'Dues', icon: Coins },
    { id: 'splits', label: 'Split', icon: UserPlus },
    { id: 'calculators', label: 'Calculator', icon: Calculator },
    { id: 'passbook', label: 'Passbook', icon: MessageSquare },
    { id: 'family', label: 'Family', icon: Users },
    { id: 'settings', label: 'Account', icon: SettingsIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard transactions={transactions} profile={profile!} family={family} onTabChange={setActiveTab} />;
      case 'transactions': return <Transactions transactions={transactions} profile={profile!} family={family} />;
      case 'budgets': return <Budgets transactions={transactions} profile={profile!} family={family} />;
      case 'family': return <FamilyView profile={profile!} family={family} transactions={transactions} />;
      case 'dues': return <DuesReminders profile={profile!} />;
      case 'splits': return <SplitSharing profile={profile!} />;
      case 'calculators': return <FinanceCalculator />;
      case 'passbook': return <Passbook userId={user.uid} profile={profile!} />;
      case 'goals': return <Goals profile={profile!} />;
      case 'bills': return <Bills profile={profile!} />;
      case 'subscriptions': return <Subscriptions profile={profile!} />;
      case 'assets-liabilities': return <AssetsLiabilities profile={profile!} />;
      case 'settings': return <Settings profile={profile!} onCheckForUpdates={() => updateManagerRef.current?.checkForUpdates(true)} />;
      case 'help': return <Help />;
      default: return <Dashboard transactions={transactions} profile={profile!} family={family} />;
    }
  };

  return (
    <div className={cn("min-h-screen md:h-screen md:overflow-hidden flex flex-col md:flex-row bg-background selection:bg-primary/30", profile?.settings.darkMode && "dark")}>
      {isLocked && <LockScreen onUnlock={() => setIsLocked(false)} />}
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r bg-card/50 backdrop-blur-xl sticky top-0 h-screen overflow-y-auto flex-shrink-0">
        <div className="p-8">
          <Logo showText size="lg" className="mb-6" />
          
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center w-full px-4 py-3.5 rounded-xl transition-all duration-200 group",
                  activeTab === item.id 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className={cn("mr-3 h-5 w-5 transition-transform", activeTab === item.id && "scale-110")} />
                <span className="font-bold text-sm tracking-tight dark:text-white">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t bg-accent/5">
          <div className="glass p-4 rounded-2xl mb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={profile?.photoURL || ''} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {profile?.displayName?.[0] || profile?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-black truncate dark:text-white">{profile?.displayName || 'User'}</p>
                <p className="text-[10px] font-bold text-muted-foreground truncate uppercase tracking-wider">{profile?.email}</p>
              </div>
              <NotificationPanel notifications={notifications} userId={user.uid} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs h-10" onClick={() => setActiveTab('help')}>
              <HelpCircle className="mr-2 h-3.5 w-3.5" />
              Help
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs h-10 text-destructive hover:bg-destructive/10" onClick={() => auth.signOut()}>
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Exit
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50 dark:bg-black/90">
        <Logo showText size="sm" />
        <div className="flex items-center space-x-3">
          <NotificationPanel notifications={notifications} userId={user.uid} />
          <button onClick={() => setActiveTab('help')} className="p-2 text-muted-foreground hover:text-primary transition-colors dark:text-white/70">
            <HelpCircle className="h-5 w-5" />
          </button>
          <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-sm" onClick={() => setActiveTab('settings')}>
            <AvatarImage src={profile?.photoURL || ''} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {profile?.displayName?.[0] || profile?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-10 pb-32 md:pb-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 bg-gradient-to-t from-background via-background/80 to-transparent dark:from-black dark:via-black/80">
        <div className="relative glass rounded-[2.5rem] flex items-center justify-between px-2 h-20 shadow-2xl shadow-primary/20 border border-white/20 dark:bg-black/80 dark:border-white/10">
          {/* Left side items */}
          <div className="flex flex-1 justify-around">
            {[navItems[0], navItems[1]].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 relative",
                  activeTab === item.id && !isMobileMenuOpen ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-6 w-6 transition-transform duration-300", activeTab === item.id && !isMobileMenuOpen && "scale-110")} />
                <span className="text-[10px] font-bold mt-1">{item.label}</span>
                {activeTab === item.id && !isMobileMenuOpen && (
                  <motion.div layoutId="activeTabDot" className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Central FAB */}
          <div className="relative -top-8">
            <button 
              onClick={() => {
                setActiveTab('transactions');
                setIsMobileMenuOpen(false);
              }}
              className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/40 border-4 border-background text-primary-foreground active:scale-90 transition-transform"
            >
              <Plus className="h-8 w-8" />
            </button>
          </div>

          {/* Right side items */}
          <div className="flex flex-1 justify-around">
            <button
              onClick={() => {
                setActiveTab('budgets');
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 relative",
                activeTab === 'budgets' && !isMobileMenuOpen ? "text-primary" : "text-muted-foreground"
              )}
            >
              <PieChart className={cn("h-6 w-6 transition-transform duration-300", activeTab === 'budgets' && !isMobileMenuOpen && "scale-110")} />
              <span className="text-[10px] font-bold mt-1">Budget</span>
              {activeTab === 'budgets' && !isMobileMenuOpen && (
                <motion.div layoutId="activeTabDot" className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 relative",
                isMobileMenuOpen ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              <span className="text-[10px] font-bold mt-1">{isMobileMenuOpen ? 'Close' : 'More'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-2xl pt-20 pb-32 px-6 overflow-y-auto"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300",
                    activeTab === item.id ? "bg-primary/10 text-primary" : "bg-card/50 hover:bg-primary/5 text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-1.5",
                    activeTab === item.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  )}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black text-center uppercase tracking-widest leading-tight">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <Logo size="sm" showText />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="top-center" richColors closeButton />
      <UpdateManager ref={updateManagerRef} />
    </div>
  );
}
