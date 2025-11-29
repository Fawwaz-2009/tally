import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileUpload } from '@/components/ui/file-upload'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { createPublicFileKey } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/media-gallery')({
  component: MediaGallery,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      context.trpc.mediaGallery.list.queryOptions(),
    )
  },
})

const formSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required.')
    .max(200, 'Title must be at most 200 characters.'),
  description: z.string().max(500, 'Description must be at most 500 characters.').optional(),
  image: z.instanceof(File, { message: 'Please select an image' }),
})

function MediaGallery() {
  const trpc = useTRPC()
  const { data, refetch, error, isError, isLoading } = useQuery(
    trpc.mediaGallery.list.queryOptions(),
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  })

  const { mutate: addMedia, isPending: isAdding } = useMutation({
    ...trpc.mediaGallery.add.mutationOptions(),
    onSuccess: () => {
      refetch()
      form.reset()
    },
    onError: (error) => {
      console.error('Error adding media:', error)
      alert('Failed to upload image. Please try again.')
    },
  })

  const { mutate: deleteMedia } = useMutation({
    ...trpc.mediaGallery.delete.mutationOptions(),
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      console.error('Error deleting media:', error)
      alert('Failed to delete image. Please try again.')
    },
  })

  function onSubmit(data: z.infer<typeof formSchema>) {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      addMedia({
        title: data.title,
        description: data.description,
        imageBase64: base64,
        imageName: data.image.name,
        mimeType: data.image.type,
      })
    }
    reader.onerror = () => {
      alert('Failed to read file. Please try again.')
    }
    reader.readAsDataURL(data.image)
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-b from-gray-50 to-white p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error?.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Media Gallery</CardTitle>
            <CardDescription>
              Upload and manage your media files with R2 storage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              id="media-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FieldGroup>
                <Controller
                  name="title"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="media-title">Title</FieldLabel>
                      <Input
                        {...field}
                        id="media-title"
                        aria-invalid={fieldState.invalid}
                        placeholder="Enter a title for your image..."
                        disabled={isAdding}
                        autoComplete="off"
                      />
                      <FieldDescription>
                        A descriptive title for your image (1-200 characters)
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="description"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="media-description">
                        Description (optional)
                      </FieldLabel>
                      <Input
                        {...field}
                        id="media-description"
                        aria-invalid={fieldState.invalid}
                        placeholder="Enter a description..."
                        disabled={isAdding}
                        autoComplete="off"
                      />
                      <FieldDescription>
                        Additional details about your image (max 500 characters)
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="image"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Image</FieldLabel>
                      <FileUpload
                        value={field.value}
                        onChange={field.onChange}
                        accept="image/*"
                        maxSize={10}
                      />
                      <FieldDescription>
                        Select an image to upload (max 10MB)
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
              <Button type="submit" disabled={isAdding} className="w-full">
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Image
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Gallery Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Your Media ({data?.length ?? 0})
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : data?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">
                  No media yet. Upload your first image to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.map((media) => (
                <Card key={media.id} className="overflow-hidden group">
                  <div className="aspect-video relative bg-gray-100">
                    <img
                      src={createPublicFileKey(media.imageUrl)}
                      alt={media.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMedia({ id: media.id })}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {media.title}
                    </h3>
                    {media.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {media.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span>
                        {media.fileSize
                          ? `${(media.fileSize / 1024).toFixed(1)} KB`
                          : 'Unknown size'}
                      </span>
                      <span>
                        {media.createdAt
                          ? new Date(media.createdAt).toLocaleDateString()
                          : 'Unknown date'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

