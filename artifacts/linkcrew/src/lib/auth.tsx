import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import type { User, School } from "@workspace/api-client-react/src/generated/api.schemas";

interface AuthContextType {
  user: User | null;
  school: School | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string, school?: School | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("linkcrew_token"));
  
  const { data: me, isLoading: isLoadingMe } = useGetMe({ 
    query: { 
      enabled: !!token,
      retry: false
    } 
  });

  const logoutMutation = useLogout();

  useEffect(() => {
    if (me) {
      setUser(me);
    } else if (!isLoadingMe && token) {
      // Token invalid
      setToken(null);
      localStorage.removeItem("linkcrew_token");
      localStorage.removeItem("linkcrew_school");
    }
  }, [me, isLoadingMe, token]);

  useEffect(() => {
    const savedSchool = localStorage.getItem("linkcrew_school");
    if (savedSchool) {
      try {
        setSchool(JSON.parse(savedSchool));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const setAuth = (newUser: User, newToken: string, newSchool?: School | null) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem("linkcrew_token", newToken);
    
    if (newSchool !== undefined) {
      setSchool(newSchool);
      if (newSchool) {
        localStorage.setItem("linkcrew_school", JSON.stringify(newSchool));
      } else {
        localStorage.removeItem("linkcrew_school");
      }
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("linkcrew_token");
      }
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      school, 
      token, 
      isLoading: isLoadingMe, 
      setAuth, 
      logout: handleLogout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}