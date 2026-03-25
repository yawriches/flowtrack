'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, WalletWithBalance } from '@/lib/types'
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight } from 'lucide-react'
import DateRangeFilter from '@/components/DateRangeFilter'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const COLORS = ['#059669', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#4f46e5', '#dc2626']

export default function DashboardPage() {
  const supabase = createClient()
  const [wallets, setWallets] = useState<WalletWithBalance[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let txQuery = supabase
        .from('transactions')
        .select('*, category:categories(*), wallet:wallets!wallet_id(*), to_wallet:wallets!to_wallet_id(*)')
        .order('created_at', { ascending: false })
        .limit(10)

      if (startDate) {
        txQuery = txQuery.gte('created_at', new Date(startDate).toISOString())
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        txQuery = txQuery.lte('created_at', endDateTime.toISOString())
      }

      const [walletsRes, transactionsRes] = await Promise.all([
        supabase.from('wallet_balances').select('*'),
        txQuery,
      ])

      if (walletsRes.data) setWallets(walletsRes.data as WalletWithBalance[])
      if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[])
      setLoading(false)
    }
    load()
  }, [supabase, startDate, endDate])

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0)

  // Calculate totals from ALL transactions, not just the recent 10
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [expensesByCategory, setExpensesByCategory] = useState<{ name: string; value: number }[]>([])

  useEffect(() => {
    async function loadTotals() {
      let query = supabase
        .from('transactions')
        .select('type, amount, category:categories(name)')

      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString())
      }
      if (endDate) {
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        query = query.lte('created_at', endDateTime.toISOString())
      }

      const { data: allTx } = await query

      if (allTx) {
        const income = allTx
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0)
        const expenses = allTx
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0)
        setTotalIncome(income)
        setTotalExpenses(expenses)

        // Group expenses by category
        const catMap = new Map<string, number>()
        allTx
          .filter((t) => t.type === 'expense')
          .forEach((t) => {
            const cat = t.category as { name: string } | { name: string }[] | null
            const catName =
              (Array.isArray(cat) ? cat[0]?.name : cat?.name) || 'Uncategorized'
            catMap.set(catName, (catMap.get(catName) || 0) + Number(t.amount))
          })
        setExpensesByCategory(
          Array.from(catMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
        )
      }
    }
    loadTotals()
  }, [supabase, startDate, endDate])

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    )
  }

  const handleResetDates = () => {
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Date Range Filter */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onReset={handleResetDates}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Wallet size={18} className="text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Balance</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">GHS {formatAmount(totalBalance)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp size={18} className="text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Income</span>
          </div>
          <p className="text-2xl font-bold text-green-600">GHS {formatAmount(totalIncome)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingDown size={18} className="text-red-500" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-red-600">GHS {formatAmount(totalExpenses)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h2>
          {expensesByCategory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No expense data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={expensesByCategory} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tickFormatter={(v) => `${v}`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`GHS ${formatAmount(Number(v))}`, 'Amount']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {expensesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg ${
                        tx.type === 'income'
                          ? 'bg-green-50'
                          : tx.type === 'expense'
                          ? 'bg-red-50'
                          : 'bg-blue-50'
                      }`}
                    >
                      {tx.type === 'transfer' ? (
                        <ArrowLeftRight
                          size={14}
                          className="text-blue-600"
                        />
                      ) : tx.type === 'income' ? (
                        <TrendingUp size={14} className="text-green-600" />
                      ) : (
                        <TrendingDown size={14} className="text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-gray-400">
                        {tx.wallet?.name}
                        {tx.type === 'transfer' && tx.to_wallet
                          ? ` → ${tx.to_wallet.name}`
                          : ''}
                        {' · '}
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      tx.type === 'income'
                        ? 'text-green-600'
                        : tx.type === 'expense'
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    GHS {formatAmount(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
