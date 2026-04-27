import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, UserProfile, Family, Budget } from '../types';
import { db, collection, addDoc, deleteDoc, doc, query, where, onSnapshot, handleFirestoreError, OperationType, Timestamp, auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { PieChart } from 'recharts';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface BudgetsProps {
  transactions: Transaction[];
  profile: UserProfile;
  family: Family | null;
}

export function Budgets({ transactions, profile, family }: BudgetsProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'budgets'), where('userId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'budgets');
      }
    });

    return () => unsubscribe();
  }, [profile.uid]);

  // Listen to family budgets if applicable
  useEffect(() => {
    if (!profile.familyId) return;
    const q = query(collection(db, 'budgets'), where('familyId', '==', profile.familyId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const familyBudgets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
      setBudgets(prev => {
        const combined = [...prev, ...familyBudgets];
        return Array.from(new Map(combined.map(item => [item.id, item])).values());
      });
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'budgets (family)');
      }
    });
    return () => unsubscribe();
  }, [profile.familyId]);

  const budgetStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const currentMonthTxs = transactions.filter(tx => {
      const txDate = tx.date.toDate();
      return tx.type === 'expense' && isWithinInterval(txDate, { start: monthStart, end: monthEnd });
    });

    return budgets.map(budget => {
      const spent = currentMonthTxs
        .filter(tx => tx.category === budget.category && (budget.familyId ? tx.familyId === budget.familyId : tx.userId === budget.userId))
        .reduce((acc, tx) => acc + tx.amount, 0);
      
      const percent = budget.limit > 0 ? Math.min((spent / budget.limit) * 100, 100) : 0;
      return { ...budget, spent, percent };
    });
  }, [budgets, transactions]);

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast.error('Please select a category');
      return;
    }
    try {
      const budgetData = {
        userId: profile.uid,
        familyId: profile.familyId || null,
        category,
        limit: parseFloat(limit),
        spent: 0,
        period: 'monthly',
        createdAt: Timestamp.now()
      };
      console.log('Creating budget:', budgetData);
      await addDoc(collection(db, 'budgets'), budgetData);
      toast.success('Budget set successfully');
      setIsAddOpen(false);
      setCategory('');
      setLimit('');
    } catch (error) {
      console.error('Budget creation error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
      toast.error('Failed to set budget');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'budgets', id));
      toast.success('Budget removed');
    } catch (error) {
      toast.error('Failed to remove budget');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight dark:text-white">Budgets</h2>
          <p className="text-muted-foreground text-sm font-medium">Control your monthly spending</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="h-12 px-6 font-black rounded-2xl shadow-lg shadow-primary/20" />}>
            <Plus className="mr-2 h-5 w-5" />
            Set Limit
          </DialogTrigger>
          <DialogContent className="glass border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Monthly Budget</DialogTitle>
              <DialogDescription className="font-medium">Track your spending for a specific category.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddBudget} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                    {profile.categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Monthly Limit</Label>
                <Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className="h-12 rounded-xl border-2" required />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20">Save Budget</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {budgetStats.map((budget) => (
          <Card key={budget.id} className={cn(
            "border-none glass shadow-xl relative overflow-hidden group rounded-[2.5rem]",
            budget.percent >= 90 ? "ring-2 ring-destructive/20" : ""
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black tracking-tight dark:text-white">{budget.category}</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {budget.familyId ? 'Family Shared' : 'Personal'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBudget(budget.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Spent</p>
                  <p className={cn(
                    "text-2xl font-black tracking-tighter",
                    budget.percent >= 90 ? "text-destructive" : "text-primary"
                  )}>
                    {profile.settings.currency}{budget.spent.toLocaleString()}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limit</p>
                  <p className="text-lg font-bold tracking-tight">
                    {profile.settings.currency}{budget.limit.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className={cn(
                    budget.percent >= 100 ? "text-destructive" : budget.percent >= 80 ? "text-amber-500" : "text-emerald-500"
                  )}>
                    {budget.percent >= 100 ? 'Limit Exceeded' : budget.percent >= 80 ? 'Warning' : 'Healthy'}
                  </span>
                  <span className="text-muted-foreground">{Math.round(budget.percent)}%</span>
                </div>
                <div className="h-3 w-full bg-muted/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${budget.percent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full shadow-sm",
                      budget.percent >= 100 ? "bg-destructive" : budget.percent >= 80 ? "bg-amber-500" : "bg-primary"
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center">
                  {budget.percent >= 100 ? (
                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-destructive bg-destructive/10 px-2 py-1 rounded-lg">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Over Budget
                    </div>
                  ) : budget.percent >= 80 ? (
                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-2 py-1 rounded-lg">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Almost Full
                    </div>
                  ) : (
                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      On Track
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-bold text-muted-foreground">
                  {profile.settings.currency}{(budget.limit - budget.spent).toLocaleString()} left
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {budgetStats.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border-4 border-dashed rounded-[40px] glass border-muted/20">
            <div className="w-20 h-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
              <PieChart className="h-10 w-10 opacity-40" />
            </div>
            <h3 className="text-xl font-black tracking-tight text-foreground dark:text-white">No Budgets Set</h3>
            <p className="font-medium text-sm mt-1">Start tracking your spending limits today.</p>
            <Button variant="outline" className="mt-6 rounded-xl font-bold border-2" onClick={() => setIsAddOpen(true)}>
              Create First Budget
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
