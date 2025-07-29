import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  MessageCircle, 
  Users, 
  Award, 
  ArrowRight,
  CheckCircle,
  Star,
  TrendingUp,
  Globe
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: MessageCircle,
      title: "Ask & Answer",
      description: "Get help with your studies and help others learn",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      icon: BookOpen,
      title: "Share Resources",
      description: "Upload and access study materials, notes, and guides",
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      icon: Users,
      title: "Study Groups",
      description: "Join or create groups to learn together",
      color: "text-accent",
      bgColor: "bg-accent/10"
    },
    {
      icon: Award,
      title: "Earn Recognition",
      description: "Get points and badges for helping the community",
      color: "text-warning",
      bgColor: "bg-warning/10"
    }
  ];

  const stats = [
    { label: "Active Students", value: "500+", icon: Users },
    { label: "Questions Answered", value: "2K+", icon: CheckCircle },
    { label: "Study Groups", value: "150+", icon: TrendingUp },
    { label: "Countries", value: "12+", icon: Globe }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/10">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <Badge 
              variant="outline" 
              className="px-4 py-2 text-sm bg-primary/10 border-primary/20 text-primary"
            >
              🎓 Empowering rural and small-town students
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Learn Together,
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Grow Together
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              StudyCircle connects students in underserved communities to share knowledge, 
              solve problems, and support each other's academic journey.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/auth" className="flex items-center space-x-2">
                  <span>Join StudyCircle</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <Link to="#features">
                  <span>Learn More</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center space-y-2">
                  <Icon className="h-8 w-8 mx-auto text-primary" />
                  <div className="text-2xl md:text-3xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything You Need to Excel
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform provides all the tools and community support you need for academic success
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="p-6 space-y-4">
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="flex justify-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 text-warning fill-current" />
              ))}
            </div>
            <blockquote className="text-xl lg:text-2xl text-foreground leading-relaxed">
              "StudyCircle transformed my learning experience. Having access to peers and 
              resources from my local community made all the difference in my studies."
            </blockquote>
            <div className="space-y-2">
              <div className="font-semibold">Priya Sharma</div>
              <div className="text-muted-foreground">Grade 12 Student, Rajasthan</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary to-accent text-white overflow-hidden">
            <CardContent className="p-12 text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to Start Learning?
              </h2>
              <p className="text-xl opacity-90 max-w-2xl mx-auto">
                Join thousands of students who are already collaborating, 
                learning, and achieving their academic goals together.
              </p>
              <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
                <Link to="/auth" className="flex items-center space-x-2">
                  <span>Get Started Free</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
