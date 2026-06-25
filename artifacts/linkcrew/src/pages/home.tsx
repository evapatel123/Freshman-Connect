import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListSchools } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { GraduationCap, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Home() {
  const { data: schools, isLoading } = useListSchools();
  const [, setLocation] = useLocation();
  const { school: currentSchool } = useAuth();
  const [search, setSearch] = useState("");

  const handleSelectSchool = (school: any) => {
    setLocation(`/auth/login/${school.id}`);
  };

  const filteredSchools = schools?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="py-6 px-8 flex justify-between items-center border-b bg-card">
        <div className="flex items-center gap-2 text-primary font-bold text-xl">
          <GraduationCap className="h-6 w-6" />
          <span>Link Crew Connect</span>
        </div>
        {currentSchool && (
          <Button variant="outline" asChild>
            <Link href="/auth/login">Back to {currentSchool.name}</Link>
          </Button>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-12">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
            Find Your People.<br />
            <span className="text-primary">Navigate High School.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with upperclassmen, discover your interests, and start high school with confidence.
          </p>
        </div>

        <div className="max-w-md mx-auto mb-10 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input 
            className="pl-10 h-12 text-lg rounded-full bg-card shadow-sm"
            placeholder="Search for your school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse h-48 bg-muted border-none" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools?.map(school => (
              <Card 
                key={school.id} 
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden"
                onClick={() => handleSelectSchool(school)}
              >
                <div className="h-2 w-full bg-primary" />
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors flex items-start justify-between">
                    <span className="truncate pr-2">{school.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <MapPin className="h-4 w-4 mr-1" />
                    {school.city}, {school.state}
                  </div>
                  <div className="flex justify-between items-center mt-6">
                    <div className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                      {school.memberCount} members
                    </div>
                    <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                      Select
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredSchools?.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No schools found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}