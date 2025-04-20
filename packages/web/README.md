# Live Comment - Web Frontend

This is the web frontend package for Live Comment, a real-time commenting platform for live streams.

## Tech Stack

- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and development server
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and state management
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS framework
- **Vitest** - Testing framework
- **Testing Library** - Test utilities for React

## Directory Structure

```
src/
├── api/           # API clients and interfaces
├── components/    # Reusable UI components
│   └── layout/    # Layout components (Header, Footer, etc.)
├── hooks/         # Custom React hooks
├── pages/         # Page components
├── tests/         # Test utilities and setup
└── utils/         # Utility functions
```

## Component Design

The application follows a component-based architecture:

1. **Layout Components** - Handle the overall structure of the application
   - `Layout` - Main layout wrapper with header and footer
   - `Header` - Navigation and branding
   - `Footer` - Site information and links

2. **Page Components** - Full pages that are targets of routes
   - `HomePage` - Landing page
   - `StreamsPage` - List and search streams
   - `AboutPage` - Information about the application
   - `NotFoundPage` - 404 error page

3. **Feature Components** (to be implemented)
   - Stream-specific components
   - Comment-related components
   - User profile components

## Routing Design

The application uses React Router for client-side routing:

- `/` - Home page
- `/streams` - Streams list and search
- `/streams/:id` - Individual stream view (to be implemented)
- `/about` - About page
- `*` - 404 page (catch-all)

## API Client Structure

The API client is built with Axios and organized by resource:

- `client.ts` - Base API configuration and interceptors
- `streams.ts` - Endpoints for stream resources
- More resource clients to be added as needed

## Data Fetching Strategy

TanStack Query is used for data fetching, caching, and synchronization:

- Custom hooks encapsulate query logic (e.g., `useStreams`, `useStream`)
- Mutations are used for data modifications (e.g., `useCreateStream`)

## Styling Approach

Tailwind CSS is used for styling with a utility-first approach:

- Global styles in `index.css`
- Component-specific styles using Tailwind classes
- Custom CSS can be added for complex components

## Development

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run linter
npm run lint

# Type checking
npm run typecheck

# Build for production
npm run build
```

## Testing Strategy

Tests are written using Vitest and Testing Library:

- Component tests focus on user interactions
- Integration tests for page components
- Mocked API responses for data-dependent components
