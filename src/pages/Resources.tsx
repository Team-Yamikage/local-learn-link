import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Download, Upload, FileText, Image as ImageIcon, File, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import FileUpload from '@/components/FileUpload';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  file_size: number;
  download_count: number;
  rating: number;
  user_id: string;
  subject_id: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
  subjects: {
    name: string;
    code: string;
  } | null;
}

const Resources = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    subject_id: '',
    file: null as File | null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchResources();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          profiles!user_id (full_name),
          subjects!subject_id (name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data as any || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    // Simulate file upload - in real app, upload to Supabase Storage
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`https://example.com/files/${file.name}`);
      }, 1000);
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !uploadForm.file) return;

    setUploading(true);
    try {
      const fileUrl = await handleFileUpload(uploadForm.file);
      
      const { error } = await supabase
        .from('resources')
        .insert([{
          title: uploadForm.title,
          description: uploadForm.description,
          subject_id: uploadForm.subject_id || null,
          file_url: fileUrl,
          file_type: uploadForm.file.type,
          file_size: uploadForm.file.size,
          user_id: user.id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Resource uploaded successfully!",
      });

      setShowUploadDialog(false);
      setUploadForm({ title: '', description: '', subject_id: '', file: null });
      fetchResources();
    } catch (error) {
      console.error('Error uploading resource:', error);
      toast({
        title: "Error",
        description: "Failed to upload resource",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadResource = async (resourceId: string, fileUrl: string) => {
    try {
      const resource = resources.find(r => r.id === resourceId);
      if (resource) {
        await supabase
          .from('resources')
          .update({ download_count: resource.download_count + 1 })
          .eq('id', resourceId);
      }
      window.open(fileUrl, '_blank');
      fetchResources();
    } catch (error) {
      console.error('Error downloading resource:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    return <FileText className="h-4 w-4" />;
  };

  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.subjects?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resources</h1>
          <p className="text-muted-foreground">Share and discover study materials</p>
        </div>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Resource</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Resource title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the resource..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Select
                  value={uploadForm.subject_id}
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, subject_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>File</Label>
                <FileUpload
                  onFileUpload={handleFileUpload}
                  acceptedTypes={['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png']}
                  maxSize={10}
                  onFilesSelected={(files) => setUploadForm(prev => ({ ...prev, file: files[0] }))}
                />
                {uploadForm.file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {uploadForm.file.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={!uploadForm.file || uploading} className="flex-1">
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {getFileIcon(resource.file_type)}
                {resource.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {resource.description}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  {resource.download_count}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current text-yellow-500" />
                  {resource.rating.toFixed(1)}
                </div>
                <span>{formatFileSize(resource.file_size || 0)}</span>
              </div>

              <div className="flex items-center justify-between mb-4">
                {resource.subjects && (
                  <Badge variant="outline">
                    {resource.subjects.code}
                  </Badge>
                )}
                <Badge variant="secondary">
                  {resource.file_type?.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>by {resource.profiles?.full_name}</p>
                  <p>{new Date(resource.created_at).toLocaleDateString()}</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => downloadResource(resource.id, resource.file_url)}
                  disabled={!resource.file_url}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No resources found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? "Try adjusting your search terms." 
                : "Be the first to share a study resource!"}
            </p>
            <Button onClick={() => setShowUploadDialog(true)}>
              Upload Resource
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Resources;