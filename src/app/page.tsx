import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-green-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-green-700">
                Hotel Management
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/menu" className="bg-green-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
                View Menu
              </Link>
              <Link href="/login" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-green-600 rounded-2xl p-12 mb-12">
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6">
            Welcome to Our Restaurant
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            Experience delicious food with our modern ordering system
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2 text-gray-800">Digital Menu</h3>
              <p className="text-gray-600 mb-4">Browse our delicious dishes with prices and descriptions</p>
              <Link href="/menu" className="inline-block bg-green-600 text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
                Explore Menu
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2 text-gray-800">Smart Kitchen</h3>
              <p className="text-gray-600">Real-time order tracking and kitchen management</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2 text-gray-800">Easy Billing</h3>
              <p className="text-gray-600">Seamless payment processing and order management</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/menu" className="inline-block bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-green-50 transition-colors shadow-md">
              View Our Menu
            </Link>
          </div>
      </main>
    </div>
  )
}
