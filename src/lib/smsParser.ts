import { Transaction } from '../types';
import { Timestamp } from '../lib/firebase';

export const parseSMS = (address: string, body: string, userId: string): Partial<Transaction> | null => {
  const text = body.toLowerCase();
  
  // Basic patterns for bank SMS
  // Example: "Spent ₹50.00 at Starbucks. Balance: ₹1000.00"
  // Example: "Your account XXX123 has been debited by INR 25.00 on 09-Apr-26"
  
  const amountRegex = /(?:rs|inr|₹|usd|\$|eur|gbp)\.?\s?([\d,]+(?:\.\d{1,2})?)/i;
  const match = text.match(amountRegex);
  
  if (!match) return null;
  
  const amount = parseFloat(match[1].replace(/,/g, ''));
  let type: 'income' | 'expense' = 'expense';
  
  const incomeKeywords = ['credited', 'received', 'deposited', 'added', 'refunded'];
  const expenseKeywords = ['debited', 'spent', 'paid', 'withdrawn', 'purchase', 'txn'];

  if (incomeKeywords.some(kw => text.includes(kw))) {
    type = 'income';
  } else if (expenseKeywords.some(kw => text.includes(kw))) {
    type = 'expense';
  }

  // Try to find a category based on keywords
  let category = 'Others';
  const categoryKeywords: Record<string, string[]> = {
    'Food': ['restaurant', 'swiggy', 'zomato', 'starbucks', 'cafe', 'food', 'dining', 'eats', 'bake', 'pizza', 'burger'],
    'Transport': ['uber', 'ola', 'petrol', 'fuel', 'metro', 'train', 'flight', 'travel', 'rapido', 'irctc', 'indigo', 'airindia'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'shopping', 'store', 'mall', 'mart', 'retail', 'ajio', 'nykaa'],
    'Bills': ['electricity', 'water', 'recharge', 'bill', 'insurance', 'subscription', 'netflix', 'jio', 'airtel', 'vi', 'bescom'],
    'Health': ['hospital', 'pharmacy', 'medical', 'doctor', 'gym', 'health', 'apollo', 'pharmeasy'],
    'Entertainment': ['movie', 'pvr', 'theatre', 'game', 'club', 'bookmyshow', 'spotify', 'prime'],
    'Salary': ['salary', 'stipend', 'bonus'],
    'Investment': ['zerodha', 'groww', 'upstox', 'mutual fund', 'sip', 'stock']
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      category = cat;
      break;
    }
  }

  return {
    userId,
    amount,
    type,
    category,
    description: `SMS from ${address}: ${body.substring(0, 50)}...`,
    date: Timestamp.now(),
    isFamily: false
  };
};
