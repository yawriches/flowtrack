'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, Wallet, Category } from '@/lib/types'
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  X,
} from 'lucide-react'
import DateRangeFilter from '@/components/DateRangeFilter'

type TxType = 'income' | 'expense' | 'transfer'
type FilterType = 'all' | TxType

export default function TransactionsPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Form state
  const [showModal, setShowModal] = useState(false)
  const [txType, setTxType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState('')
  const [toWalletId, setToWalletId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadData = async () => {
    let txQuery = supabase
      .from('transactions')
      .select(
        '*, category:categories(*), wallet:wallets!wallet_id(*), to_wallet:wallets!to_wallet_id(*)'
      )
      .order('created_at', { ascending: false })

    if (startDate) {
      txQuery = txQuery.gte('created_at', new Date(startDate).toISOString())
    }
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      txQuery = txQuery.lte('created_at', endDateTime.toISOString())
    }

    const [txRes, walletRes, catRes] = await Promise.all([
      txQuery,
      supabase.from('wallets').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])

    if (txRes.data) setTransactions(txRes.data as Transaction[])
    if (walletRes.data) setWallets(walletRes.data)
    if (catRes.data) setCategories(catRes.data)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [startDate, endDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setTxType('expense')
    setAmount('')
    setWalletId('')
    setToWalletId('')
    setCategoryId('')
    setDescription('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount greater than 0')
      return
    }
    if (!walletId) {
      setError('Please select a wallet')
      return
    }
    if (txType === 'transfer' && !toWalletId) {
      setError('Please select a destination wallet')
      return
    }
    if (txType === 'transfer' && walletId === toWalletId) {
      setError('Source and destination wallets must be different')
      return
    }

    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error: insertError } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: txType,
      amount: amountNum,
      wallet_id: walletId,
      to_wallet_id: txType === 'transfer' ? toWalletId : null,
      category_id: txType !== 'transfer' && categoryId ? categoryId : null,
      description: description.trim(),
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
    } else {
      resetForm()
      setShowModal(false)
      setSaving(false)
      loadData()
    }
  }

  const filteredTx =
    filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} />
          Add Transaction
        </button>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onReset={handleResetDates}
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'income', 'expense', 'transfer'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {filteredTx.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ArrowLeftRight size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No transactions found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filteredTx.map((tx) => {
            const cat = tx.category
            const catName = Array.isArray(cat) ? cat[0]?.name : cat?.name
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-green-50'
                        : tx.type === 'expense'
                        ? 'bg-red-50'
                        : 'bg-blue-50'
                    }`}
                  >
                    {tx.type === 'transfer' ? (
                      <ArrowLeftRight size={16} className="text-blue-600" />
                    ) : tx.type === 'income' ? (
                      <TrendingUp size={16} className="text-green-600" />
                    ) : (
                      <TrendingDown size={16} className="text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.description || tx.type}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {tx.wallet?.name || 'Unknown'}
                      {tx.type === 'transfer' && tx.to_wallet
                        ? ` → ${tx.to_wallet.name}`
                        : ''}
                      {catName ? ` · ${catName}` : ''}
                      {' · '}
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold whitespace-nowrap ml-4 ${
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
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Transaction
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['income', 'expense', 'transfer'] as TxType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTxType(t)}
                      className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        txType === t
                          ? t === 'income'
                            ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                            : t === 'expense'
                            ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                            : 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (GHS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {/* Source Wallet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {txType === 'transfer' ? 'From Wallet' : 'Wallet'}
                </label>
                <select
                  required
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">Select wallet</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Wallet (transfer only) */}
              {txType === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Wallet
                  </label>
                  <select
                    required
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select destination wallet</option>
                    {wallets
                      .filter((w) => w.id !== walletId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Category (not for transfers) */}
              {txType !== 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Optional note"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Add Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Add Button (Mobile) */}
      <button
        onClick={() => {
          resetForm()
          setShowModal(true)
        }}
        className="sm:hidden fixed bottom-6 right-6 bg-emerald-600 text-white rounded-full p-4 shadow-lg hover:bg-emerald-700 transition-colors z-30"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
