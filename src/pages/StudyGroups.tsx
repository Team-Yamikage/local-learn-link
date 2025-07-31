import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, Lock, Globe } from "lucide-react";
import { Link } from "react-router-dom";

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  subject_id: string;
  max_members: number;
  privacy: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
  subjects: {
    name: string;
    code: string;
  } | null;
  group_members: { count: number }[];
}

export default function StudyGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('study_groups')
        .select(`
          *,
          profiles:creator_id (full_name),
          subjects:subject_id (name, code),
          group_members (count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data as any || []);
    } catch (error) {
      console.error('Error fetching study groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .insert([{
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        }]);

      if (error) throw error;
      fetchGroups();
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.subjects?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-foreground">Study Groups</h1>
          <p className="text-muted-foreground">Join collaborative learning communities</p>
        </div>
        <Link to="/create-group">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </Link>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search study groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map((group) => (
          <Card key={group.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{group.name}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {group.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  {group.privacy === 'private' ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {group.group_members?.[0]?.count || 0}/{group.max_members}
                </div>
                {group.subjects && (
                  <Badge variant="outline">
                    {group.subjects.code}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  by {group.profiles?.full_name}
                </span>
                <div className="flex gap-2">
                  <Link to={`/groups/${group.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    onClick={() => joinGroup(group.id)}
                    disabled={!user}
                  >
                    Join
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No study groups found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? "Try adjusting your search terms." 
                : "Be the first to create a study group!"}
            </p>
            <Link to="/create-group">
              <Button>Create Study Group</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}