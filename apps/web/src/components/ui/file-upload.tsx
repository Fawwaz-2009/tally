'use client'

import { useState, useRef } from 'react'
import { Input } from './input'
import { Button } from './button'
import { X, Upload } from 'lucide-react'

interface FileUploadProps {
  value?: File
  onChange: (file?: File) => void
  accept?: string
  maxSize?: number
}

export function FileUpload({
  value,
  onChange,
  accept = 'image/*',
  maxSize = 5,
}: FileUploadProps) {
  const [preview, setPreview] = useState<string>()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`)
      return
    }

    onChange(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleClear = () => {
    onChange(undefined)
    setPreview(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-orange-500 bg-orange-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          <Upload className="h-8 w-8 text-gray-400" />
          <div className="text-sm font-medium text-gray-700">
            Drag and drop your image here
          </div>
          <div className="text-xs text-gray-500">
            or click to select (max {maxSize}MB)
          </div>
        </label>
      </div>

      {preview && (
        <div className="relative w-full">
          <img
            src={preview}
            alt="Preview"
            className="max-h-48 mx-auto rounded-lg border border-gray-200"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute top-2 right-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {value && (
        <div className="text-sm text-gray-600">
          Selected: <span className="font-medium">{value.name}</span>
        </div>
      )}
    </div>
  )
}
