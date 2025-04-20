import { Link } from 'react-router-dom'

export const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
      <h1 className="text-3xl font-bold mb-6">Page Not Found</h1>
      
      <p className="text-lg text-gray-600 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      
      <Link to="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg">
        Back to Home
      </Link>
    </div>
  )
}