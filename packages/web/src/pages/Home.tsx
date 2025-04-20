export const HomePage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to Live Comment</h1>
        <p className="text-xl text-gray-600">
          Real-time commenting platform for live streams
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Create a Stream</h2>
          <p className="mb-4">
            Start a new live stream and engage with your audience through real-time comments.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Get Started
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Join a Stream</h2>
          <p className="mb-4">
            Join an existing stream and participate by leaving comments in real-time.
          </p>
          <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Browse Streams
          </button>
        </div>
      </div>
      
      <div className="bg-gray-100 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Real-time Comments</h3>
            <p>Engage with viewers through instant comment delivery system</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">User Authentication</h3>
            <p>Secure login and user management system</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Analytics</h3>
            <p>Track engagement and viewer statistics</p>
          </div>
        </div>
      </div>
    </div>
  )
}