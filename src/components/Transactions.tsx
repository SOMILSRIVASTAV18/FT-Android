import React, { useState } from 'react';
import { Transaction, UserProfile, Family } from '../types';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
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
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  MessageSquare,
  FileText,
  Table as TableIcon,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Wallet,
  QrCode
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { categorizeTransaction } from '../services/geminiService';
import { Sparkles, Loader2 } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  profile: UserProfile;
  family: Family | null;
  onTabChange?: (tab: string) => void;
}

export function Transactions({ transactions, profile, family, onTabChange }: TransactionsProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [isFamily, setIsFamily] = useState(!!profile.familyId);
  const [isCategorizing, setIsCategorizing] = useState(false);

  // PDF Export Filters
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  const [pdfDuration, setPdfDuration] = useState<'10days' | '15days' | '1month' | '1year' | 'custom' | 'all'>('all');
  const [pdfStartDate, setPdfStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pdfEndDate, setPdfEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const paymentModes = [
    'Cash',
    ...(profile.bankAccounts || [])
  ];

  const detectedAccounts = profile.bankAccounts || [];

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccount || !toAccount || fromAccount === toAccount) {
      toast.error('Please select different accounts');
      return;
    }
    try {
      const amount = parseFloat(transferAmount);
      // Create two transactions: one expense (from) and one income (to)
      // Or just one 'transfer' type if we want to keep it simple, but the user said remove transfer from transactions.
      // Actually, I'll create two transactions with a special category 'Transfer'
      
      const commonData = {
        userId: profile.uid,
        amount,
        category: 'Transfer',
        date: Timestamp.now(),
        isFamily: false,
        description: `Transfer from ${fromAccount} to ${toAccount}`
      };

      await addDoc(collection(db, 'transactions'), {
        ...commonData,
        type: 'expense',
        paymentMode: fromAccount,
      });

      await addDoc(collection(db, 'transactions'), {
        ...commonData,
        type: 'income',
        paymentMode: toAccount,
      });

      toast.success('Transfer recorded');
      setIsTransferOpen(false);
      setTransferAmount('');
      setFromAccount('');
      setToAccount('');
    } catch (error) {
      toast.error('Failed to record transfer');
    }
  };

  const handleMagicCategorize = async () => {
    if (!description) {
      toast.error('Please enter a description first');
      return;
    }
    setIsCategorizing(true);
    try {
      const suggestedCategory = await categorizeTransaction(description);
      if (profile.categories.includes(suggestedCategory)) {
        setCategory(suggestedCategory);
        toast.success(`Suggested category: ${suggestedCategory}`);
      } else {
        // Find closest match or just set to Other
        setCategory('Other');
        toast.info(`AI suggested "${suggestedCategory}", but it's not in your list.`);
      }
    } catch (error) {
      toast.error('AI categorization failed');
    } finally {
      setIsCategorizing(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    // Show personal transactions OR family transactions added by the current user
    const isPersonal = !tx.familyId && !tx.isFamily;
    const isMyFamilyTx = (tx.familyId || tx.isFamily) && tx.userId === profile.uid;
    
    if (!isPersonal && !isMyFamilyTx) return false;
    
    const matchesSearch = (tx.description || '').toLowerCase().includes(search.toLowerCase()) || 
                          tx.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const txData = {
        userId: profile.uid,
        familyId: isFamily ? (profile.familyId || null) : null,
        amount: parseFloat(amount),
        type,
        category,
        description,
        date: Timestamp.fromDate(new Date(date)),
        isFamily: isFamily,
        paymentMode,
        fromAccount: fromAccount || null,
        toAccount: toAccount || null,
      };

      if (editingId) {
        try {
          await updateDoc(doc(db, 'transactions', editingId), txData);
          toast.success('Transaction updated');
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `transactions/${editingId}`);
        }
      } else {
        try {
          await addDoc(collection(db, 'transactions'), txData);
          toast.success('Transaction added');
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'transactions');
        }
      }
      resetForm();
      setIsAddOpen(false);
    } catch (error) {
      console.error(error);
      // The error is already handled and re-thrown by handleFirestoreError if it came from there
      if (!(error instanceof Error && error.message.includes('operationType'))) {
        toast.error('Failed to save transaction');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setAmount('');
    setType('expense');
    setCategory('');
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentMode('Cash');
    setIsFamily(!!profile.familyId);
    setFromAccount('');
    setToAccount('');
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id!);
    setAmount(tx.amount.toString());
    setType(tx.type);
    setCategory(tx.category);
    setDescription(tx.description || '');
    setDate(format(tx.date.toDate(), 'yyyy-MM-dd'));
    setPaymentMode(tx.paymentMode || 'Cash');
    setFromAccount(tx.fromAccount || '');
    setToAccount(tx.toAccount || '');
    setIsAddOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
      toast.success('Transaction deleted');
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const exportPDF = async () => {
    try {
      const doc = new jsPDF();
      const currency = profile.settings.currency || '$';
      
      // Filter transactions based on selection duration
      const txsToExport = filteredTransactions.filter(tx => {
        const txDate = tx.date.toDate();
        const now = new Date();
        if (pdfDuration === '10days') {
          const limit = new Date();
          limit.setDate(now.getDate() - 10);
          return txDate >= limit;
        }
        if (pdfDuration === '15days') {
          const limit = new Date();
          limit.setDate(now.getDate() - 15);
          return txDate >= limit;
        }
        if (pdfDuration === '1month') {
          const limit = new Date();
          limit.setMonth(now.getMonth() - 1);
          return txDate >= limit;
        }
        if (pdfDuration === '1year') {
          const limit = new Date();
          limit.setFullYear(now.getFullYear() - 1);
          return txDate >= limit;
        }
        if (pdfDuration === 'custom' && pdfStartDate && pdfEndDate) {
          const start = new Date(pdfStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(pdfEndDate);
          end.setHours(23, 59, 59, 999);
          return txDate >= start && txDate <= end;
        }
        return true;
      });

      if (txsToExport.length === 0) {
        toast.info('No transactions found for the selected duration.');
        return;
      }

      // Compute Dashboard Metrics
      const totalIncome = txsToExport
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalSpend = txsToExport
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const netBalance = totalIncome - totalSpend;

      // Expense categories breakdown
      const expenseCategoryTotals: Record<string, number> = {};
      txsToExport.filter(tx => tx.type === 'expense').forEach(tx => {
        expenseCategoryTotals[tx.category] = (expenseCategoryTotals[tx.category] || 0) + tx.amount;
      });
      const sortedExpenseCategories = Object.entries(expenseCategoryTotals)
        .sort((a, b) => b[1] - a[1]);
      const expenseCategoryTable = sortedExpenseCategories.map(([cat, amt]) => {
        const pct = totalSpend > 0 ? ((amt / totalSpend) * 100).toFixed(1) + '%' : '0%';
        return [cat, `${currency} ${amt.toFixed(2)}`, pct];
      });

      // Income categories breakdown
      const incomeCategoryTotals: Record<string, number> = {};
      txsToExport.filter(tx => tx.type === 'income').forEach(tx => {
        incomeCategoryTotals[tx.category] = (incomeCategoryTotals[tx.category] || 0) + tx.amount;
      });
      const sortedIncomeCategories = Object.entries(incomeCategoryTotals)
        .sort((a, b) => b[1] - a[1]);
      const incomeCategoryTable = sortedIncomeCategories.map(([cat, amt]) => {
        const pct = totalIncome > 0 ? ((amt / totalIncome) * 100).toFixed(1) + '%' : '0%';
        return [cat, `${currency} ${amt.toFixed(2)}`, pct];
      });

      // --- PAGE 1: FINANCIAL DASHBOARD & SUMMARY ---
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(124, 58, 237); // Purple theme colors
      doc.text('FinTrack Pro - Activity & Financial Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      
      let dateRangeText = `Generated on: ${format(new Date(), 'dd MMM yyyy')}`;
      if (pdfDuration !== 'all') {
        if (pdfDuration === 'custom') {
          dateRangeText += ` | Range: ${format(new Date(pdfStartDate), 'dd MMM yyyy')} to ${format(new Date(pdfEndDate), 'dd MMM yyyy')}`;
        } else {
          dateRangeText += ` | Duration: Last ${pdfDuration === '10days' ? '10 Days' : pdfDuration === '15days' ? '15 Days' : pdfDuration === '1month' ? '1 Month' : '1 Year'}`;
        }
      }
      doc.text(dateRangeText, 14, 28);
      doc.text(`Account Holder: ${profile.displayName || profile.email || 'User'}`, 14, 33);

      // Dashboard Visual Container Cards
      doc.setFillColor(243, 244, 246);
      doc.rect(14, 38, 182, 32, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 120, 120);
      doc.text('TOTAL INCOME', 24, 46);
      doc.text('TOTAL SPEND', 84, 46);
      doc.text('NET CASH FLOW', 144, 46);

      doc.setFontSize(14);
      doc.setTextColor(5, 150, 105); // emerald green
      doc.text(`${currency} ${totalIncome.toFixed(2)}`, 24, 58);

      doc.setTextColor(220, 38, 38); // red
      doc.text(`${currency} ${totalSpend.toFixed(2)}`, 84, 58);

      if (netBalance >= 0) {
        doc.setTextColor(124, 58, 237); // purple
      } else {
        doc.setTextColor(220, 38, 38); // red
      }
      doc.text(`${currency} ${netBalance.toFixed(2)}`, 144, 58);

      // Render Category charts/breakdown
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Expense Category Breakdown', 14, 82);

      autoTable(doc, {
        head: [['Category', 'Amount Spent', 'Percentage']],
        body: expenseCategoryTable.length > 0 ? expenseCategoryTable : [['No expenses recorded', '-', '-']],
        startY: 86,
        headStyles: { fillColor: [124, 58, 237] },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        theme: 'striped',
        margin: { left: 14, right: 14 }
      });

      let nextSectionY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : 140;

      if (incomeCategoryTable.length > 0 && nextSectionY < 240) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text('Income Sources Breakdown', 14, nextSectionY);

        autoTable(doc, {
          head: [['Source Category', 'Amount Received', 'Percentage']],
          body: incomeCategoryTable,
          startY: nextSectionY + 4,
          headStyles: { fillColor: [5, 150, 105] },
          alternateRowStyles: { fillColor: [240, 253, 250] },
          theme: 'striped',
          margin: { left: 14, right: 14 }
        });
      }

      // --- PAGE 2 ONWARDS: DETAILED TRANSACTIONS ---
      doc.addPage();
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(124, 58, 237);
      doc.text('Detailed Transaction History', 14, 20);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Full ledger of all transactions in chronological order', 14, 26);

      const tableData = txsToExport.map(tx => [
        format(tx.date.toDate(), 'yyyy-MM-dd'),
        tx.category,
        tx.description || '-',
        tx.type.toUpperCase(),
        `${profile.settings.currency} ${tx.amount.toFixed(2)}`
      ]);

      autoTable(doc, {
        head: [['Date', 'Category', 'Description', 'Type', 'Amount']],
        body: tableData,
        startY: 32,
        headStyles: { fillColor: [124, 58, 237] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      // Report Sums and Totals at the end of transaction history
      const endY = (doc as any).lastAutoTable?.finalY || 100;
      let summaryY = endY + 12;
      
      if (summaryY > 235) {
        doc.addPage();
        summaryY = 22;
      }

      doc.setFillColor(243, 244, 246);
      doc.rect(14, summaryY, 182, 45, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text('REPORT TRANSACTION SUMMARY & TOTALS', 20, summaryY + 8);

      doc.setDrawColor(209, 213, 219);
      doc.line(20, summaryY + 12, 190, summaryY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(75, 85, 99);
      doc.text('Expense Transactions:', 20, summaryY + 19);
      doc.text('Income Transactions:', 20, summaryY + 25);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${txsToExport.filter(tx => tx.type === 'expense').length} items`, 85, summaryY + 19);
      doc.text(`${txsToExport.filter(tx => tx.type === 'income').length} items`, 85, summaryY + 25);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text('Total Expense Amount:', 115, summaryY + 19);
      doc.text('Total Income Amount:', 115, summaryY + 25);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38); // red
      doc.text(`- ${currency} ${totalSpend.toFixed(2)}`, 165, summaryY + 19);
      doc.setTextColor(5, 150, 105); // green
      doc.text(`+ ${currency} ${totalIncome.toFixed(2)}`, 165, summaryY + 25);

      doc.setDrawColor(209, 213, 219);
      doc.line(20, summaryY + 31, 190, summaryY + 31);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(31, 41, 55);
      doc.text('NET TRANSACTION FLOW / SAVINGS:', 20, summaryY + 39);

      if (netBalance >= 0) {
        doc.setTextColor(5, 150, 105);
        doc.text(`+ ${currency} ${netBalance.toFixed(2)}`, 150, summaryY + 39);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text(`- ${currency} ${Math.abs(netBalance).toFixed(2)}`, 150, summaryY + 39);
      }

      // For Android/Capacitor, standard save might fail. 
      // Using Filesystem and Share for a robust experience
      if (Capacitor.getPlatform() !== 'web') {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const fileName = `Activity_${format(new Date(), 'yyyyMMdd')}.pdf`;
        
        try {
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: Directory.Cache,
          });

          await Share.share({
            title: 'Export Activity Report',
            text: 'Your FinTrack Pro Activity Report',
            url: savedFile.uri,
            dialogTitle: 'Share or Save Report',
          });
          
          toast.success('Report ready to share/save');
        } catch (err) {
          console.error('Capacitor export failed', err);
          // Fallback to blob if filesystem fails
          const pdfOutput = doc.output('blob');
          const url = URL.createObjectURL(pdfOutput);
          const link = document.body.appendChild(document.createElement('a'));
          link.href = url;
          link.download = fileName;
          link.click();
          document.body.removeChild(link);
        }
      } else {
        doc.save(`Activity_${format(new Date(), 'yyyyMMdd')}.pdf`);
      }
      
      toast.success('PDF report generated');
      setIsPdfExportOpen(false);
    } catch (error) {
      console.error('PDF Export failed', error);
      toast.error('Failed to generate PDF');
    }
  };

  const exportCSV = () => {
    const data = filteredTransactions.map(tx => ({
      Date: format(tx.date.toDate(), 'yyyy-MM-dd'),
      Category: tx.category,
      Description: tx.description || '',
      Type: tx.type,
      Amount: tx.amount,
      Currency: profile.settings.currency
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Activity</h2>
          <p className="text-muted-foreground font-medium">Track your spending and income</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="h-12 px-6 font-black rounded-2xl border-2 dark:border-white/20 dark:hover:bg-white/5">
                <ArrowLeftRight className="mr-2 h-5 w-5" />
                Transfer
              </Button>
            } />
            <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem] dark:bg-zinc-900/90">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight dark:text-white">Transfer Funds</DialogTitle>
                <DialogDescription className="font-medium">Move money between your accounts.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1 dark:text-white/70">Amount</Label>
                  <Input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="h-12 rounded-xl border-2 dark:bg-black/20 dark:border-white/10 dark:text-white" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider ml-1 dark:text-white/70">From Account</Label>
                    <Select value={fromAccount} onValueChange={setFromAccount}>
                      <SelectTrigger className="h-12 rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                        {detectedAccounts.map(acc => (
                          <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider ml-1 dark:text-white/70">To Account</Label>
                    <Select value={toAccount} onValueChange={setToAccount}>
                      <SelectTrigger className="h-12 rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                        {detectedAccounts.map(acc => (
                          <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20">Record Transfer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <div className="glass p-1 rounded-xl flex gap-1 dark:bg-white/5">
            <Button variant="ghost" size="sm" onClick={exportCSV} className="h-8 rounded-lg font-bold text-xs dark:text-white dark:hover:bg-white/10">
              <TableIcon className="mr-2 h-3.5 w-3.5" />
              CSV
            </Button>
            <Dialog open={isPdfExportOpen} onOpenChange={setIsPdfExportOpen}>
              <DialogTrigger render={
                <Button variant="ghost" size="sm" className="h-8 rounded-lg font-bold text-xs dark:text-white dark:hover:bg-white/10">
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  PDF
                </Button>
              } />
              <DialogContent className="glass border border-white/20 shadow-2xl rounded-[2.5rem] dark:bg-zinc-900/90 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight dark:text-white">Export PDF Report</DialogTitle>
                  <DialogDescription className="font-medium">
                    Select the duration of transactions to include in your PDF report.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider ml-1 dark:text-white/70">Duration</Label>
                    <Select value={pdfDuration} onValueChange={(v: any) => setPdfDuration(v)}>
                      <SelectTrigger className="h-12 rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                        <SelectItem value="all" className="font-bold">All Transactions</SelectItem>
                        <SelectItem value="10days" className="font-bold">Last 10 Days</SelectItem>
                        <SelectItem value="15days" className="font-bold">Last 15 Days</SelectItem>
                        <SelectItem value="1month" className="font-bold">Last 1 Month</SelectItem>
                        <SelectItem value="1year" className="font-bold">Last 1 Year</SelectItem>
                        <SelectItem value="custom" className="font-bold">Custom Date Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {pdfDuration === 'custom' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider ml-1 dark:text-white/70">Start Date</Label>
                        <Input 
                          type="date" 
                          value={pdfStartDate} 
                          onChange={(e) => setPdfStartDate(e.target.value)} 
                          className="h-12 rounded-xl border-2 dark:bg-black/20 dark:border-white/10 dark:text-white font-bold" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider ml-1 dark:text-white/70">End Date</Label>
                        <Input 
                          type="date" 
                          value={pdfEndDate} 
                          onChange={(e) => setPdfEndDate(e.target.value)} 
                          className="h-12 rounded-xl border-2 dark:bg-black/20 dark:border-white/10 dark:text-white font-bold" 
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="flex flex-col sm:flex-row gap-2 w-full">
                  <Button variant="outline" onClick={() => setIsPdfExportOpen(false)} className="w-full sm:flex-1 rounded-xl border-2 font-bold h-12">Cancel</Button>
                  <Button onClick={exportPDF} className="w-full sm:flex-1 h-12 font-black rounded-xl shadow-lg shadow-primary/20">Generate PDF</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Transaction Form Card */}
      <Card className="border-none glass shadow-xl">
        <CardContent className="p-6">
          <div className="flex p-1 bg-accent/20 rounded-xl mb-4">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  type === t ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-primary/5"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Amount</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary">{profile.settings.currency}</span>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    className="h-14 pl-12 rounded-2xl border-2 text-lg font-black" 
                    placeholder="0.00"
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                    {profile.categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="font-bold">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Description</Label>
                <div className="relative">
                  <Input 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="What was this for?" 
                    className="h-14 rounded-2xl border-2 font-bold pr-12" 
                  />
                  <button
                    type="button"
                    onClick={handleMagicCategorize}
                    disabled={isCategorizing || !description}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                    title="AI Categorize"
                  >
                    {isCategorizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Payment Mode / Account</Label>
                  <Select value={paymentMode} onValueChange={(v: string) => setPaymentMode(v)}>
                    <SelectTrigger className="h-14 rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                      {paymentModes.map(mode => (
                        <SelectItem key={mode} value={mode} className="font-bold">{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-70">Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-14 rounded-2xl border-2 font-bold" required />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-14 font-black text-base rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 mt-4">
              {editingId ? 'Update' : 'Save'} {type}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search transactions..." 
            className="pl-12 h-12 rounded-2xl border-2 glass focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
          <SelectTrigger className="w-full md:w-[180px] h-12 rounded-2xl border glass font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
            <SelectItem value="all" className="font-bold">All Types</SelectItem>
            <SelectItem value="income" className="font-bold">Income Only</SelectItem>
            <SelectItem value="expense" className="font-bold">Expense Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile List */}
      <div className="space-y-3">
        <h3 className="text-lg font-black tracking-tight px-1 dark:text-white">Recent Activity</h3>
        <AnimatePresence>
          {filteredTransactions.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass p-4 rounded-[1.5rem] flex items-center justify-between group active:scale-[0.98] transition-transform border border-white/10"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                  tx.type === 'income' ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/20 text-red-600 dark:text-red-400"
                )}>
                  {tx.type === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm tracking-tight truncate dark:text-white">{tx.category}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{format(tx.date.toDate(), 'MMM dd, yyyy')}</p>
                  {tx.description && <p className="text-[10px] font-medium text-muted-foreground mt-0.5 truncate max-w-[120px]">{tx.description}</p>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={cn(
                  "text-base font-black tracking-tight",
                  tx.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {tx.type === 'income' ? '+' : '-'}{profile.settings.currency}{tx.amount.toLocaleString()}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-accent/30" onClick={() => handleEdit(tx)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-destructive/5 text-destructive" onClick={() => handleDelete(tx.id!)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12 bg-accent/20 rounded-3xl border-2 border-dashed">
          <div className="bg-background w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No transactions found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
}
