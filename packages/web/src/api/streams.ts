import apiClient from './client'

export interface Stream {
  id: string
  title: string
  description?: string
  creator: string
  createdAt: string
  isLive: boolean
  viewers?: number
}

export const streamApi = {
  // Get all streams
  getStreams: async () => {
    const response = await apiClient.get<Stream[]>('/streams')
    return response.data
  },

  // Get a specific stream by ID
  getStream: async (id: string) => {
    const response = await apiClient.get<Stream>(`/streams/${id}`)
    return response.data
  },

  // Create a new stream
  createStream: async (streamData: Omit<Stream, 'id' | 'createdAt' | 'isLive' | 'viewers'>) => {
    const response = await apiClient.post<Stream>('/streams', streamData)
    return response.data
  },

  // Update a stream
  updateStream: async (id: string, streamData: Partial<Stream>) => {
    const response = await apiClient.put<Stream>(`/streams/${id}`, streamData)
    return response.data
  },

  // Delete a stream
  deleteStream: async (id: string) => {
    const response = await apiClient.delete(`/streams/${id}`)
    return response.data
  },
}