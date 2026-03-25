'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WalletWithBalance } from '@/lib/types'
import { Plus, Wallet, Landmark, Smartphone, Banknote, Edit2, Trash2, X, ArrowRight } from 'lucide-react'

const walletTypeLabels: Record<string, string> = {
  mobile_money: 'Mobile Money',
  bank: 'Bank',
  cash: 'Cash',
}

const walletTypeIcons: Record<string, React.ReactNode> = {
  mobile_money: <Smartphone size={18} className="text-purple-600" />,
  bank: <Landmark size={18} className="text-blue-600" />,
  cash: <Banknote size={18} className="text-green-600" />,
}

export default function WalletsPage() {
  const supabase = createClient()
  const [wallets, setWallets] = useState<WalletWithBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingWallet, setEditingWallet] = useState<WalletWithBalance | null>(null)
  const [deletingWallet, setDeletingWallet] = useState<WalletWithBalance | null>(null)
  const [transferToWalletId, setTransferToWalletId] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<'mobile_money' | 'bank' | 'cash'>('mobile_money')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadWallets = async () => {
    const { data } = await supabase.from('wallet_balances').select('*')
    if (data) setWallets(data as WalletWithBalance[])
    setLoading(false)
  }

  useEffect(() => {
    loadWallets()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: insertError } = await supabase.from('wallets').insert({
      user_id: user.id,
      name: name.trim(),
      type,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
    } else {
      setName('')
      setType('mobile_money')
      setShowForm(false)
      setSaving(false)
      loadWallets()
    }
  }

  const handleEdit = (wallet: WalletWithBalance) => {
    setEditingWallet(wallet)
    setName(wallet.name)
    setType(wallet.type)
    setError('')
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWallet) return
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('wallets')
      .update({ name: name.trim(), type })
      .eq('id', editingWallet.wallet_id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
    } else {
      setName('')
      setType('mobile_money')
      setEditingWallet(null)
      setSaving(false)
      loadWallets()
    }
  }

  const handleDeleteClick = (wallet: WalletWithBalance) => {
    setDeletingWallet(wallet)
    setTransferToWalletId('')
    setError('')
  }

  const handleDelete = async () => {
    if (!deletingWallet) return
    setSaving(true)
    setError('')

    const balance = Number(deletingWallet.balance)
    const sourceWalletId = deletingWallet.wallet_id

    if (balance !== 0) {
      if (!transferToWalletId) {
        setError('Please select a wallet to transfer the balance to')
        setSaving(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // CRITICAL FIX: We need to create an income/expense transaction on the destination wallet
      // instead of a transfer, because the cascade delete will remove any transaction
      // that references the deleted wallet. We simulate the transfer effect by:
      // - If balance > 0: Create INCOME on destination wallet (money coming in)
      // - If balance < 0: Create EXPENSE on destination wallet (money going out)
      
      const txType = balance > 0 ? 'income' : 'expense'
      const { error: transferError } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: txType,
        amount: Math.abs(balance),
        wallet_id: transferToWalletId,
        to_wallet_id: null,
        category_id: null,
        description: `Transfer from deleted wallet: ${deletingWallet.name}`,
      })

      if (transferError) {
        setError(transferError.message)
        setSaving(false)
        return
      }
    }

    // Delete the wallet (cascade will delete all transactions referencing it)
    const { error: deleteError } = await supabase
      .from('wallets')
      .delete()
      .eq('id', sourceWalletId)

    if (deleteError) {
      setError(deleteError.message)
      setSaving(false)
    } else {
      setDeletingWallet(null)
      setTransferToWalletId('')
      setSaving(false)
      loadWallets()
    }
  }

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} />
          Add Wallet
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">New Wallet</h2>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g. MTN MoMo, GCB Bank, Cash"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'mobile_money' | 'bank' | 'cash')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating...' : 'Create Wallet'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setError('')
              }}
              className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Edit Form */}
      {editingWallet && (
        <form
          onSubmit={handleUpdate}
          className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Edit Wallet</h2>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g. MTN MoMo, GCB Bank, Cash"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'mobile_money' | 'bank' | 'cash')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Updating...' : 'Update Wallet'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingWallet(null)
                setName('')
                setType('mobile_money')
                setError('')
              }}
              className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Wallet List */}
      {wallets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Wallet size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No wallets yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((w) => (
            <div
              key={w.wallet_id || w.id}
              className="bg-white rounded-xl border border-gray-200 p-5 group hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    {walletTypeIcons[w.type]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-400">{walletTypeLabels[w.type]}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(w)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-emerald-600 transition-colors"
                    title="Edit wallet"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(w)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-red-600 transition-colors"
                    title="Delete wallet"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">
                GHS {formatAmount(Number(w.balance))}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingWallet && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Delete Wallet</h2>
              <button
                onClick={() => {
                  setDeletingWallet(null)
                  setTransferToWalletId('')
                  setError('')
                }}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white rounded-lg">
                    {walletTypeIcons[deletingWallet.type]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{deletingWallet.name}</p>
                    <p className="text-xs text-gray-400">{walletTypeLabels[deletingWallet.type]}</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  Balance: GHS {formatAmount(Number(deletingWallet.balance))}
                </p>
              </div>

              {Number(deletingWallet.balance) !== 0 ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>Transfer Required:</strong> This wallet has a balance of GHS {formatAmount(Math.abs(Number(deletingWallet.balance)))}. 
                      Please select a wallet to transfer {Number(deletingWallet.balance) > 0 ? 'to' : 'from'} before deleting.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transfer {Number(deletingWallet.balance) > 0 ? 'to' : 'from'} wallet
                    </label>
                    <select
                      required
                      value={transferToWalletId}
                      onChange={(e) => setTransferToWalletId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select wallet</option>
                      {wallets
                        .filter((w) => w.wallet_id !== deletingWallet.wallet_id)
                        .map((w) => (
                          <option key={w.wallet_id} value={w.wallet_id}>
                            {w.name} (GHS {formatAmount(Number(w.balance))})
                          </option>
                        ))}
                    </select>
                  </div>

                  {transferToWalletId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <ArrowRight size={16} />
                        <span>
                          GHS {formatAmount(Math.abs(Number(deletingWallet.balance)))} will be transferred, 
                          then the wallet will be deleted.
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Ready to delete:</strong> This wallet has a zero balance and can be safely deleted.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={saving || (Number(deletingWallet.balance) !== 0 && !transferToWalletId)}
                  className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Deleting...' : 'Delete Wallet'}
                </button>
                <button
                  onClick={() => {
                    setDeletingWallet(null)
                    setTransferToWalletId('')
                    setError('')
                  }}
                  disabled={saving}
                  className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
