import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarProvider
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, MessageCircle, HelpCircle, Bell, Settings, ShieldAlert, LogOut, UserPlus, School } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, school, logout } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const role = user.role;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar>
          <SidebarHeader className="border-b p-4">
            <h2 className="text-lg font-bold text-primary truncate">{school?.name || "Link Crew"}</h2>
            <p className="text-xs text-muted-foreground truncate">{user.firstName} {user.lastName}</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                      <Link href="/dashboard">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {role === "freshman" && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={location === "/matches"}>
                          <Link href="/matches">
                            <Users className="w-4 h-4 mr-2" />
                            <span>My Leaders</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/leaders")}>
                      <Link href="/leaders">
                        <Users className="w-4 h-4 mr-2" />
                        <span>Leaders</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/messages")}>
                      <Link href="/messages">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        <span>Messages</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/community")}>
                      <Link href="/community">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        <span>Community</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/faqs"}>
                      <Link href="/faqs">
                        <HelpCircle className="w-4 h-4 mr-2" />
                        <span>FAQs</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {role === "freshman" && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/friends"}>
                        <Link href="/friends">
                          <UserPlus className="w-4 h-4 mr-2" />
                          <span>Friends</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/notifications"}>
                      <Link href="/notifications">
                        <Bell className="w-4 h-4 mr-2" />
                        <span>Notifications</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {(role === "school_admin" || role === "admin") && (
              <SidebarGroup>
                <SidebarGroupLabel>School Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/school-admin"}>
                        <Link href="/school-admin">
                          <School className="w-4 h-4 mr-2" />
                          <span>School Panel</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {role === "admin" && (
              <SidebarGroup>
                <SidebarGroupLabel>Global Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/admin"}>
                        <Link href="/admin">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          <span>Overview</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/admin/users"}>
                        <Link href="/admin/users">
                          <Users className="w-4 h-4 mr-2" />
                          <span>Users</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/admin/reports"}>
                        <Link href="/admin/reports">
                          <ShieldAlert className="w-4 h-4 mr-2" />
                          <span>Reports</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/settings"}>
                      <Link href="/settings">
                        <Settings className="w-4 h-4 mr-2" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      <span>Log Out</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}