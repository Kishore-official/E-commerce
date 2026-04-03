'use client';

import { useState, useRef, useCallback } from 'react';
import { Button, Spinner } from './index';
import { useToast } from '../hooks/use-toast';
import { resolveImageUrl } from '../lib/api-client';

export interface ImageUploadProps {
  onUpload: (file: File) => Promise<{ url: string; id: string }>;
  onDelete?: (imageId: string) => Promise<void>;
  existingImages?: Array<{ id: string; url: string; isPrimary?: boolean; altText?: string }>;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
}

export function ImageUpload({
  onUpload,
  onDelete,
  existingImages = [],
  maxSize = 5 * 1024 * 1024,
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  multiple = false,
}: ImageUploadProps) {
  const { addToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (file.size > maxSize) {
      addToast('error', `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return false;
    }

    const validTypes = accept.split(',').map((t) => t.trim());
    if (!validTypes.includes(file.type)) {
      addToast('error', 'Invalid file type. Please upload JPEG, PNG, or WebP images.');
      return false;
    }

    return true;
  };

  const handleFile = useCallback(
    async (file: File) => {
      if (!validateFile(file)) return;

      setUploading(true);
      try {
        await onUpload(file);
        addToast('success', 'Image uploaded successfully');
      } catch (error) {
        addToast('error', 'Failed to upload image');
      } finally {
        setUploading(false);
      }
    },
    [onUpload, addToast, maxSize, accept],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
        e.target.value = '';
      }
    },
    [handleFile],
  );

  const handleDelete = useCallback(
    async (imageId: string) => {
      if (!onDelete) return;
      if (!confirm('Are you sure you want to delete this image?')) return;

      try {
        await onDelete(imageId);
        addToast('success', 'Image deleted');
      } catch (error) {
        addToast('error', 'Failed to delete image');
      }
    },
    [onDelete, addToast],
  );

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner size="lg" />
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-600">
              Drag and drop an image here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:underline"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500">
              JPEG, PNG, WebP up to {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {existingImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {existingImages.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                <img
                  src={resolveImageUrl(image.url)}
                  alt={image.altText || 'Product image'}
                  className="w-full h-full object-cover"
                />
              </div>
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  Primary
                </div>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete image"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

