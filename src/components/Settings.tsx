import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db, doc, updateDoc, collection, getDocs, query, where, writeBatch, handleFirestoreError, OperationType } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  User, 
  Globe, 
  Tags, 
  Download, 
  Upload, 
  Plus, 
  X,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  HelpCircle,
  Info,
  CreditCard,
  Users,
  Fingerprint,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import { Logo } from './Logo';
import { APP_VERSION, BUILD_NUMBER } from '../constants';

interface SettingsProps {
  profile: UserProfile;
  onCheckForUpdates?: () => void;
}

export function Settings({ profile, onCheckForUpdates }: SettingsProps) {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile.photoURL || '');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        photoURL
      });
      toast.success('Profile updated');
      setIsEditProfileOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory || profile.categories.includes(newCategory)) return;
    try {
      const updatedCategories = [...profile.categories, newCategory];
      await updateDoc(doc(db, 'users', profile.uid), {
        categories: updatedCategories
      });
      setNewCategory('');
      toast.success('Category added');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid} (add category)`);
      toast.error('Failed to add category');
    }
  };

  const handleRemoveCategory = async (cat: string) => {
    try {
      const updatedCategories = profile.categories.filter(c => c !== cat);
      await updateDoc(doc(db, 'users', profile.uid), {
        categories: updatedCategories
      });
      toast.success('Category removed');
    } catch (error) {
      toast.error('Failed to remove category');
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount || profile.bankAccounts?.includes(newAccount)) return;
    try {
      const updatedAccounts = [...(profile.bankAccounts || []), newAccount];
      await updateDoc(doc(db, 'users', profile.uid), {
        bankAccounts: updatedAccounts
      });
      setNewAccount('');
      toast.success('Account added');
    } catch (error) {
      toast.error('Failed to add account');
    }
  };

  const handleRemoveAccount = async (acc: string) => {
    try {
      const updatedAccounts = (profile.bankAccounts || []).filter(a => a !== acc);
      await updateDoc(doc(db, 'users', profile.uid), {
        bankAccounts: updatedAccounts
      });
      toast.success('Account removed');
    } catch (error) {
      toast.error('Failed to remove account');
    }
  };

  const toggleSetting = async (key: string, value: any) => {
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        [`settings.${key}`]: value
      });
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  const handleBackup = async () => {
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', profile.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => doc.data());
      
      const backup = {
        profile,
        transactions: data,
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `fintrack_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Backup created successfully');
    } catch (error) {
      toast.error('Failed to create backup');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (!backup.transactions) throw new Error('Invalid backup file');

        if (!confirm(`Restore ${backup.transactions.length} transactions? This will add them to your current records.`)) return;

        const batch = writeBatch(db);
        backup.transactions.forEach((tx: any) => {
          const newDocRef = doc(collection(db, 'transactions'));
          batch.set(newDocRef, { ...tx, userId: profile.uid });
        });

        await batch.commit();
        toast.success('Data restored successfully!');
      } catch (error) {
        toast.error('Failed to restore data. Ensure the file is valid.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight dark:text-white">Account</h2>
      </div>

      {/* Profile Card */}
      <Card className="border-none glass shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-4 border-primary/20 shadow-xl">
              <AvatarImage src={profile?.photoURL || ''} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">
                {profile?.displayName?.[0] || profile?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-black tracking-tight dark:text-white">{profile?.displayName || 'User'}</h3>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{profile?.email}</p>
              <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                <DialogTrigger render={<Button variant="link" className="p-0 h-auto text-primary font-bold text-xs mt-2" />}>
                  Edit Profile
                </DialogTrigger>
                <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight">Edit Profile</DialogTitle>
                    <DialogDescription className="font-medium">Update your profile information.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider ml-1">Display Name</Label>
                      <Input 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                        placeholder="Your Name" 
                        className="h-12 rounded-xl border-2" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider ml-1">Photo URL</Label>
                      <Input 
                        value={photoURL} 
                        onChange={(e) => setPhotoURL(e.target.value)} 
                        placeholder="https://example.com/photo.jpg" 
                        className="h-12 rounded-xl border-2" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleUpdateProfile} 
                      disabled={loading}
                      className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings Section */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-4 dark:text-white/60">Account Settings</h3>
        <Card className="border-none glass shadow-lg rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-2">
            <div className="space-y-1">
              <button className="w-full flex items-center justify-between p-4 rounded-[2rem] hover:bg-primary/5 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-500/10 p-2.5 rounded-2xl text-slate-600 dark:text-slate-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-sm dark:text-white">Dark Mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={profile.settings.darkMode} onCheckedChange={(v) => toggleSetting('darkMode', v)} />
                </div>
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-[2rem] hover:bg-primary/5 transition-all group" onClick={() => setIsSecurityOpen(true)}>
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500/10 p-2.5 rounded-2xl text-blue-600 dark:text-blue-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-sm dark:text-white">Security & Privacy</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <Dialog open={isSecurityOpen} onOpenChange={setIsSecurityOpen}>
                <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight dark:text-white">Security</DialogTitle>
                    <DialogDescription className="font-medium">Manage your account security.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/5">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                          <Fingerprint className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold dark:text-white">Biometric Lock</Label>
                          <p className="text-[10px] text-muted-foreground font-medium">Require fingerprint/face to open app.</p>
                        </div>
                      </div>
                      <Switch 
                        checked={profile.settings.biometricLock} 
                        onCheckedChange={(v) => toggleSetting('biometricLock', v)} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/5">
                      <div className="flex items-center gap-4">
                        <div className="bg-green-500/10 p-2.5 rounded-xl text-green-600 dark:text-green-400">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold dark:text-white">SMS Auto-Sync</Label>
                          <p className="text-[10px] text-muted-foreground font-medium">Automatically track bank SMS.</p>
                        </div>
                      </div>
                      <Switch 
                        checked={profile.settings.smsSyncEnabled} 
                        onCheckedChange={(v) => toggleSetting('smsSyncEnabled', v)} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-accent/5">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-sm font-bold dark:text-white">Hide Sensitive Data</Label>
                          <p className="text-[10px] text-muted-foreground font-medium">Blur balances in public places.</p>
                        </div>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <button className="w-full flex items-center justify-between p-4 rounded-[2rem] hover:bg-primary/5 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="bg-amber-500/10 p-2.5 rounded-2xl text-amber-600 dark:text-amber-400">
                    <Bell className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-sm dark:text-white">Notifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={profile.settings.notifications} onCheckedChange={(v) => toggleSetting('notifications', v)} />
                </div>
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-[2rem] hover:bg-primary/5 transition-all group" onClick={() => setIsCategoriesOpen(true)}>
                <div className="flex items-center gap-4">
                  <div className="bg-orange-500/10 p-2.5 rounded-2xl text-orange-600 dark:text-orange-400">
                    <Tags className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-sm dark:text-white">Manage Categories</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <Dialog open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen}>
                <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight dark:text-white">Categories</DialogTitle>
                    <DialogDescription className="font-medium">Customize your transaction categories.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                      <Input 
                        value={newCategory} 
                        onChange={(e) => setNewCategory(e.target.value)} 
                        placeholder="New category name" 
                        className="h-12 rounded-xl border-2 dark:bg-black/20 dark:border-white/10 dark:text-white" 
                      />
                      <Button onClick={handleAddCategory} className="h-12 px-4 rounded-xl font-black">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-1">
                      {profile.categories.map(cat => (
                        <div key={cat} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold dark:bg-primary/20 dark:text-white">
                          {cat}
                          <button onClick={() => handleRemoveCategory(cat)} className="hover:text-destructive transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <button className="w-full flex items-center justify-between p-4 rounded-[2rem] hover:bg-primary/5 transition-all group" onClick={() => setIsCurrencyOpen(true)}>
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500/10 p-2.5 rounded-2xl text-purple-600 dark:text-purple-400">
                    <Globe className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-sm dark:text-white">Currency & Language</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-primary uppercase tracking-widest mr-2 dark:text-primary-foreground">{profile.settings.currency}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <Dialog open={isCurrencyOpen} onOpenChange={setIsCurrencyOpen}>
                <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight dark:text-white">Currency</DialogTitle>
                    <DialogDescription className="font-medium">Choose your preferred currency.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Select value={profile.settings.currency} onValueChange={(v) => {
                      toggleSetting('currency', v);
                      setIsCurrencyOpen(false);
                    }}>
                      <SelectTrigger className="h-12 rounded-none border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                        <SelectValue placeholder="Select Currency" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                        <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
                        <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                        <SelectItem value="EUR">€ EUR (Euro)</SelectItem>
                        <SelectItem value="GBP">£ GBP (British Pound)</SelectItem>
                        <SelectItem value="JPY">¥ JPY (Japanese Yen)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </DialogContent>
              </Dialog>

              <button className="w-full flex items-center justify-between p-4 rounded-[2rem] hover:bg-primary/5 transition-all group" onClick={() => setIsPaymentMethodsOpen(true)}>
                <div className="flex items-center gap-4">
                  <div className="bg-green-500/10 p-2.5 rounded-2xl text-green-600 dark:text-green-400">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-sm dark:text-white">Payment Methods</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <Dialog open={isPaymentMethodsOpen} onOpenChange={setIsPaymentMethodsOpen}>
                <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight dark:text-white">Accounts</DialogTitle>
                    <DialogDescription className="font-medium">Manage your bank accounts and wallets.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                      <Input 
                        value={newAccount} 
                        onChange={(e) => setNewAccount(e.target.value)} 
                        placeholder="Account name (e.g. HDFC Bank)" 
                        className="h-12 rounded-xl border-2 dark:bg-black/20 dark:border-white/10 dark:text-white" 
                      />
                      <Button onClick={handleAddAccount} className="h-12 px-4 rounded-xl font-black">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto p-1">
                      {(profile.bankAccounts || []).map(acc => (
                        <div key={acc} className="flex items-center justify-between p-3 rounded-xl bg-accent/5 dark:bg-white/5">
                          <span className="text-sm font-bold dark:text-white">{acc}</span>
                          <button onClick={() => handleRemoveAccount(acc)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <button className="w-full flex items-center justify-between p-4 rounded-[2rem] hover:bg-primary/5 transition-all group" onClick={() => (window as any).setActiveTab?.('family')}>
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-500/10 p-2.5 rounded-2xl text-indigo-600 dark:text-indigo-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-sm dark:text-white">Family Sharing</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <button className="w-full flex items-center justify-between p-4 rounded-[2rem] hover:bg-primary/5 transition-all group" onClick={handleBackup}>
                <div className="flex items-center gap-4">
                  <div className="bg-cyan-500/10 p-2.5 rounded-2xl text-cyan-600 dark:text-cyan-400">
                    <Download className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-sm dark:text-white">Export Data (JSON)</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <label className="w-full flex items-center justify-between p-4 rounded-[2rem] hover:bg-primary/5 transition-all group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="bg-rose-500/10 p-2.5 rounded-2xl text-rose-600 dark:text-rose-400">
                    <Upload className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-sm dark:text-white">Import Data (JSON)</span>
                </div>
                <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </label>

              <button 
                className="w-full flex items-center justify-between p-4 rounded-[2rem] hover:bg-primary/5 transition-all group" 
                onClick={onCheckForUpdates}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-amber-500/10 p-2.5 rounded-2xl text-amber-600 dark:text-amber-400">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm dark:text-white">Check for Updates</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest leading-none mt-1">Manual Update</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="p-4 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-70 dark:text-white/60">Initial Balance ({profile.settings.currency})</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={profile.settings.initialBalance || 0} 
                    onChange={(e) => toggleSetting('initialBalance', parseFloat(e.target.value))}
                    className="h-12 rounded-xl border-2 font-bold dark:bg-black/20 dark:border-white/10 dark:text-white"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium px-1">This will be added to your transaction-based balance.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      

      {/* Logout Button */}
      <Button 
        variant="ghost" 
        className="w-full h-16 rounded-[2rem] font-black text-destructive hover:bg-destructive/5 hover:text-destructive transition-all flex items-center justify-center gap-3 mt-8"
        onClick={() => auth.signOut()}
      >
        <LogOut className="h-6 w-6" />
        Sign Out
      </Button>

      <div className="flex flex-col items-center justify-center mt-12 pb-8 space-y-4 pt-8 border-t border-muted/30">
        <Logo showText size="md" className="opacity-80 hover:opacity-100 transition-opacity" />
        <div className="text-center">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">FinTrack Pro <span className="text-primary/50">Enterprise Edition</span></p>
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-50">Version {APP_VERSION} (Build {BUILD_NUMBER})</p>
        </div>
      </div>
    </div>
  );
}
