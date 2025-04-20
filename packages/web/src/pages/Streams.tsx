export const StreamsPage = () => {
  // Mock data (to be replaced with API data)
  const streams = [
    {
      id: '1',
      title: 'Gaming Marathon: Final Fantasy XVI',
      creator: 'GameMaster',
      viewers: 1024,
      isLive: true,
    },
    {
      id: '2',
      title: 'Web Development Tutorial: React Hooks',
      creator: 'CodeWithMe',
      viewers: 512,
      isLive: true,
    },
    {
      id: '3',
      title: 'Music Production Basics',
      creator: 'BeatMaker101',
      viewers: 256,
      isLive: false,
    },
    {
      id: '4',
      title: 'Digital Art Creation Process',
      creator: 'ArtistPro',
      viewers: 128,
      isLive: false,
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Live Streams</h1>
      
      <div className="mb-6 flex justify-between items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="Search streams..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        
        <div className="flex gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Create Stream
          </button>
          <select className="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Streams</option>
            <option value="live">Live Only</option>
            <option value="ended">Ended</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {streams.map((stream) => (
          <div key={stream.id} className="border rounded-lg overflow-hidden shadow-md">
            <div className="h-40 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">Stream Preview</span>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{stream.title}</h3>
                {stream.isLive ? (
                  <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs">LIVE</span>
                ) : (
                  <span className="bg-gray-600 text-white px-2 py-1 rounded-full text-xs">ENDED</span>
                )}
              </div>
              
              <div className="text-sm text-gray-600 mb-3">
                <p>Creator: {stream.creator}</p>
                <p>Viewers: {stream.viewers}</p>
              </div>
              
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg">
                {stream.isLive ? 'Join Stream' : 'Watch Recording'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}