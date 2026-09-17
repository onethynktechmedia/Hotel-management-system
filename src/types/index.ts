export interface User {
  id: string
  email: string
  role: 'admin' | 'waiter' | 'kitchen'
  name: string
  created_at: string
}

export interface Table {
  id: string
  table_number: number
  capacity: number
  is_occupied: boolean
  is_master: boolean
  created_at: string
}

export interface Dish {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  image_url: string | null
  is_available: boolean
  created_at: string
}

export interface Order {
  id: string
  table_id: string
  waiter_id: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'paid'
  total_amount: number
  customer_name?: string
  customer_mobile?: string
  created_at: string
  updated_at: string
  tables?: Table
  users?: User
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  dish_id: string
  quantity: number
  price: number
  special_instructions: string | null
  status: 'pending' | 'preparing' | 'ready' | 'served'
  created_at: string
  dish_type?: string
  dish?: Dish
  dishes?: Dish
}

export interface Notification {
  id: string
  user_id: string
  order_id: string
  type: 'new_order' | 'order_confirmed' | 'order_ready' | 'order_completed' | 'order_served' | 'payment_received'
  message: string
  is_read: boolean
  created_at: string
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  payment_method: 'cash' | 'card' | 'upi'
  status: 'pending' | 'completed' | 'refunded'
  created_at: string
}

export interface CartItem {
  dish_id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
  dish_type?: string
}
