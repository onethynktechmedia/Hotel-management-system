# Hotel Management System

A comprehensive hotel management system built with Next.js, TypeScript, TailwindCSS, and Supabase. This system provides a complete solution for restaurant operations including menu management, order processing, kitchen operations, and administrative functions.

## Features

### User-Facing Website
- Digital menu with dish descriptions and prices
- Category-based menu browsing
- Responsive design for all devices

### Staff Portal
- **Waiter Interface**: Take orders, manage tables, track order status
- **Kitchen Display**: Real-time order viewing, status updates, preparation tracking
- **Admin Dashboard**: Complete management of dishes, tables, orders, and payments

### Key Capabilities
- Real-time order tracking with Supabase subscriptions
- In-app notification system with browser notifications
- Mobile-responsive design optimized for tablets and phones
- Table management with occupancy tracking
- Order status workflow (pending → confirmed → preparing → ready → served → paid)
- Payment tracking and billing
- Multi-role authentication (admin, waiter, kitchen)

## Technology Stack

- **Frontend**: Next.js 16 with TypeScript
- **Styling**: TailwindCSS
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase subscriptions
- **Icons**: Lucide React
- **Notifications**: Browser Notification API

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account (credentials already configured)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
   - Go to your Supabase dashboard: https://supabase.com/dashboard/project/qthtkmlvoarafrxyjdpe
   - Navigate to the SQL Editor
   - Run the SQL commands from `supabase-schema.sql` to create the required tables

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Default Credentials

- **Admin**: admin@hotel.com / admin123

## Database Schema

The system uses the following main tables:
- `users`: Staff authentication and roles
- `tables`: Restaurant seating management
- `dishes`: Menu items and pricing
- `orders`: Order tracking and status
- `order_items`: Individual items in orders
- `notifications`: Real-time notifications
- `payments`: Payment tracking

## Usage Guide

### For Customers
- Visit the homepage to browse the menu
- View dishes by category with prices and descriptions

### For Waiters
1. Login with waiter credentials
2. Select a table from the available tables
3. Add dishes to the cart from the menu
4. Add special instructions if needed
5. Submit the order to send it to the kitchen
6. Track order status in real-time
7. Receive notifications when orders are ready

### For Kitchen Staff
1. Login with kitchen credentials
2. View pending orders in real-time
3. Start preparing orders
4. Mark items as ready when completed
5. Notifications are sent to waiters automatically

### For Admins
1. Login with admin credentials
2. Manage dishes (add, edit, remove)
3. Manage tables (add, edit, view occupancy)
4. View all orders and their status
5. Track payments and revenue
6. Manage staff members

## Notification System

The system includes a comprehensive notification system:
- **Waiter → Kitchen**: New order notifications
- **Kitchen → Waiter**: Order ready notifications
- **System → Admin**: Payment received notifications
- Browser notifications for mobile devices
- In-app notification dropdown with read/unread status

## Mobile Responsiveness

The application is fully responsive with:
- Mobile-optimized navigation
- Touch-friendly interfaces for waiters and kitchen staff
- Responsive grid layouts
- Optimized card designs for smaller screens

## Deployment

The easiest way to deploy is using [Vercel](https://vercel.com/new):

1. Push your code to GitHub
2. Import your repository to Vercel
3. Add environment variables if needed
4. Deploy

## Future Enhancements

- Advanced staff management
- Table reservation system
- Customer feedback and ratings
- Advanced reporting and analytics
- Inventory management
- Multi-location support

## Support

For issues or questions, please refer to the Supabase dashboard or Next.js documentation.
