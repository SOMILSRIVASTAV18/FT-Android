import React, { useState, useEffect } from 'react';
import { FinancialGoal, UserProfile } from '../types';
import { db, collection, addDoc, deleteDoc, doc, query, where, onSnapshot, updateDoc, Timestamp, handleFirestoreError, OperationType, auth } from '../lib/firebase';
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
import { Plus, Trash2, Target, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface GoalsProps {
  profile: UserProfile;
}

export function Goals({ profile }: GoalsProps) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'goals'), where('userId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialGoal)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'goals');
      }
    });
    return () => unsubscribe();
  }, [profile.uid]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const target = parseFloat(targetAmount);
      const current = parseFloat(currentAmount) || 0;
      if (isNaN(target) || target <= 0) {
        toast.error('Please enter a valid target amount');
        return;
      }
      if (!name.trim()) {
        toast.error('Please enter a goal name');
        return;
      }

      await addDoc(collection(db, 'goals'), {
        userId: profile.uid,
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
        createdAt: Timestamp.now(),
      });
      toast.success('Goal added successfully');
      setIsAddOpen(false);
      setName('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'goals');
      toast.error('Failed to add goal');
    }
  };

  const handleUpdateProgress = async (goal: FinancialGoal, amount: number) => {
    try {
      const newAmount = Math.max(0, goal.currentAmount + amount);
      await updateDoc(doc(db, 'goals', goal.id), {
        currentAmount: newAmount
      });

      if (amount > 0) {
        try {
          await addDoc(collection(db, 'transactions'), {
            userId: profile.uid,
            familyId: profile.familyId || null,
            amount: amount,
            type: 'expense',
            category: 'Savings',
            description: `Goal Contribution: ${goal.name}`,
            date: Timestamp.now(),
            isFamily: !!profile.familyId,
            paymentMode: 'Account'
          });
        } catch (txErr) {
          console.error('Failed to record transaction for goal', txErr);
        }
      }

      toast.success('Progress updated & transaction recorded');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${goal.id}`);
      toast.error('Failed to update progress');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'goals', id));
      toast.success('Goal removed');
    } catch (error) {
      toast.error('Failed to remove goal');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight dark:text-white">Financial Goals</h2>
          <p className="text-muted-foreground text-sm font-medium">Save for what matters most</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="h-11 px-5 font-black rounded-xl shadow-lg shadow-primary/20 w-full md:w-auto" />}>
            <Plus className="mr-2 h-5 w-5" />
            New Goal
          </DialogTrigger>
          <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Create Savings Goal</DialogTitle>
              <DialogDescription className="font-medium">What are you saving for?</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddGoal} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Goal Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New Car, Vacation" className="h-12 rounded-xl border-2" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1">Target Amount</Label>
                  <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} className="h-12 rounded-xl border-2" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1">Initial Savings</Label>
                  <Input type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} className="h-12 rounded-xl border-2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Deadline (Optional)</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-12 rounded-xl border-2" />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20">Start Saving</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {goals.map((goal) => {
          const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const isCompleted = percent >= 100;

          return (
            <Card key={goal.id} className={cn(
              "border-none glass shadow-xl relative overflow-hidden group rounded-[2.5rem]",
              isCompleted ? "ring-2 ring-green-500/20" : ""
            )}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-3 rounded-2xl",
                    isCompleted ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
                  )}>
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight dark:text-white">{goal.name}</CardTitle>
                    {goal.deadline && (
                      <CardDescription className="flex items-center text-[10px] font-bold uppercase tracking-widest mt-0.5">
                        <Calendar className="h-3 w-3 mr-1" />
                        Target: {format(goal.deadline.toDate(), 'MMM dd, yyyy')}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteGoal(goal.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Saved</p>
                    <p className="text-2xl font-black tracking-tighter text-primary">
                      {profile.settings.currency}{goal.currentAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target</p>
                    <p className="text-lg font-bold tracking-tight">
                      {profile.settings.currency}{goal.targetAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className={isCompleted ? "text-green-600" : "text-primary"}>
                      {isCompleted ? 'Goal Reached!' : `${Math.round(percent)}% Complete`}
                    </span>
                    <span className="text-muted-foreground">{profile.settings.currency}{(goal.targetAmount - goal.currentAmount).toLocaleString()} left</span>
                  </div>
                  <Progress value={percent} className="h-3 rounded-full bg-muted/30" />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-10 rounded-xl font-bold border-2"
                    onClick={() => handleUpdateProgress(goal, 100)}
                  >
                    + {profile.settings.currency}100
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 h-10 rounded-xl font-bold border-2"
                    onClick={() => handleUpdateProgress(goal, 500)}
                  >
                    + {profile.settings.currency}500
                  </Button>
                  {isCompleted && (
                    <div className="flex items-center justify-center bg-green-500/10 text-green-600 px-4 rounded-xl">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {goals.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border-4 border-dashed rounded-[40px] glass border-muted/20">
            <div className="w-20 h-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
              <TrendingUp className="h-10 w-10 opacity-40" />
            </div>
            <h3 className="text-xl font-black tracking-tight text-foreground dark:text-white">No Goals Set</h3>
            <p className="font-medium text-sm mt-1">What are you dreaming of? Start saving today.</p>
            <Button variant="outline" className="mt-6 rounded-xl font-bold border-2" onClick={() => setIsAddOpen(true)}>
              Set Your First Goal
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
