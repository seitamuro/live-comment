export const AboutPage = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">About Live Comment</h1>
      
      <div className="prose lg:prose-xl">
        <p className="mb-4">
          Live Comment is an innovative platform that enables real-time commenting during live streams,
          fostering engagement and community interaction in a seamless, intuitive interface.
        </p>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">Our Mission</h2>
        <p className="mb-4">
          We aim to revolutionize the way audiences engage with live content by providing
          a robust, scalable, and user-friendly commenting system that enhances the viewing
          experience and builds stronger communities around shared interests.
        </p>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">Technology Stack</h2>
        <p className="mb-4">
          Live Comment is built using cutting-edge technologies to ensure performance,
          reliability, and scalability:
        </p>
        
        <ul className="list-disc pl-5 mb-6">
          <li>Frontend: React, TypeScript, Tailwind CSS</li>
          <li>Backend: Node.js, Express, WebSockets</li>
          <li>Database: MongoDB</li>
          <li>Infrastructure: AWS, CloudFormation</li>
          <li>Real-time Communication: Socket.IO</li>
        </ul>
        
        <h2 className="text-2xl font-bold mt-8 mb-4">Contact Us</h2>
        <p className="mb-4">
          Have questions, feedback, or suggestions? We'd love to hear from you!
        </p>
        
        <div className="bg-gray-100 p-6 rounded-lg">
          <p className="mb-2">
            <strong>Email:</strong> contact@livecomment.example.com
          </p>
          <p className="mb-2">
            <strong>GitHub:</strong>{' '}
            <a 
              href="https://github.com/seitamuro/live-comment" 
              className="text-blue-600 hover:underline"
              target="_blank" 
              rel="noopener noreferrer"
            >
              github.com/seitamuro/live-comment
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}