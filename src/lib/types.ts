export interface Wallet {
  id: string
  user_id: string
  name: string
  type: 'mobile_money' | 'bank' | 'cash'
  created_at: string
}

export interface WalletWithBalance {
  wallet_id: string
  id?: string
  user_id: string
  name: string
  type: 'mobile_money' | 'bank' | 'cash'
  balance: number
}

export interface Category {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  category_id: string | null
  wallet_id: string
  to_wallet_id: string | null
  description: string
  created_at: string
  // Joined fields
  category?: Category | null
  wallet?: Wallet | null
  to_wallet?: Wallet | null
}
