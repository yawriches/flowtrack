'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/lib/types'
import { Plus, Tag, Edit2, Trash2, X, ArrowRight } from 'lucide-react'

export default function CategoriesPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [transferToCategoryId, setTransferToCategoryId] = useState('')
  const [usageCount, setUsageCount] = useState(0)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setCategories(data)
    setLoading(false)
  }

  useEffect(() => {
    loadCategories()
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

    const { error: insertError } = await supabase.from('categories').insert({
      user_id: user.id,
      name: name.trim(),
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
    } else {
      setName('')
      setShowForm(false)
      setSaving(false)
      loadCategories()
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setName(category.name)
    setError('')
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('categories')
      .update({ name: name.trim() })
      .eq('id', editingCategory.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
    } else {
      setName('')
      setEditingCategory(null)
      setSaving(false)
      loadCategories()
    }
  }

  const handleDeleteClick = async (category: Category) => {
    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', category.id)

    setDeletingCategory(category)
    setUsageCount(count || 0)
    setTransferToCategoryId('')
    setError('')
  }

  const handleDelete = async () => {
    if (!deletingCategory) return
    setSaving(true)
    setError('')

    if (usageCount > 0) {
      if (!transferToCategoryId) {
        setError('Please select a category to transfer transactions to')
        setSaving(false)
        return
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category_id: transferToCategoryId })
        .eq('category_id', deletingCategory.id)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
    }

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', deletingCategory.id)

    if (deleteError) {
      setError(deleteError.message)
      setSaving(false)
    } else {
      setDeletingCategory(null)
      setTransferToCategoryId('')
      setUsageCount(0)
      setSaving(false)
      loadCategories()
    }
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">New Category</h2>
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
              placeholder="e.g. Savings, Investment, Operations"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating...' : 'Create Category'}
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
      {editingCategory && (
        <form
          onSubmit={handleUpdate}
          className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">Edit Category</h2>
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
              placeholder="e.g. Savings, Investment, Operations"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Updating...' : 'Update Category'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingCategory(null)
                setName('')
                setError('')
              }}
              className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Category List */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Tag size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No categories yet. Create one to organize transactions.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between px-5 py-3.5 group hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-50 rounded-lg">
                  <Tag size={14} className="text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">{cat.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {new Date(cat.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(cat)}
                    className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-emerald-600 transition-colors"
                    title="Edit category"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(cat)}
                    className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-red-600 transition-colors"
                    title="Delete category"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Delete Category</h2>
              <button
                onClick={() => {
                  setDeletingCategory(null)
                  setTransferToCategoryId('')
                  setUsageCount(0)
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
                    <Tag size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{deletingCategory.name}</p>
                    <p className="text-xs text-gray-400">
                      Used in {usageCount} transaction{usageCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {usageCount > 0 ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>Transfer Required:</strong> This category is used in {usageCount} transaction{usageCount !== 1 ? 's' : ''}. 
                      Please select another category to transfer them to before deleting.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transfer transactions to
                    </label>
                    <select
                      required
                      value={transferToCategoryId}
                      onChange={(e) => setTransferToCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {categories
                        .filter((c) => c.id !== deletingCategory.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {transferToCategoryId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <ArrowRight size={16} />
                        <span>
                          {usageCount} transaction{usageCount !== 1 ? 's' : ''} will be moved to the selected category, 
                          then this category will be deleted.
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>Ready to delete:</strong> This category is not used in any transactions and can be safely deleted.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={saving || (usageCount > 0 && !transferToCategoryId)}
                  className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Deleting...' : 'Delete Category'}
                </button>
                <button
                  onClick={() => {
                    setDeletingCategory(null)
                    setTransferToCategoryId('')
                    setUsageCount(0)
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
