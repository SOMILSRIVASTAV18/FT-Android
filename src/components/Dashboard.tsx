import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, UserProfile, Family, Budget } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Receipt,
  Target,
  Users,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Lightbulb,
  QrCode
} from 'lucide-react';
import { db, collection, query, where, onSnapshot, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';

interface DashboardProps {
  transactions: Transaction[];
  profile: UserProfile;
  family: Family | null;
  onTabChange?: (tab: string) => void;
}

const COLORS = [
  'oklch(0.6 0.2 260)', 
  'oklch(0.6 0.2 160)', 
  'oklch(0.6 0.2 60)', 
  'oklch(0.6 0.2 300)', 
  'oklch(0.6 0.2 200)', 
  'oklch(0.6 0.2 100)', 
  'oklch(0.6 0.2 20)'
];

export function Dashboard({ transactions: allTransactions, profile, family, onTabChange }: DashboardProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'budgets'), where('userId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'budgets (dashboard)');
      }
    });
    return () => unsubscribe();
  }, [profile.uid]);

  const transactions = allTransactions;

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const currentMonthTxs = transactions.filter(tx => {
      const txDate = tx.date.toDate();
      return isWithinInterval(txDate, { start: monthStart, end: monthEnd });
    });

    const income = currentMonthTxs
      .filter(tx => tx.type === 'income')
      .reduce((acc, tx) => acc + tx.amount, 0);

    const expense = currentMonthTxs
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => acc + tx.amount, 0);

    const balance = transactions.reduce((acc, tx) => {
      if (tx.type === 'income') return acc + tx.amount;
      if (tx.type === 'expense') return acc - tx.amount;
      return acc;
    }, profile.settings.initialBalance || 0);

    return { income, expense, balance };
  }, [transactions]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'MMM dd');
    }).reverse();

    return last7Days.map(day => {
      const dayTxs = transactions.filter(tx => format(tx.date.toDate(), 'MMM dd') === day);
      return {
        name: day,
        income: dayTxs.filter(tx => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0),
        expense: dayTxs.filter(tx => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0),
      };
    });
  }, [transactions]);

  const categoryData = useMemo(() => {
    const expenses = transactions.filter(tx => tx.type === 'expense');
    const categories = Array.from(new Set(expenses.map(tx => tx.category)));
    return categories.map(cat => ({
      name: cat,
      value: expenses.filter(tx => tx.category === cat).reduce((acc, tx) => acc + tx.amount, 0)
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-8"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-black tracking-tight truncate dark:text-white uppercase tracking-tighter">Hi, {profile?.displayName || 'User'}</h2>
            <p className="text-muted-foreground text-[10px] md:text-sm font-medium uppercase tracking-widest opacity-80">Welcome back to FinTrack Pro</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onTabChange?.('family')}
            className="rounded-full border-primary/20 bg-primary/5 text-primary font-bold shrink-0 h-9 md:h-11 px-3.5 md:px-5 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Users className="mr-1.5 md:mr-2 h-4 w-4" />
            <span className="text-xs md:text-sm uppercase tracking-widest hidden sm:inline">Family</span>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-5 gap-2 md:gap-4">
        {[
          { icon: QrCode, label: 'Scan & Pay', tab: 'upi-scanner', color: 'bg-gradient-to-br from-indigo-500 to-violet-600' },
          { icon: ArrowLeftRight, label: 'Activity', tab: 'transactions', color: 'bg-blue-500' },
          { icon: Users, label: 'Split', tab: 'splits', color: 'bg-orange-500' },
          { icon: Receipt, label: 'Bills', tab: 'bills', color: 'bg-emerald-500' },
          { icon: Target, label: 'Goals', tab: 'goals', color: 'bg-purple-500' },
        ].map((action) => (
          <button
            key={action.label}
            onClick={() => onTabChange?.(action.tab)}
            className="flex flex-col items-center gap-1.5 md:gap-2 group"
          >
            <div className={cn(
              "w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-active:scale-90",
              action.color
            )}>
              <action.icon className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <span className="text-[8.5px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider text-muted-foreground text-center">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Main Balance Card */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden border-none bg-primary text-primary-foreground shadow-2xl shadow-primary/40 relative">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Wallet className="h-32 w-32 rotate-12" />
          </div>
          <CardContent className="p-6 md:p-8 relative z-10">
            <div className="space-y-1 mb-6 md:mb-8">
              <p className="text-primary-foreground/80 text-[10px] md:text-sm font-bold uppercase tracking-widest">Current Balance</p>
              <div className="text-3xl md:text-5xl font-black tracking-tight">
                {profile.settings.currency} {stats.balance.toLocaleString()}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 md:p-4 flex items-center gap-2 md:gap-3 border border-white/10">
                <div className="bg-green-500/30 p-1.5 md:p-2 rounded-xl">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider opacity-80">Income</p>
                  <p className="text-sm md:text-lg font-black truncate">+{profile.settings.currency}{stats.income.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 md:p-4 flex items-center gap-2 md:gap-3 border border-white/10">
                <div className="bg-red-500/30 p-1.5 md:p-2 rounded-xl">
                  <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider opacity-80">Expenses</p>
                  <p className="text-sm md:text-lg font-black truncate">-{profile.settings.currency}{stats.expense.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Main Chart */}
        <motion.div variants={itemVariants} className="md:col-span-4">
          <Card className="h-full border-none glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">Spending Trends</CardTitle>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Income</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Expense</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${profile.settings.currency}${value}`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        backdropFilter: 'blur(10px)', 
                        borderRadius: '16px', 
                        border: '1px solid var(--border)', 
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)' 
                      }}
                      itemStyle={{ color: 'var(--foreground)' }}
                      cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
                    />
                    <Bar dataKey="income" fill="oklch(0.7 0.15 160)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="oklch(0.7 0.15 25)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div variants={itemVariants} className="md:col-span-3">
          <Card className="h-full border-none glass">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Top Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--card)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--border)', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                      }}
                      itemStyle={{ color: 'var(--foreground)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-black tracking-tight dark:text-white">Recent Activity</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onTabChange?.('transactions')}
            className="text-primary font-bold text-xs hover:bg-primary/10 dark:text-primary-foreground"
          >
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 md:p-4 rounded-[2rem] glass hover:bg-primary/5 transition-all group border border-white/10">
              <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
                <div className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm",
                  tx.type === 'income' ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/20 text-red-600 dark:text-red-400"
                )}>
                  {tx.type === 'income' ? <ArrowUpRight className="h-5 w-5 md:h-6 md:w-6" /> : <ArrowDownRight className="h-5 w-5 md:h-6 md:w-6" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black leading-none truncate dark:text-white">{tx.category}</p>
                  <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5">{format(tx.date.toDate(), 'MMM dd, yyyy')}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={cn(
                  "text-sm md:text-base font-black tracking-tight",
                  tx.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {tx.type === 'income' ? '+' : '-'}{profile.settings.currency}{tx.amount.toLocaleString()}
                </p>
                <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{tx.paymentMode || 'Cash'}</p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-12 glass rounded-[2rem] border-dashed border-2 border-muted/20">
              <p className="text-sm font-bold text-muted-foreground">No recent transactions</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
