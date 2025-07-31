import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, MessageSquare, Eye, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";

interface Answer {
  id: string;
  content: string;
  user_id: string;
  upvotes: number;
  is_accepted: boolean;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface Question {
  id: string;
  title: string;
  content: string;
  user_id: string;
  subject_id: string;
  difficulty: string;
  upvotes: number;
  view_count: number;
  is_resolved: boolean;
  created_at: string;
  profiles: {
    full_name: string;
  };
  subjects: {
    name: string;
    code: string;
  };
}

export default function QuestionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [newAnswer, setNewAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuestion();
      fetchAnswers();
      incrementViewCount();
    }
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          profiles:user_id (full_name),
          subjects:subject_id (name, code)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setQuestion(data as any);
    } catch (error) {
      console.error('Error fetching question:', error);
      navigate('/questions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async () => {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq('question_id', id)
        .order('is_accepted', { ascending: false })
        .order('upvotes', { ascending: false });

      if (error) throw error;
      setAnswers(data as any || []);
    } catch (error) {
      console.error('Error fetching answers:', error);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase
        .from('questions')
        .update({ view_count: (question?.view_count || 0) + 1 })
        .eq('id', id);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newAnswer.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('answers')
        .insert([{
          content: newAnswer,
          user_id: user.id,
          question_id: id
        }]);

      if (error) throw error;

      toast.success("Answer submitted successfully!");
      setNewAnswer("");
      fetchAnswers();
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error("Failed to submit answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const upvoteAnswer = async (answerId: string) => {
    if (!user) return;

    try {
      // Simple upvote increment for now
      const { error } = await supabase
        .from('answers')
        .update({ upvotes: answers.find(a => a.id === answerId)?.upvotes + 1 })
        .eq('id', answerId);

      if (error) throw error;
      fetchAnswers();
    } catch (error) {
      console.error('Error upvoting answer:', error);
    }
  };

  const acceptAnswer = async (answerId: string) => {
    if (!user || !question || question.user_id !== user.id) return;

    try {
      // Unmark all other answers as accepted
      await supabase
        .from('answers')
        .update({ is_accepted: false })
        .eq('question_id', id);

      // Mark this answer as accepted
      const { error } = await supabase
        .from('answers')
        .update({ is_accepted: true })
        .eq('id', answerId);

      if (error) throw error;

      // Mark question as resolved
      await supabase
        .from('questions')
        .update({ is_resolved: true })
        .eq('id', id);

      toast.success("Answer accepted!");
      fetchQuestion();
      fetchAnswers();
    } catch (error) {
      console.error('Error accepting answer:', error);
      toast.error("Failed to accept answer. Please try again.");
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-3/4"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Question not found</h1>
        <Button onClick={() => navigate('/questions')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Questions
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button 
        onClick={() => navigate('/questions')} 
        variant="ghost" 
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Questions
      </Button>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{question.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>by {question.profiles?.full_name}</span>
                <span>{new Date(question.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {question.view_count}
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {answers.length}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {question.is_resolved && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  Resolved
                </Badge>
              )}
              <Badge className={getDifficultyColor(question.difficulty)}>
                {question.difficulty}
              </Badge>
              {question.subjects && (
                <Badge variant="outline">
                  {question.subjects.code}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">{question.content}</p>
        </CardContent>
      </Card>

      {/* Answers Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
        </h2>

        {answers.map((answer) => (
          <Card key={answer.id} className={answer.is_accepted ? 'border-green-500' : ''}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{answer.profiles?.full_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(answer.created_at).toLocaleDateString()}
                  </span>
                  {answer.is_accepted && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Accepted
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => upvoteAnswer(answer.id)}
                    disabled={!user}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    {answer.upvotes}
                  </Button>
                  {user && question.user_id === user.id && !question.is_resolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acceptAnswer(answer.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{answer.content}</p>
            </CardContent>
          </Card>
        ))}

        {answers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No answers yet</h3>
              <p className="text-muted-foreground">Be the first to answer this question!</p>
            </CardContent>
          </Card>
        )}

        {/* Answer Form */}
        {user && !question.is_resolved && (
          <Card>
            <CardHeader>
              <CardTitle>Your Answer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitAnswer} className="space-y-4">
                <Textarea
                  placeholder="Write your answer here..."
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  className="min-h-32"
                  required
                />
                <Button type="submit" disabled={submitting || !newAnswer.trim()}>
                  {submitting ? "Submitting..." : "Submit Answer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {!user && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Please log in to answer this question.</p>
              <Button onClick={() => navigate('/auth')}>Log In</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}