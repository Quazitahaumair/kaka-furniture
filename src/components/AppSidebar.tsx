import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ShoppingBag, Package, Users, BarChart3, BookOpen, Armchair, Receipt, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { apiService } from "@/lib/api";
import { toast } from "sonner";

const items = [
  { title: "Invoice Generator", url: "/invoices", icon: Receipt },
  { title: "Khaata Book", url: "/", icon: BookOpen },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { setOpenMobile, isMobile } = useSidebar();
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    const toastId = toast.loading("Logging out...");
    try {
      await apiService.logout();
      toast.success("Logged out successfully", { id: toastId });
      if (isMobile) {
        setOpenMobile(false);
      }
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err.message || "Failed to log out", { id: toastId });
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Armchair className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-base font-bold leading-none tracking-tight text-sidebar-foreground">
              KSC SOFA ND
            </span>
            <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
              CHAIR HOUSE
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link to={item.url} className="flex items-center gap-3" onClick={handleLinkClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="flex w-full items-center gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 dark:hover:text-red-400 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
