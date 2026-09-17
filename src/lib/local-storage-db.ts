// Local Storage Database for Offline Mode
// This provides a complete offline database using browser localStorage

export interface LocalOrder {
  id: string
  table_id: string
  customer_name: string
  total_amount: number
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'paid'
  created_at: string
  updated_at: string
  order_items: LocalOrderItem[]
  tables?: LocalTable
  users?: LocalUser
}

export interface LocalOrderItem {
  id: string
  order_id: string
  dish_id: string
  quantity: number
  dish_type: string
  dishes?: LocalDish
}

export interface LocalDish {
  id: string
  name: string
  price: number
  category: string
  is_available: boolean
  image_url?: string
}

export interface LocalTable {
  id: string
  table_number: number
  capacity: number
  is_available: boolean
}

export interface LocalUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'waiter' | 'kitchen'
}

class LocalStorageDB {
  private prefix = 'hotel_'

  // Helper methods
  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  private get<T>(key: string): T[] {
    const data = localStorage.getItem(this.getKey(key))
    return data ? JSON.parse(data) : []
  }

  private set<T>(key: string, data: T[]): void {
    localStorage.setItem(this.getKey(key), JSON.stringify(data))
  }

  // Orders
  getOrders(): LocalOrder[] {
    return this.get<LocalOrder>('orders')
  }

  getOrderById(id: string): LocalOrder | undefined {
    const orders = this.getOrders()
    return orders.find(o => o.id === id)
  }

  addOrder(order: LocalOrder): void {
    const orders = this.getOrders()
    orders.push(order)
    this.set('orders', orders)
  }

  updateOrder(id: string, updates: Partial<LocalOrder>): void {
    const orders = this.getOrders()
    const index = orders.findIndex(o => o.id === id)
    if (index !== -1) {
      orders[index] = { ...orders[index], ...updates, updated_at: new Date().toISOString() }
      this.set('orders', orders)
    }
  }

  deleteOrder(id: string): void {
    const orders = this.getOrders().filter(o => o.id !== id)
    this.set('orders', orders)
  }

  // Dishes
  getDishes(): LocalDish[] {
    return this.get<LocalDish>('dishes')
  }

  addDish(dish: LocalDish): void {
    const dishes = this.getDishes()
    dishes.push(dish)
    this.set('dishes', dishes)
  }

  updateDish(id: string, updates: Partial<LocalDish>): void {
    const dishes = this.getDishes()
    const index = dishes.findIndex(d => d.id === id)
    if (index !== -1) {
      dishes[index] = { ...dishes[index], ...updates }
      this.set('dishes', dishes)
    }
  }

  deleteDish(id: string): void {
    const dishes = this.getDishes().filter(d => d.id !== id)
    this.set('dishes', dishes)
  }

  // Tables
  getTables(): LocalTable[] {
    return this.get<LocalTable>('tables')
  }

  addTable(table: LocalTable): void {
    const tables = this.getTables()
    tables.push(table)
    this.set('tables', tables)
  }

  updateTable(id: string, updates: Partial<LocalTable>): void {
    const tables = this.getTables()
    const index = tables.findIndex(t => t.id === id)
    if (index !== -1) {
      tables[index] = { ...tables[index], ...updates }
      this.set('tables', tables)
    }
  }

  deleteTable(id: string): void {
    const tables = this.getTables().filter(t => t.id !== id)
    this.set('tables', tables)
  }

  // Users
  getUsers(): LocalUser[] {
    return this.get<LocalUser>('users')
  }

  addUser(user: LocalUser): void {
    const users = this.getUsers()
    users.push(user)
    this.set('users', users)
  }

  // Initialize with sample data
  initializeSampleData(): void {
    // Check if already initialized
    if (this.getDishes().length > 0) return

    // Sample dishes
    const sampleDishes: LocalDish[] = [
      { id: '1', name: 'Butter Chicken', price: 250, category: 'Main Course', is_available: true },
      { id: '2', name: 'Paneer Tikka', price: 200, category: 'Starters', is_available: true },
      { id: '3', name: 'Naan', price: 30, category: 'Bread', is_available: true },
      { id: '4', name: 'Dal Makhani', price: 180, category: 'Main Course', is_available: true },
      { id: '5', name: 'Biryani', price: 220, category: 'Main Course', is_available: true },
    ]
    this.set('dishes', sampleDishes)

    // Sample tables
    const sampleTables: LocalTable[] = [
      { id: '1', table_number: 1, capacity: 4, is_available: true },
      { id: '2', table_number: 2, capacity: 4, is_available: true },
      { id: '3', table_number: 3, capacity: 6, is_available: true },
      { id: '4', table_number: 4, capacity: 2, is_available: true },
      { id: '5', table_number: 5, capacity: 8, is_available: true },
    ]
    this.set('tables', sampleTables)

    // Sample users
    const sampleUsers: LocalUser[] = [
      { id: '1', name: 'Admin', email: 'admin@hotel.com', role: 'admin' },
      { id: '2', name: 'Waiter 1', email: 'waiter1@hotel.com', role: 'waiter' },
      { id: '3', name: 'Kitchen', email: 'kitchen@hotel.com', role: 'kitchen' },
    ]
    this.set('users', sampleUsers)

    console.log('Sample data initialized')
  }

  // Clear all data
  clearAll(): void {
    localStorage.clear()
  }

  // Export data
  exportData(): string {
    const data = {
      orders: this.getOrders(),
      dishes: this.getDishes(),
      tables: this.getTables(),
      users: this.getUsers(),
    }
    return JSON.stringify(data, null, 2)
  }

  // Import data
  importData(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString)
      if (data.orders) this.set('orders', data.orders)
      if (data.dishes) this.set('dishes', data.dishes)
      if (data.tables) this.set('tables', data.tables)
      if (data.users) this.set('users', data.users)
      console.log('Data imported successfully')
    } catch (error) {
      console.error('Failed to import data:', error)
    }
  }
}

export const localStorageDB = new LocalStorageDB()
