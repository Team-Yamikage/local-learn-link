-- Create messages table for group chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Group members can view messages" 
ON public.messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM group_members gm 
  WHERE gm.group_id = messages.group_id 
  AND gm.user_id = auth.uid()
));

CREATE POLICY "Group members can create messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = messages.group_id 
    AND gm.user_id = auth.uid()
  )
);

-- Add realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add realtime for group_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER TABLE public.group_members REPLICA IDENTITY FULL;

-- Create trigger for updated_at
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notifications table for activity feed
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('question_answered', 'answer_accepted', 'group_invitation', 'resource_shared', 'points_earned')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add badges table for gamification
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('points', 'questions_asked', 'answers_given', 'answers_accepted', 'resources_shared')),
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for badges
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Create policy for badges
CREATE POLICY "Badges are viewable by everyone" 
ON public.badges 
FOR SELECT 
USING (true);

-- Create user_badges junction table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS for user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Create policies for user_badges
CREATE POLICY "Users can view all user badges" 
ON public.user_badges 
FOR SELECT 
USING (true);

CREATE POLICY "System can award badges" 
ON public.user_badges 
FOR INSERT 
WITH CHECK (true);

-- Insert some default badges
INSERT INTO public.badges (name, description, icon, color, requirement_type, requirement_value) VALUES
('First Question', 'Asked your first question', '❓', '#3B82F6', 'questions_asked', 1),
('Helpful Helper', 'Gave your first answer', '💡', '#10B981', 'answers_given', 1),
('Problem Solver', 'Had an answer accepted', '✅', '#F59E0B', 'answers_accepted', 1),
('Knowledge Sharer', 'Shared your first resource', '📚', '#8B5CF6', 'resources_shared', 1),
('Rising Star', 'Earned 100 points', '⭐', '#EF4444', 'points', 100),
('Study Master', 'Earned 500 points', '🏆', '#F97316', 'points', 500),
('Question Guru', 'Asked 10 questions', '🤔', '#06B6D4', 'questions_asked', 10),
('Answer Machine', 'Gave 25 answers', '🚀', '#84CC16', 'answers_given', 25),
('Expert', 'Had 10 answers accepted', '👑', '#D946EF', 'answers_accepted', 10),
('Resource Hero', 'Shared 5 resources', '📖', '#14B8A6', 'resources_shared', 5);