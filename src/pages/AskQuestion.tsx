import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Subject {
  id: string;
  name: string;
  code: string;
}

export default function AskQuestion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    subject_id: "",
    difficulty: "medium",
    grade_level: ""
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('is_active', true);
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([{
          ...formData,
          user_id: user.id,
          subject_id: formData.subject_id || null,
          difficulty: formData.difficulty as 'easy' | 'medium' | 'hard'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Question posted successfully!");
      navigate(`/questions/${data.id}`);
    } catch (error) {
      console.error('Error posting question:', error);
      toast.error("Failed to post question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Ask a Question</CardTitle>
          <p className="text-muted-foreground">
            Get help from the StudyCircle community
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Question Title *</Label>
              <Input
                id="title"
                placeholder="What's your question about?"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Question Details *</Label>
              <Textarea
                id="content"
                placeholder="Provide more details about your question..."
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                className="min-h-32"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={formData.subject_id} onValueChange={(value) => handleChange('subject_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.code} - {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => handleChange('difficulty', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade_level">Grade Level</Label>
                <Input
                  id="grade_level"
                  placeholder="e.g., Grade 10, College"
                  value={formData.grade_level}
                  onChange={(e) => handleChange('grade_level', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Posting..." : "Post Question"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/questions')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}