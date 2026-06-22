import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";

import Home from "@/pages/home";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Quiz from "@/pages/quiz";
import Dashboard from "@/pages/dashboard";
import Leaders from "@/pages/leaders";
import Matches from "@/pages/matches";
import Messages from "@/pages/messages";
import Community from "@/pages/community";
import FAQs from "@/pages/faqs";
import Friends from "@/pages/friends";
import Notifications from "@/pages/notifications";
import Admin from "@/pages/admin";
import SchoolAdmin from "@/pages/school-admin";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/register" component={Register} />

      {/* Protected routes */}
      <Route path="/quiz" component={Quiz} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/leaders" component={Leaders} />
      <Route path="/matches" component={Matches} />
      <Route path="/messages" component={Messages} />
      <Route path="/community" component={Community} />
      <Route path="/faqs" component={FAQs} />
      <Route path="/friends" component={Friends} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/admin" component={Admin} />
      <Route path="/school-admin" component={SchoolAdmin} />
      <Route path="/settings" component={Settings} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
