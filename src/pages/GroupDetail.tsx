import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Users, Send, ArrowLeft, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  privacy: string;
  max_members: number;
  creator_id: string;
  subject: { name: string; code: string };
  creator_profile: { full_name: string; avatar_url?: string };
}

interface GroupMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: { full_name: string; avatar_url?: string };
}

interface Message {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  user_id: string;
  profile: { full_name: string; avatar_url?: string };
}

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (id) {
      fetchGroupDetails();
      fetchMembers();
      fetchMessages();
      subscribeToMessages();
    }
  }, [id]);

  const fetchGroupDetails = async () => {
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('study_groups')
        .select(`
          id,
          name,
          description,
          privacy,
          max_members,
          creator_id,
          subject_id,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .single();

      if (groupError) throw groupError;

      if (groupData) {
        // Fetch subject and creator profile separately
        const [subjectRes, profileRes] = await Promise.all([
          supabase
            .from('subjects')
            .select('name, code')
            .eq('id', groupData.subject_id)
            .single(),
          supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', groupData.creator_id)
            .single()
        ]);

        setGroup({
          ...groupData,
          subject: subjectRes.data || { name: 'Unknown Subject', code: 'N/A' },
          creator_profile: profileRes.data || { full_name: 'Unknown User', avatar_url: null }
        });
      }
    } catch (error) {
      console.error('Error fetching group:', error);
      toast({
        title: "Error",
        description: "Failed to load group details",
        variant: "destructive",
      });
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          group_id
        `)
        .eq('group_id', id)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      if (data) {
        // Fetch profiles separately to avoid relation issues
        const userIds = data.map(member => member.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }

        const membersWithProfiles = data.map(member => ({
          ...member,
          profile: profiles?.find(p => p.user_id === member.user_id) || { 
            full_name: 'Unknown User', 
            avatar_url: null 
          }
        }));

        setMembers(membersWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          message_type,
          created_at,
          user_id,
          group_id,
          file_url,
          file_name
        `)
        .eq('group_id', id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data) {
        // Fetch profiles separately to avoid relation issues
        const userIds = [...new Set(data.map(message => message.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }

        const messagesWithProfiles = data.map(message => ({
          ...message,
          profile: profiles?.find(p => p.user_id === message.user_id) || {
            full_name: 'Unknown User',
            avatar_url: null
          }
        }));

        setMessages(messagesWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('group-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${id}`
        },
        async (payload) => {
          // Fetch the profile for the new message
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', payload.new.user_id)
            .single();

          if (profileError) {
            console.error('Error fetching profile for new message:', profileError);
            return;
          }

          setMessages(prev => [...prev, {
            ...payload.new as any,
            profile: profile || { full_name: 'Unknown User', avatar_url: null }
          } as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          group_id: id,
          user_id: user.id,
          content: newMessage.trim(),
          message_type: 'text'
        }]);

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Group not found</h2>
          <Link to="/groups">
            <Button>Back to Groups</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/groups">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Group Info & Members Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Group Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{group.name}</span>
                {group.creator_id === user?.id && (
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">{group.description}</p>
              
              <div className="flex items-center gap-2">
                <Badge variant={group.privacy === 'public' ? 'default' : 'secondary'}>
                  {group.privacy}
                </Badge>
                <Badge variant="outline">
                  {group.subject.name}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{members.length} / {group.max_members} members</span>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Created by:</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={group.creator_profile.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(group.creator_profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{group.creator_profile.full_name}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.profile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Group Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarImage src={message.profile.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(message.profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {message.profile.full_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground break-words">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <Separator />

              {/* Message Input */}
              <div className="p-4">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim() || sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;