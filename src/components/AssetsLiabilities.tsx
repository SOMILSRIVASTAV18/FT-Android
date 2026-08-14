import React, { useState, useEffect } from 'react';
import { Asset, Liability, UserProfile } from '../types';
import { db, collection, addDoc, deleteDoc, doc, query, where, onSnapshot, updateDoc, Timestamp, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Trash2, Landmark, Wallet, Briefcase, Home, CreditCard, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AssetsLiabilitiesProps {
  profile: UserProfile;
}

export function AssetsLiabilities({ profile }: AssetsLiabilitiesProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addType, setAddType] = useState<'asset' | 'liability'>('asset');
  
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [subType, setSubType] = useState('');

  useEffect(() => {
    const qAssets = query(collection(db, 'assets'), where('userId', '==', profile.uid));
    const unsubscribeAssets = onSnapshot(qAssets, (snapshot) => {
      setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'assets');
      }
    });

    const qLiabilities = query(collection(db, 'liabilities'), where('userId', '==', profile.uid));
    const unsubscribeLiabilities = onSnapshot(qLiabilities, (snapshot) => {
      setLiabilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Liability)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'liabilities');
      }
    });

    return () => {
      unsubscribeAssets();
      unsubscribeLiabilities();
    };
  }, [profile.uid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const collectionName = addType === 'asset' ? 'assets' : 'liabilities';
      await addDoc(collection(db, collectionName), {
        userId: profile.uid,
        name,
        [addType === 'asset' ? 'value' : 'amount']: parseFloat(amount),
        type: subType,
        lastUpdated: Timestamp.now(),
      });
      toast.success(`${addType.charAt(0).toUpperCase() + addType.slice(1)} added`);
      setIsAddOpen(false);
      setName('');
      setAmount('');
      setSubType('');
    } catch (error) {
      toast.error(`Failed to add ${addType}`);
    }
  };

  const handleDelete = async (id: string, type: 'asset' | 'liability') => {
    try {
      await deleteDoc(doc(db, type === 'asset' ? 'assets' : 'liabilities', id));
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} removed`);
    } catch (error) {
      toast.error(`Failed to remove ${type}`);
    }
  };

  const totalAssets = assets.reduce((acc, a) => acc + a.value, 0);
  const totalLiabilities = liabilities.reduce((acc, l) => acc + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight dark:text-white">Net Worth Tracker</h2>
          <p className="text-muted-foreground text-sm font-medium">Manage your assets and liabilities</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="h-12 px-6 font-black rounded-2xl shadow-lg shadow-primary/20" />}>
            <Plus className="mr-2 h-5 w-5" />
            Add Item
          </DialogTrigger>
          <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Add Financial Item</DialogTitle>
              <DialogDescription className="font-medium">Track your wealth or debts.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Type</Label>
                <Select value={addType} onValueChange={(v: any) => { setAddType(v); setSubType(''); }}>
                  <SelectTrigger className="h-12 rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                    <SelectItem value="asset">Asset (Wealth)</SelectItem>
                    <SelectItem value="liability">Liability (Debt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Savings Account, Car Loan" className="h-12 rounded-xl border-2" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Amount / Value</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 rounded-xl border-2" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Category</Label>
                <Select value={subType} onValueChange={setSubType}>
                  <SelectTrigger className="h-12 rounded-none border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                    {addType === 'asset' ? (
                      <>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank Account</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="property">Property</SelectItem>
                        <SelectItem value="other">Other Asset</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="loan">Personal Loan</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="mortgage">Mortgage</SelectItem>
                        <SelectItem value="other">Other Liability</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20">Add to Tracker</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none glass shadow-2xl rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Estimated Net Worth</p>
              <h3 className={cn(
                "text-5xl font-black tracking-tighter",
                netWorth >= 0 ? "text-primary" : "text-destructive"
              )}>
                {profile.settings.currency}{netWorth.toLocaleString()}
              </h3>
            </div>
            <div className="flex gap-8">
              <div className="text-center md:text-right space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center justify-center md:justify-end">
                  <TrendingUp className="h-3 w-3 mr-1" /> Assets
                </p>
                <p className="text-xl font-black dark:text-white">{profile.settings.currency}{totalAssets.toLocaleString()}</p>
              </div>
              <div className="text-center md:text-right space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive flex items-center justify-center md:justify-end">
                  <TrendingDown className="h-3 w-3 mr-1" /> Liabilities
                </p>
                <p className="text-xl font-black dark:text-white">{profile.settings.currency}{totalLiabilities.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Assets List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 dark:text-white">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Assets
            </h3>
            <span className="text-xs font-bold text-muted-foreground">{assets.length} items</span>
          </div>
          <div className="space-y-3">
            {assets.map((asset) => (
              <Card key={asset.id} className="border-none glass shadow-lg rounded-[2rem] overflow-hidden group">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    {asset.type === 'bank' ? <Landmark className="h-6 w-6" /> : 
                     asset.type === 'investment' ? <Briefcase className="h-6 w-6" /> :
                     asset.type === 'property' ? <Home className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black truncate dark:text-white">{asset.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{asset.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">+{profile.settings.currency}{asset.value.toLocaleString()}</p>
                    <button onClick={() => handleDelete(asset.id, 'asset')} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Liabilities List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 dark:text-white">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Liabilities
            </h3>
            <span className="text-xs font-bold text-muted-foreground">{liabilities.length} items</span>
          </div>
          <div className="space-y-3">
            {liabilities.map((liability) => (
              <Card key={liability.id} className="border-none glass shadow-lg rounded-[2rem] overflow-hidden group">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                    {liability.type === 'credit_card' ? <CreditCard className="h-6 w-6" /> : <Landmark className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black truncate dark:text-white">{liability.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{liability.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-destructive">-{profile.settings.currency}{liability.amount.toLocaleString()}</p>
                    <button onClick={() => handleDelete(liability.id, 'liability')} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
