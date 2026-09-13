import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500">
      <nav className="bg-white/95 backdrop-blur-sm shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                🍽️ Hotel Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/menu" className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-2 rounded-md text-sm font-bold hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                📋 View Menu
              </Link>
              <Link href="/login" className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 drop-shadow-lg">
            Welcome to Our Restaurant
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            Experience delicious food with our modern ordering system
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mt-12">
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Digital Menu</h3>
              <p className="text-gray-600 mb-4">Browse our delicious dishes with prices and descriptions</p>
              <Link href="/menu" className="inline-block bg-orange-500 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors duration-300 shadow-md">
                Explore Menu
              </Link>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-5xl mb-4">👨‍🍳</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Smart Kitchen</h3>
              <p className="text-gray-600">Real-time order tracking and kitchen management</p>
            </div>
            
            <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-5xl mb-4">💳</div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Easy Billing</h3>
              <p className="text-gray-600">Seamless payment processing and order management</p>
            </div>
          </div>

          <div className="mt-12">
            <Link href="/menu" className="inline-block bg-white text-orange-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-orange-50 transition-all duration-300 transform hover:scale-105 shadow-lg">
              View Our Menu
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
