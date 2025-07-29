-- Create enum for difficulty levels
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- Create enum for user roles in groups
CREATE TYPE group_role AS ENUM ('admin', 'moderator', 'member');

-- Create enum for privacy levels
CREATE TYPE privacy_level AS ENUM ('public', 'private', 'invite_only');

-- Create subjects table
CREATE TABLE public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    grade_levels TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user profiles table
CREATE TABLE public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    school_name TEXT,
    grade_level TEXT,
    bio TEXT,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Create questions table
CREATE TABLE public.questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    difficulty difficulty_level DEFAULT 'medium',
    grade_level TEXT,
    view_count INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create answers table
CREATE TABLE public.answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create study groups table
CREATE TABLE public.study_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    max_members INTEGER DEFAULT 50,
    privacy privacy_level DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group members table
CREATE TABLE public.group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role group_role DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- Create resources table
CREATE TABLE public.resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_type TEXT,
    file_size BIGINT,
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for questions
CREATE POLICY "Questions are viewable by everyone" 
ON public.questions FOR SELECT 
USING (true);

CREATE POLICY "Users can create questions" 
ON public.questions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions" 
ON public.questions FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for answers
CREATE POLICY "Answers are viewable by everyone" 
ON public.answers FOR SELECT 
USING (true);

CREATE POLICY "Users can create answers" 
ON public.answers FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers" 
ON public.answers FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for study groups
CREATE POLICY "Public groups are viewable by everyone" 
ON public.study_groups FOR SELECT 
USING (privacy = 'public' OR creator_id = auth.uid());

CREATE POLICY "Users can create study groups" 
ON public.study_groups FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their groups" 
ON public.study_groups FOR UPDATE 
USING (auth.uid() = creator_id);

-- Create RLS policies for group members
CREATE POLICY "Group members are viewable by group members" 
ON public.group_members FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.group_members gm 
        WHERE gm.group_id = group_members.group_id 
        AND gm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can join groups" 
ON public.group_members FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for resources
CREATE POLICY "Resources are viewable by everyone" 
ON public.resources FOR SELECT 
USING (true);

CREATE POLICY "Users can upload resources" 
ON public.resources FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resources" 
ON public.resources FOR UPDATE 
USING (auth.uid() = user_id);

-- Insert sample subjects
INSERT INTO public.subjects (name, code, description, grade_levels) VALUES
('Mathematics', 'MATH', 'All mathematical concepts and problem solving', ARRAY['6', '7', '8', '9', '10', '11', '12']),
('Science', 'SCI', 'Physics, Chemistry, and Biology', ARRAY['6', '7', '8', '9', '10', '11', '12']),
('English', 'ENG', 'Language arts, literature, and writing', ARRAY['6', '7', '8', '9', '10', '11', '12']),
('Social Studies', 'SS', 'History, geography, and civics', ARRAY['6', '7', '8', '9', '10', '11', '12']),
('Computer Science', 'CS', 'Programming and technology', ARRAY['9', '10', '11', '12']);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Student')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_answers_updated_at
    BEFORE UPDATE ON public.answers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_groups_updated_at
    BEFORE UPDATE ON public.study_groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();