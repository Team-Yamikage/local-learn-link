import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, MessageSquare, HelpCircle, Upload, Bell } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  bio?: string;
  grade_level?: string;
  school_name?: string;
  avatar_url?: string;
  points: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement_type: string;
  requirement_value: number;
}

interface UserBadge {
  id: string;
  badge: Badge;
  earned_at: string;
}

interface UserStats {
  questions_asked: number;
  answers_given: number;
  answers_accepted: number;
  resources_shared: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    questions_asked: 0,
    answers_given: 0,
    answers_accepted: 0,
    resources_shared: 0
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserBadges();
      fetchAllBadges();
      fetchUserStats();
      fetchNotifications();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badges(*)
        `)
        .eq('user_id', user?.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setUserBadges((data || []).map(userBadge => ({
        ...userBadge,
        badge: userBadge.badges
      })));
    } catch (error) {
      console.error('Error fetching user badges:', error);
    }
  };

  const fetchAllBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('requirement_value');

      if (error) throw error;
      setAllBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Get questions asked
      const { count: questionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Get answers given
      const { count: answersCount } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Get answers accepted
      const { count: acceptedCount } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('is_accepted', true);

      // Get resources shared
      const { count: resourcesCount } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      setUserStats({
        questions_asked: questionsCount || 0,
        answers_given: answersCount || 0,
        answers_accepted: acceptedCount || 0,
        resources_shared: resourcesCount || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const updateProfile = async (updatedProfile: Partial<Profile>) => {
    if (!profile || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile({ ...profile, ...updatedProfile });
      setEditMode(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getProgressToNextBadge = (badge: Badge) => {
    const currentValue = userStats[badge.requirement_type as keyof UserStats] || profile?.points || 0;
    return Math.min((currentValue / badge.requirement_value) * 100, 100);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Profile not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-lg">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <CardTitle>{profile.full_name}</CardTitle>
              <div className="flex items-center justify-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{profile.points} points</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editMode ? (
                <div className="space-y-4">
                  <Input
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Full Name"
                  />
                  <Textarea
                    value={profile.bio || ''}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="Bio"
                    rows={3}
                  />
                  <Input
                    value={profile.grade_level || ''}
                    onChange={(e) => setProfile({ ...profile, grade_level: e.target.value })}
                    placeholder="Grade Level"
                  />
                  <Input
                    value={profile.school_name || ''}
                    onChange={(e) => setProfile({ ...profile, school_name: e.target.value })}
                    placeholder="School Name"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateProfile({
                        full_name: profile.full_name,
                        bio: profile.bio,
                        grade_level: profile.grade_level,
                        school_name: profile.school_name
                      })}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.bio && (
                    <div>
                      <h4 className="font-medium mb-1">Bio</h4>
                      <p className="text-sm text-muted-foreground">{profile.bio}</p>
                    </div>
                  )}
                  {profile.grade_level && (
                    <div>
                      <h4 className="font-medium mb-1">Grade Level</h4>
                      <p className="text-sm text-muted-foreground">{profile.grade_level}</p>
                    </div>
                  )}
                  {profile.school_name && (
                    <div>
                      <h4 className="font-medium mb-1">School</h4>
                      <p className="text-sm text-muted-foreground">{profile.school_name}</p>
                    </div>
                  )}
                  <Button onClick={() => setEditMode(true)} className="w-full">
                    Edit Profile
                  </Button>
                </div>
              )}

              {/* Stats */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Activity Stats</h4>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <HelpCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{userStats.questions_asked}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Questions</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{userStats.answers_given}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Answers</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <Trophy className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{userStats.answers_accepted}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Accepted</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <Upload className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{userStats.resources_shared}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Resources</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="badges" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="badges">Badges & Achievements</TabsTrigger>
              <TabsTrigger value="notifications">
                Notifications 
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                    {notifications.filter(n => !n.is_read).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="badges" className="space-y-6">
              {/* Earned Badges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Earned Badges ({userBadges.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userBadges.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No badges earned yet. Keep participating to earn your first badge!
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {userBadges.map((userBadge) => (
                        <div
                          key={userBadge.id}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                        >
                          <div
                            className="text-2xl p-2 rounded-full"
                            style={{ backgroundColor: `${userBadge.badge.color}20` }}
                          >
                            {userBadge.badge.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{userBadge.badge.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {userBadge.badge.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Earned {formatDate(userBadge.earned_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Progress to Next Badges */}
              <Card>
                <CardHeader>
                  <CardTitle>Badge Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allBadges
                      .filter(badge => !userBadges.some(ub => ub.badge.id === badge.id))
                      .slice(0, 5)
                      .map((badge) => {
                        const progress = getProgressToNextBadge(badge);
                        const currentValue = badge.requirement_type === 'points' 
                          ? profile.points 
                          : userStats[badge.requirement_type as keyof UserStats] || 0;
                        
                        return (
                          <div key={badge.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{badge.icon}</span>
                                <div>
                                  <h4 className="font-medium text-sm">{badge.name}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {badge.description}
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {currentValue}/{badge.requirement_value}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Recent Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No notifications yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            notification.is_read 
                              ? 'bg-background' 
                              : 'bg-primary/5 border-primary/20'
                          }`}
                          onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDate(notification.created_at)}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="h-2 w-2 bg-primary rounded-full ml-2 mt-1" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;