import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { X, Upload, FileText, Image as ImageIcon, File } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<string>;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  multiple?: boolean;
  onFilesSelected?: (files: File[]) => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  url?: string;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'],
  maxSize = 10, // 10MB default
  multiple = false,
  onFilesSelected
}) => {
  const { toast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;

    // Validate file sizes
    const oversizedFiles = acceptedFiles.filter(file => file.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxSize}MB`,
        variant: "destructive",
      });
      return;
    }

    if (onFilesSelected) {
      onFilesSelected(acceptedFiles);
      return;
    }

    // Initialize uploading state
    const newUploadingFiles = acceptedFiles.map(file => ({
      file,
      progress: 0
    }));

    setUploadingFiles(newUploadingFiles);

    // Upload files
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      try {
        // Simulate progress updates
        const updateProgress = (progress: number) => {
          setUploadingFiles(prev => 
            prev.map((uploadFile, index) => 
              index === i ? { ...uploadFile, progress } : uploadFile
            )
          );
        };

        // Simulate progress
        updateProgress(25);
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(50);
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(75);

        const url = await onFileUpload(file);
        
        updateProgress(100);
        
        setUploadingFiles(prev => 
          prev.map((uploadFile, index) => 
            index === i ? { ...uploadFile, url, progress: 100 } : uploadFile
          )
        );

        toast({
          title: "Success",
          description: `${file.name} uploaded successfully`,
        });

      } catch (error) {
        setUploadingFiles(prev => 
          prev.map((uploadFile, index) => 
            index === i ? { ...uploadFile, error: 'Upload failed', progress: 0 } : uploadFile
          )
        );

        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }

    // Clear uploading files after a delay
    setTimeout(() => {
      setUploadingFiles([]);
    }, 3000);

  }, [onFileUpload, maxSize, onFilesSelected, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      if (type.startsWith('.')) {
        // File extension
        acc[`application/*`] = [type];
        acc[`image/*`] = [type];
        acc[`text/*`] = [type];
      } else {
        // MIME type
        acc[type] = [];
      }
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxSize * 1024 * 1024,
    multiple
  });

  const removeUploadingFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText className="h-4 w-4" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            
            {isDragActive ? (
              <p className="text-primary font-medium">Drop the files here...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-foreground font-medium">
                  Drop files here or click to select
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports: {acceptedTypes.join(', ')} (max {maxSize}MB)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploading files...</h4>
          {uploadingFiles.map((uploadFile, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {getFileIcon(uploadFile.file.name)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUploadingFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                    
                    {uploadFile.error ? (
                      <p className="text-xs text-destructive">{uploadFile.error}</p>
                    ) : uploadFile.progress === 100 && uploadFile.url ? (
                      <p className="text-xs text-green-600">Upload complete!</p>
                    ) : (
                      <Progress value={uploadFile.progress} className="h-2" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;