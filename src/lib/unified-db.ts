// Unified Database Service
// Automatically switches between Supabase (online) and local SQLite (offline)

import { electronDB } from './electron-db'
import { localStorageDB } from './local-storage-db'
import supabase from './db'

export interface DBConfig {
  preferLocal?: boolean
  syncOnWrite?: boolean
}

class UnifiedDB {
  private preferLocal: boolean = false
  private syncOnWrite: boolean = true

  constructor(config: DBConfig = {}) {
    this.preferLocal = config.preferLocal || false
    this.syncOnWrite = config.syncOnWrite !== false
  }

  // Check if we're in Electron environment
  private isElectron(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined
  }

  // Check if we're online
  private async isOnline(): Promise<boolean> {
    if (this.isElectron()) {
      return await electronDB.isOnline()
    }
    return navigator.onLine
  }

  // Get orders
  async getOrders(status?: string): Promise<any[]> {
    try {
      // Try Supabase first if online
      if (!this.preferLocal && await this.isOnline()) {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            tables:table_id (*),
            users:waiter_id (*)
          `)
          .order('created_at', { ascending: false })

        if (!error && data) {
          // Fetch order items for each order
          for (const order of data) {
            const { data: items } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', order.id)

            order.order_items = items || []

            // Fetch dish details
            const dishIds = [...new Set(order.order_items.map((item: any) => item.dish_id))]
            if (dishIds.length > 0) {
              const { data: dishes } = await supabase
                .from('dishes')
                .select('*')
                .in('id', dishIds)

              const dishesMap: Record<string, any> = {}
              dishes?.forEach((dish: any) => {
                dishesMap[dish.id] = {
                  ...dish,
                  price: parseFloat(dish.price)
                }
              })

              order.order_items.forEach((item: any) => {
                item.dishes = dishesMap[item.dish_id] || null
                item.dish = dishesMap[item.dish_id] || null
                item.price = parseFloat(item.price)
              })
            }

            order.total_amount = parseFloat(order.total_amount)
          }

          return data
        }
      }

      // Fallback to local storage
      console.log('Using local storage for orders')
      return localStorageDB.getOrders()
    } catch (error) {
      console.error('Error fetching orders:', error)
      // Fallback to local storage on error
      return localStorageDB.getOrders()
    }
  }

  // Get dishes
  async getDishes(): Promise<any[]> {
    try {
      // Try Supabase first if online
      if (!this.preferLocal && await this.isOnline()) {
        const { data, error } = await supabase
          .from('dishes')
          .select('*')
          .order('name')

        if (!error && data) {
          return data
        }
      }

      // Fallback to local storage
      console.log('Using local storage for dishes')
      return localStorageDB.getDishes()
    } catch (error) {
      console.error('Error fetching dishes:', error)
      return localStorageDB.getDishes()
    }
  }

  // Get tables
  async getTables(): Promise<any[]> {
    try {
      // Try Supabase first if online
      if (!this.preferLocal && await this.isOnline()) {
        const { data, error } = await supabase
          .from('tables')
          .select('*')
          .order('table_number')

        if (!error && data) {
          return data
        }
      }

      // Fallback to local storage
      console.log('Using local storage for tables')
      return localStorageDB.getTables()
    } catch (error) {
      console.error('Error fetching tables:', error)
      return localStorageDB.getTables()
    }
  }

  // Get users
  async getUsers(): Promise<any[]> {
    try {
      // Try Supabase first if online
      if (!this.preferLocal && await this.isOnline()) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          return data
        }
      }

      // Fallback to local storage
      console.log('Using local storage for users')
      return localStorageDB.getUsers()
    } catch (error) {
      console.error('Error fetching users:', error)
      return localStorageDB.getUsers()
    }
  }

  // Create order
  async createOrder(orderData: any): Promise<any> {
    try {
      // Try Supabase first if online
      if (!this.preferLocal && await this.isOnline()) {
        const { data, error } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single()

        if (!error && data) {
          data.total_amount = parseFloat(data.total_amount)
          return data
        }
      }

      // Fallback to local storage
      console.log('Creating order in local storage')
      const localOrder = {
        ...orderData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        order_items: []
      }
      localStorageDB.addOrder(localOrder)

      // If in Electron, also save to SQLite
      if (this.isElectron()) {
        await electronDB.query(
          'INSERT INTO orders (id, table_id, customer_name, total_amount, status, created_at, updated_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
          [localOrder.id, localOrder.table_id, localOrder.customer_name, localOrder.total_amount, localOrder.status, localOrder.created_at, localOrder.updated_at]
        )
      }

      return localOrder
    } catch (error) {
      console.error('Error creating order:', error)
      throw error
    }
  }

  // Update order
  async updateOrder(id: string, updates: any): Promise<any> {
    try {
      // Try Supabase first if online
      if (!this.preferLocal && await this.isOnline()) {
        const { data, error } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (!error && data) {
          data.total_amount = parseFloat(data.total_amount)
          return data
        }
      }

      // Fallback to local storage
      console.log('Updating order in local storage')
      localStorageDB.updateOrder(id, updates)

      // If in Electron, also update SQLite
      if (this.isElectron()) {
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ')
        const values = Object.values(updates)
        await electronDB.query(
          `UPDATE orders SET ${setClause}, updated_at = ? WHERE id = ?`,
          [...values, new Date().toISOString(), id]
        )
      }

      return { id, ...updates }
    } catch (error) {
      console.error('Error updating order:', error)
      throw error
    }
  }

  // Delete order
  async deleteOrder(id: string): Promise<void> {
    try {
      // Try Supabase first if online
      if (!this.preferLocal && await this.isOnline()) {
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', id)

        if (!error) {
          return
        }
      }

      // Fallback to local storage
      console.log('Deleting order from local storage')
      localStorageDB.deleteOrder(id)

      // If in Electron, also delete from SQLite
      if (this.isElectron()) {
        await electronDB.query('DELETE FROM orders WHERE id = ?', [id])
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      throw error
    }
  }

  // Sync to Supabase (Electron only)
  async syncToSupabase(): Promise<{ success: boolean; synced?: number; failed?: number; skipped?: number; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not in Electron environment' }
    }

    return await electronDB.syncToSupabase()
  }

  // Get sync status (Electron only)
  async getSyncStatus(): Promise<{ success: boolean; pending?: number; isSyncing?: boolean; error?: string }> {
    if (!this.isElectron()) {
      return { success: true, pending: 0, isSyncing: false }
    }

    return await electronDB.getSyncStatus()
  }

  // Backup database (Electron only)
  async backup(backupPath?: string): Promise<{ success: boolean; path?: string; error?: string; cancelled?: boolean }> {
    if (!this.isElectron()) {
      // Fallback to localStorage backup
      return electronDB.backup(backupPath)
    }

    return await electronDB.backup(backupPath)
  }

  // Restore database (Electron only)
  async restore(restorePath?: string): Promise<{ success: boolean; path?: string; error?: string; cancelled?: boolean }> {
    if (!this.isElectron()) {
      // Fallback to localStorage restore
      return electronDB.restore(restorePath)
    }

    return await electronDB.restore(restorePath)
  }
}

// Create singleton instance
export const unifiedDB = new UnifiedDB()
