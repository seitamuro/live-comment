import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

// Create a test query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

// Wrap the component with all required providers
const renderApp = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('App', () => {
  it('renders the header with navigation links', () => {
    renderApp()
    
    // Check for header elements
    expect(screen.getByText('Live Comment')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Streams')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
  })
  
  it('renders the footer', () => {
    renderApp()
    
    // Check for footer elements
    const currentYear = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(`© ${currentYear} Live Comment`))).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
  })
  
  it('renders the homepage by default', () => {
    renderApp()
    
    // Check for homepage content
    expect(screen.getByText('Welcome to Live Comment')).toBeInTheDocument()
    expect(screen.getByText('Real-time commenting platform for live streams')).toBeInTheDocument()
  })
})