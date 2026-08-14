import React, { useState, useEffect } from 'react';
import { Subscription, UserProfile } from '../types';
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
import { Plus, Trash2, Calendar, RefreshCw, Play, Music, Monitor, Smartphone, Globe, Shield, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths, addYears } from 'date-fns';
import { cn } from '@/lib/utils';

interface SubscriptionsProps {
  profile: UserProfile;
}

export function Subscriptions({ profile }: SubscriptionsProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'subscriptions'), where('userId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'subscriptions');
      }
    });
    return () => unsubscribe();
  }, [profile.uid]);

  const handleAddSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }
      if (!name.trim()) {
        toast.error('Please enter a service name');
        return;
      }
      if (!nextBillingDate) {
        toast.error('Please select a billing date');
        return;
      }

      await addDoc(collection(db, 'subscriptions'), {
        userId: profile.uid,
        name: name.trim(),
        amount: parsedAmount,
        billingCycle,
        nextBillingDate: Timestamp.fromDate(new Date(nextBillingDate)),
        category: category.trim() || 'Subscriptions',
        isActive: true,
      });
      toast.success('Subscription added');
      setIsAddOpen(false);
      setName('');
      setAmount('');
      setNextBillingDate('');
      setCategory('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'subscriptions');
      toast.error('Failed to add subscription');
    }
  };

  const handleToggleActive = async (sub: Subscription) => {
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        isActive: !sub.isActive
      });
      toast.success(sub.isActive ? 'Subscription paused' : 'Subscription resumed');
    } catch (error) {
      toast.error('Failed to update subscription');
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'subscriptions', id));
      toast.success('Subscription removed');
    } catch (error) {
      toast.error('Failed to remove subscription');
    }
  };

  const totalMonthly = subscriptions
    .filter(s => s.isActive)
    .reduce((acc, s) => acc + (s.billingCycle === 'monthly' ? s.amount : s.amount / 12), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight dark:text-white">Subscriptions</h2>
          <p className="text-muted-foreground text-sm font-medium">Manage your recurring services</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="h-12 px-6 font-black rounded-2xl shadow-lg shadow-primary/20" />}>
            <Plus className="mr-2 h-5 w-5" />
            Add Sub
          </DialogTrigger>
          <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Track Subscription</DialogTitle>
              <DialogDescription className="font-medium">Keep track of your digital services.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubscription} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Service Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix, Spotify" className="h-12 rounded-xl border-2" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1">Amount</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 rounded-xl border-2" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1">Cycle</Label>
                  <Select value={billingCycle} onValueChange={(v: any) => setBillingCycle(v)}>
                    <SelectTrigger className="h-12 rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Next Billing Date</Label>
                <Input type="date" value={nextBillingDate} onChange={(e) => setNextBillingDate(e.target.value)} className="h-12 rounded-xl border-2" required />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20">Add Subscription</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none glass shadow-xl rounded-[2.5rem] overflow-hidden">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Monthly Burn Rate</p>
              <h3 className="text-2xl font-black tracking-tight dark:text-white">{profile.settings.currency}{totalMonthly.toFixed(2)}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Subs</p>
            <p className="text-2xl font-black text-primary">{subscriptions.filter(s => s.isActive).length}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {subscriptions.map((sub) => (
          <Card key={sub.id} className={cn(
            "border-none glass shadow-lg rounded-[2rem] overflow-hidden transition-all",
            !sub.isActive && "opacity-60 grayscale"
          )}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {sub.name.toLowerCase().includes('netflix') || sub.name.toLowerCase().includes('prime') ? <Monitor className="h-6 w-6" /> :
                 sub.name.toLowerCase().includes('spotify') || sub.name.toLowerCase().includes('music') ? <Music className="h-6 w-6" /> :
                 sub.name.toLowerCase().includes('icloud') || sub.name.toLowerCase().includes('google') ? <Globe className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-sm font-black truncate dark:text-white">{sub.name}</h3>
                  <span className="text-sm font-black text-primary">
                    {profile.settings.currency}{sub.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{sub.billingCycle}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(sub.nextBillingDate.toDate(), 'MMM dd')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-500/10" 
                  onClick={async () => {
                    try {
                      await addDoc(collection(db, 'transactions'), {
                        userId: profile.uid,
                        familyId: profile.familyId || null,
                        amount: sub.amount,
                        type: 'expense',
                        category: sub.category || 'Subscriptions',
                        description: `Subscription Payment: ${sub.name}`,
                        date: Timestamp.now(),
                        isFamily: !!profile.familyId,
                        paymentMode: 'Account'
                      });
                      toast.success('Payment recorded in transactions');
                    } catch (error) {
                      toast.error('Failed to record payment');
                    }
                  }}
                  title="Record Payment"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary" onClick={() => handleToggleActive(sub)}>
                  {sub.isActive ? <Play className="h-4 w-4 fill-current" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSubscription(sub.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
