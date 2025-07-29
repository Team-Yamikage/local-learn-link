import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Plus,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Question {
  id: string;
  title: string;
  content: string;
  difficulty: string;
  is_resolved: boolean;
  created_at: string;
  view_count: number;
  upvotes: number;
  profiles: {
    full_name: string;
    avatar_url?: string;
  } | null;
  subjects: {
    name: string;
    code: string;
  } | null;
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  privacy: string;
  created_at: string;
  subjects: {
    name: string;
  } | null;
}

interface DashboardStats {
  totalQuestions: number;
  totalAnswers: number;
  totalGroups: number;
  userPoints: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [recentQuestions, setRecentQuestions] = useState<Question[]>([]);
  const [popularGroups, setPopularGroups] = useState<StudyGroup[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuestions: 0,
    totalAnswers: 0,
    totalGroups: 0,
    userPoints: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch recent questions with proper joins
      const { data: questions } = await supabase
        .from('questions')
        .select(`
          id,
          title,
          content,
          difficulty,
          is_resolved,
          created_at,
          view_count,
          upvotes,
          user_id,
          subjects (
            name,
            code
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch user profiles for questions
      let questionsWithProfiles: Question[] = [];
      if (questions) {
        const userIds = questions.map(q => q.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        questionsWithProfiles = questions.map(question => ({
          ...question,
          profiles: profiles?.find(p => p.user_id === question.user_id) || null
        }));
      }

      // Fetch popular groups
      const { data: groups } = await supabase
        .from('study_groups')
        .select(`
          id,
          name,
          description,
          privacy,
          created_at,
          subjects (
            name
          )
        `)
        .eq('privacy', 'public')
        .order('created_at', { ascending: false })
        .limit(4);

      // Fetch user stats
      const [questionsCount, answersCount, groupsCount, userProfile] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('answers').select('id', { count: 'exact', head: true }),
        supabase.from('study_groups').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('points').eq('user_id', user.id).single()
      ]);

      setRecentQuestions(questionsWithProfiles);
      setPopularGroups(groups || []);
      setStats({
        totalQuestions: questionsCount.count || 0,
        totalAnswers: answersCount.count || 0,
        totalGroups: groupsCount.count || 0,
        userPoints: userProfile.data?.points || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success/10 text-success border-success/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'hard': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here's what's happening in your learning community today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <MessageCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">Questions asked by community</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Answers</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.totalAnswers}</div>
            <p className="text-xs text-muted-foreground">Helpful answers provided</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Groups</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.totalGroups}</div>
            <p className="text-xs text-muted-foreground">Active learning groups</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Points</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.userPoints}</div>
            <p className="text-xs text-muted-foreground">Keep contributing to earn more!</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button asChild className="h-auto p-4 flex flex-col items-center space-y-2">
              <Link to="/questions/ask">
                <Plus className="h-6 w-6" />
                <span>Ask a Question</span>
                <span className="text-xs opacity-80">Get help from the community</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Link to="/groups/create">
                <Users className="h-6 w-6" />
                <span>Create Study Group</span>
                <span className="text-xs opacity-80">Start learning together</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Link to="/resources/upload">
                <BookOpen className="h-6 w-6" />
                <span>Share Resources</span>
                <span className="text-xs opacity-80">Upload helpful materials</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Questions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Questions</CardTitle>
              <CardDescription>Latest questions from the community</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/questions" className="flex items-center space-x-1">
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentQuestions.map((question) => (
              <div key={question.id} className="flex space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={question.profiles?.avatar_url} />
                  <AvatarFallback>
                    {question.profiles?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <Link to={`/questions/${question.id}`} className="block">
                    <h4 className="text-sm font-medium hover:text-primary transition-colors line-clamp-1">
                      {question.title}
                    </h4>
                  </Link>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                      {question.difficulty}
                    </Badge>
                    {question.subjects && (
                      <Badge variant="secondary">{question.subjects.name}</Badge>
                    )}
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(question.created_at)}</span>
                    </div>
                    {question.is_resolved && (
                      <CheckCircle className="h-3 w-3 text-success" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {recentQuestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No questions yet. Be the first to ask!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Popular Study Groups */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Popular Study Groups</CardTitle>
              <CardDescription>Join active learning communities</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/groups" className="flex items-center space-x-1">
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {popularGroups.map((group) => (
              <div key={group.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <Link to={`/groups/${group.id}`} className="block space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium hover:text-primary transition-colors">
                      {group.name}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {group.privacy}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {group.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {group.subjects && (
                      <Badge variant="secondary">{group.subjects.name}</Badge>
                    )}
                    <span>{formatTimeAgo(group.created_at)}</span>
                  </div>
                </Link>
              </div>
            ))}
            {popularGroups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No study groups yet. Create the first one!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;