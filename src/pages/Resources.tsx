import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Download, Upload, Search, Star } from "lucide-react";
import { Link } from "react-router-dom";

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

export default function Resources() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          profiles:user_id (full_name),
          subjects:subject_id (name, code)
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

  const downloadResource = async (resourceId: string, fileUrl: string) => {
    try {
      // Increment download count
      const resource = resources.find(r => r.id === resourceId);
      if (resource) {
        await supabase
          .from('resources')
          .update({ download_count: resource.download_count + 1 })
          .eq('id', resourceId);
      }

      // Download file
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
        <Link to="/upload-resource">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Resource
          </Button>
        </Link>
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
            <Link to="/upload-resource">
              <Button>Upload Resource</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}