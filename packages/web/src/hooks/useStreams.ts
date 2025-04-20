import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { streamApi, Stream } from '../api/streams'

export const useStreams = () => {
  return useQuery({
    queryKey: ['streams'],
    queryFn: streamApi.getStreams,
  })
}

export const useStream = (streamId: string) => {
  return useQuery({
    queryKey: ['streams', streamId],
    queryFn: () => streamApi.getStream(streamId),
    // Only fetch if we have a streamId
    enabled: !!streamId,
  })
}

export const useCreateStream = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: streamApi.createStream,
    onSuccess: (newStream) => {
      // Invalidate and refetch the streams list query
      queryClient.invalidateQueries({ queryKey: ['streams'] })
      
      // Add the new stream to the query cache
      queryClient.setQueryData(['streams', newStream.id], newStream)
    },
  })
}

export const useUpdateStream = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Stream> }) => 
      streamApi.updateStream(id, data),
    onSuccess: (updatedStream) => {
      // Update the stream in the streams list
      queryClient.setQueryData(['streams', updatedStream.id], updatedStream)
      
      // Invalidate the streams list query to refetch with updated data
      queryClient.invalidateQueries({ queryKey: ['streams'] })
    },
  })
}

export const useDeleteStream = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: streamApi.deleteStream,
    onSuccess: (_, deletedStreamId) => {
      // Remove the stream from the cache
      queryClient.removeQueries({ queryKey: ['streams', deletedStreamId] })
      
      // Invalidate and refetch the streams list
      queryClient.invalidateQueries({ queryKey: ['streams'] })
    },
  })
}