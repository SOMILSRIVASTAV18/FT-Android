import { Timestamp } from './lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  familyId?: string;
  categories: string[];
  settings: {
    darkMode: boolean;
    notifications: boolean;
    currency: string;
    initialBalance?: number;
    biometricLock?: boolean;
    smsSyncEnabled?: boolean;
  };
  bankAccounts?: string[];
  categoryIcons?: { [category: string]: string }; // category name to lucide icon name
  createdAt?: Timestamp;
}

export interface Family {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: string[];
}

export interface Transaction {
  id: string;
  userId: string;
  familyId?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: Timestamp;
  isFamily: boolean;
  paymentMode?: string;
  fromAccount?: string;
  toAccount?: string;
}

export interface Budget {
  id: string;
  userId: string;
  familyId?: string;
  category: string;
  limit: number;
  spent: number;
  period: 'monthly';
  rollover?: boolean;
  createdAt: Timestamp;
}

export interface FinancialGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Timestamp;
  category?: string;
  icon?: string;
  createdAt: Timestamp;
}

export interface Bill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dueDate: Timestamp;
  category: string;
  isRecurring: boolean;
  frequency?: 'monthly' | 'yearly' | 'weekly';
  status: 'unpaid' | 'paid';
  lastPaidDate?: Timestamp;
  transactionId?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: Timestamp;
  category: string;
  provider?: string;
  isActive: boolean;
}

export interface Asset {
  id: string;
  userId: string;
  name: string;
  value: number;
  type: 'cash' | 'bank' | 'investment' | 'property' | 'other';
  lastUpdated: Timestamp;
}

export interface Liability {
  id: string;
  userId: string;
  name: string;
  amount: number;
  type: 'loan' | 'credit_card' | 'mortgage' | 'other';
  interestRate?: number;
  dueDate?: Timestamp;
  lastUpdated: Timestamp;
}

export interface Invite {
  id: string;
  familyId: string;
  email: string;
  code: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface FamilyRequest {
  id: string;
  familyId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
}

export interface Due {
  id: string;
  userId: string;
  contactName: string;
  amount: number;
  type: 'lent' | 'owed';
  status: 'pending' | 'paid';
  dueDate: Timestamp;
  description?: string;
}

export interface SplitGroup {
  id: string;
  name: string;
  code: string;
  members: string[]; // uids
  memberNames: { [uid: string]: string };
  ownerId: string;
  createdAt: Timestamp;
}

export interface SplitExpense {
  id: string;
  groupId: string;
  payerId: string;
  payerName: string;
  amount: number;
  description: string;
  date: Timestamp;
  splitType: 'equal' | 'exact';
  splits: { [uid: string]: number }; // uid to amount
  transactionId?: string;
}

export interface SMSPassbookEntry {
  id: string;
  userId: string;
  address: string;
  body: string;
  date: Timestamp;
  parsedAmount?: number;
  parsedType?: 'income' | 'expense' | 'other';
  bankName?: string | null;
  accountLast4?: string | null;
  isAdded: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: Timestamp;
  link?: string;
}

export const DEFAULT_CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Salary', 'Investment', 'Bills', 'Subscription', 'Other'
];
