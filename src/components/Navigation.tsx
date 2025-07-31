import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, MessageCircle, Users, Trophy, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  full_name: string;
  points: number;
  avatar_url?: string;
}

const Navigation = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('full_name, points, avatar_url')
      .eq('user_id', user.id)
      .single();
      
    if (data) {
      setProfile(data);
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BookOpen },
    { href: '/questions', label: 'Questions', icon: MessageCircle },
    { href: '/groups', label: 'Study Groups', icon: Users },
    { href: '/resources', label: 'Resources', icon: Trophy },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            StudyCircle
          </span>
        </Link>

        {/* Navigation Items */}
        {user && (
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Link to={item.href}>
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
        )}

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                      {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {profile?.points !== undefined && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-1 -right-1 h-6 min-w-6 text-xs px-1"
                    >
                      {profile.points}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.full_name || 'Student'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                    <div className="flex items-center space-x-2 pt-1">
                      <Badge variant="outline" className="text-xs">
                        {profile?.points || 0} points
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={signOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;