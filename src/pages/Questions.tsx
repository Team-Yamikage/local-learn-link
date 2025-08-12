import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, Eye, Plus } from "lucide-react";
import { Link } from "react-router-dom";

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
  } | null;
  subjects: {
    name: string;
    code: string;
  } | null;
  answers: { count: number }[];
  answer_count?: number;
}

export default function Questions() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'resolved' | 'unanswered'>('all');

  useEffect(() => {
    fetchQuestions();
  }, [filter]);

  const fetchQuestions = async () => {
    try {
      // Use the regular questions table and compute answer counts manually
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          profiles:user_id (full_name),
          subjects:subject_id (name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get answer counts for all questions
      const { data: answerCounts, error: countError } = await supabase
        .from('answers')
        .select('question_id')
        .in('question_id', (data || []).map(q => q.id));

      if (countError) {
        console.error('Error fetching answer counts:', countError);
      }

      // Count answers per question
      const answerCountMap = (answerCounts || []).reduce((acc, answer) => {
        acc[answer.question_id] = (acc[answer.question_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Add answer counts to questions
      const questionsWithCounts = (data || []).map(question => ({
        ...question,
        answer_count: answerCountMap[question.id] || 0
      }));

      // Apply filter
      let filteredQuestions = questionsWithCounts;
      if (filter === 'resolved') {
        filteredQuestions = questionsWithCounts.filter(q => q.is_resolved);
      } else if (filter === 'unanswered') {
        filteredQuestions = questionsWithCounts.filter(q => q.answer_count === 0);
      }

      setQuestions(filteredQuestions as any);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold text-foreground">Questions</h1>
          <p className="text-muted-foreground">Discover and answer academic questions</p>
        </div>
        <Link to="/ask">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Ask Question
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Questions
        </Button>
        <Button
          variant={filter === 'unanswered' ? 'default' : 'outline'}
          onClick={() => setFilter('unanswered')}
        >
          Unanswered
        </Button>
        <Button
          variant={filter === 'resolved' ? 'default' : 'outline'}
          onClick={() => setFilter('resolved')}
        >
          Resolved
        </Button>
      </div>

      <div className="space-y-4">
        {questions.map((question) => (
          <Card key={question.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <Link 
                    to={`/questions/${question.id}`}
                    className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {question.title}
                  </Link>
                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                    {question.content}
                  </p>
                </div>
                {question.is_resolved && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Resolved
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  {question.upvotes}
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {question.answer_count || question.answers?.[0]?.count || 0}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {question.view_count}
                </div>
                <Badge className={getDifficultyColor(question.difficulty)}>
                  {question.difficulty}
                </Badge>
                {question.subjects && (
                  <Badge variant="outline">
                    {question.subjects.code}
                  </Badge>
                )}
                <span>by {question.profiles?.full_name}</span>
                <span>{new Date(question.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {questions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No questions found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'all' 
                ? "Be the first to ask a question!" 
                : `No ${filter} questions available.`}
            </p>
            <Link to="/ask">
              <Button>Ask the First Question</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}