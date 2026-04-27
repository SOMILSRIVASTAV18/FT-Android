import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, UserProfile } from '../types';
import { db, collection, onSnapshot, query, where, orderBy, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Landmark, CreditCard, ArrowUpRight, ArrowDownRight, Search, FileText, Download, Wallet, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

interface PassbookProps {
  userId: string;
  profile: UserProfile;
}

export function Passbook({ userId, profile }: PassbookProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const currency = profile.settings.currency || 'INR';

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'transactions (passbook)');
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const accountGroups = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(tx => {
      const mode = tx.paymentMode || 'Cash';
      if (!groups[mode]) groups[mode] = [];
      groups[mode].push(tx);
    });
    return groups;
  }, [transactions]);

  const accountStats = useMemo(() => {
    return Object.entries(accountGroups).map(([account, accTxs]: [string, Transaction[]]) => {
      const balance = accTxs.reduce((acc: number, tx: Transaction) => {
        return tx.type === 'income' ? acc + tx.amount : acc - tx.amount;
      }, 0);
      return { account, balance, count: accTxs.length };
    });
  }, [accountGroups]);

  const filteredTransactions = (account: string) => {
    const list = accountGroups[account] || [];
    return list.filter(tx => 
      (tx.description || '').toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase())
    );
  };

  const exportPDF = async (account: string) => {
    try {
      const doc = new jsPDF();
      const accountTxs = accountGroups[account] || [];
      
      doc.setFontSize(22);
      doc.setTextColor(139, 92, 246);
      doc.text(`${account} Passbook`, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated for: ${profile?.displayName || profile?.email || 'User'}`, 14, 28);
      doc.text(`Date: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 14, 33);

      const tableData = accountTxs.map(tx => [
        format(tx.date.toDate(), 'yyyy-MM-dd'),
        tx.category,
        tx.description || '-',
        tx.type.toUpperCase(),
        `${currency} ${tx.amount.toLocaleString()}`
      ]);

      autoTable(doc, {
        head: [['Date', 'Category', 'Description', 'Type', 'Amount']],
        body: tableData,
        startY: 40,
        headStyles: { fillColor: [139, 92, 246], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 9 },
      });

      const fileName = `${account}_Passbook_${format(new Date(), 'yyyyMMdd')}.pdf`;

      if (Capacitor.getPlatform() !== 'web') {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: `${account} Passbook`,
          url: savedFile.uri,
        });
      } else {
        try {
          doc.save(fileName);
        } catch (saveErr) {
          console.error('doc.save failed, trying blob fallback', saveErr);
          const pdfOutput = doc.output('blob');
          const url = URL.createObjectURL(pdfOutput);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
      toast.success('Passbook exported successfully');
    } catch (error) {
      console.error('PDF Export failed', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight dark:text-white">Custom Passbook</h2>
          <p className="text-muted-foreground text-sm font-medium">Account-wise transaction history</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search transactions..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 rounded-2xl border-2 glass font-bold dark:bg-black/20 dark:border-white/10 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {accountStats.map((stat) => (
          <Card key={stat.account} className="rounded-[2rem] border-none glass shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              {stat.account === 'Cash' ? <Coins className="h-16 w-16" /> : <Landmark className="h-16 w-16" />}
            </div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {stat.account === 'Cash' ? <Wallet className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
                  </div>
                  <h3 className="font-black text-sm dark:text-white">{stat.account}</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                  onClick={() => exportPDF(stat.account)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Available Balance</p>
                <p className={cn(
                  "text-2xl font-black tracking-tighter",
                  stat.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {currency} {stat.balance.toLocaleString()}
                </p>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground mt-4 uppercase tracking-widest">{stat.count} Transactions</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="All" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="bg-transparent h-auto p-0 gap-2">
            <TabsTrigger 
              value="All"
              className="rounded-xl px-4 py-2 border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold text-xs transition-all dark:text-white/60 dark:data-[state=active]:text-white"
            >
              All History
            </TabsTrigger>
            {Object.keys(accountGroups).map(account => (
              <TabsTrigger 
                key={account} 
                value={account}
                className="rounded-xl px-4 py-2 border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold text-xs transition-all dark:text-white/60 dark:data-[state=active]:text-white"
              >
                {account}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="All" className="space-y-4 mt-6">
          {transactions.filter(tx => 
            (tx.description || '').toLowerCase().includes(search.toLowerCase()) ||
            tx.category.toLowerCase().includes(search.toLowerCase())
          ).map((tx) => (
            <div key={tx.id}>
              <TransactionCard tx={tx} currency={currency} />
            </div>
          ))}
        </TabsContent>

        {Object.keys(accountGroups).map(account => (
          <TabsContent key={account} value={account} className="space-y-4 mt-6">
            <div className="flex justify-end mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl border-2 font-bold h-10 px-4"
                onClick={() => exportPDF(account)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Export {account} PDF
              </Button>
            </div>
            {filteredTransactions(account).map((tx) => (
              <div key={tx.id}>
                <TransactionCard tx={tx} currency={currency} />
              </div>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function TransactionCard({ tx, currency }: { tx: Transaction, currency: string }) {
  return (
    <Card className="rounded-[2rem] border-none glass overflow-hidden border border-white/20 shadow-lg">
      <CardContent className="p-6 flex items-center gap-5">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
          tx.type === 'income' ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
        )}>
          {tx.type === 'income' ? <ArrowUpRight className="h-7 w-7" /> : <ArrowDownRight className="h-7 w-7" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-black text-sm truncate dark:text-white">{tx.category}</h4>
            <span className="text-[10px] font-bold text-muted-foreground">{format(tx.date.toDate(), 'MMM dd, yyyy')}</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground truncate mb-2">{tx.description || 'No description'}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-lg dark:bg-primary/20 dark:text-white">
              {tx.paymentMode || 'Cash'}
            </span>
            <span className={cn(
              "text-lg font-black tracking-tight",
              tx.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {tx.type === 'income' ? '+' : '-'}{currency} {tx.amount.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
