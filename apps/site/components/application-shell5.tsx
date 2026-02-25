"use client";

import {
  Bug,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

// Base nav item - used by simple sidebars
type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  isActive?: boolean;
  // Optional children for submenus (Sidebar3+)
  children?: NavItem[];
};

// Nav group with optional collapsible state
type NavGroup = {
  title: string;
  items: NavItem[];
  // Optional: default collapsed state (Sidebar2+)
  defaultOpen?: boolean;
};

// User data for footer (Sidebar6+)
type UserData = {
  name: string;
  email: string;
  avatar: string;
};

// Complete sidebar data structure
type SidebarData = {
  // Logo/branding (all sidebars)
  logo: {
    src: string;
    alt: string;
    title: string;
    description: string;
  };
  // Main navigation groups (all sidebars)
  navGroups: NavGroup[];
  // Footer navigation group (all sidebars)
  footerGroup: NavGroup;
  // User data for user footer (Sidebar6+)
  user?: UserData;
  // Workspaces for switcher (Sidebar7+)
  workspaces?: Array<{
    id: string;
    name: string;
    logo: string;
    plan: string;
  }>;
  // Currently active workspace (Sidebar7+)
  activeWorkspace?: string;
};

const DEFAULT_LOGO = {
  src: "/logo.svg",
  alt: "PitchLab",
  title: "PitchLab",
  description: "Dashboard",
};

const DEFAULT_USER: UserData = {
  name: "User",
  email: "",
  avatar: "",
};

function buildSidebarData(user?: UserData | null, logo?: Partial<SidebarData["logo"]> | null): SidebarData {
  return {
    logo: { ...DEFAULT_LOGO, ...logo },
    navGroups: [
      {
        title: "Overview",
        defaultOpen: true,
        items: [
          { label: "Summary", icon: LayoutDashboard, href: "/dashboard", isActive: false },
          { label: "Tasks", icon: ClipboardList, href: "/dashboard/tasks", isActive: false },
        ],
      },
    ],
    footerGroup: {
      title: "Support",
      items: [
        { label: "Find a Bug?", icon: Bug, href: "https://airtable.com/appOUfpkStrYE4D9k/pagouI9I6OnrTOjpR/form", isActive: false },
        { label: "FAQs", icon: HelpCircle, href: "/dashboard/faqs", isActive: false },
      ],
    },
    user: user ?? DEFAULT_USER,
  };
}


const NavMenuItem = ({ item }: { item: NavItem }) => {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <Collapsible asChild defaultOpen className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton isActive={item.isActive}>
              <Icon className="size-4" />
              <span>{item.label}</span>
              <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children!.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <SidebarMenuSubItem key={child.label}>
                    <SidebarMenuSubButton asChild isActive={child.isActive}>
                      <Link href={child.href}>
                        <ChildIcon className="size-4" />
                        <span>{child.label}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={item.isActive}>
        <Link href={item.href}>
          <Icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const userMenuContent = (user: UserData, handleLogout: () => void) => (
  <>
    <DropdownMenuLabel className="p-0 font-normal">
      <div className="flex items-center gap-3 px-3 py-3">
        <Avatar className="size-10 rounded-full">
          <AvatarImage src={user.avatar || undefined} alt={user.name} />
          <AvatarFallback className="rounded-full bg-slate-300 text-sm font-medium">
            {user.name
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .join("") || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 flex-1 text-left">
          <span className="truncate font-semibold text-foreground">
            {user.name}
          </span>
          <span className="truncate text-sm text-muted-foreground">
            {user.email}
          </span>
        </div>
      </div>
    </DropdownMenuLabel>
    <DropdownMenuSeparator className="mx-0" />
    <DropdownMenuItem asChild>
      <Link
        href="/dashboard"
        className="flex cursor-pointer items-center gap-2 px-3 py-2"
      >
        <User className="size-4" />
        Account
      </Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator className="mx-0" />
    <DropdownMenuItem
      onClick={handleLogout}
      className="cursor-pointer gap-2 px-3 py-2"
    >
      <LogOut className="size-4" />
      Log out
    </DropdownMenuItem>
  </>
);

const NavUser = ({
  user,
  variant = "sidebar",
}: { user: UserData; variant?: "sidebar" | "header" }) => {
  const router = useRouter();

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      router.push("/login");
      router.refresh();
    });
  };

  const dropdownContent = (
    <DropdownMenuContent
      className="min-w-[--radix-dropdown-menu-trigger-width] rounded-xl bg-background p-0"
      side={variant === "header" ? "bottom" : "top"}
      align={variant === "header" ? "end" : "start"}
      sideOffset={8}
      alignOffset={0}
    >
      {userMenuContent(user, handleLogout)}
    </DropdownMenuContent>
  );

  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-background px-2 py-1.5 hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label="Open account menu"
          >
<Avatar className="size-8 rounded-full">
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback className="rounded-full bg-slate-300 text-xs font-medium">
              {user.name
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .join("") || "?"}
            </AvatarFallback>
          </Avatar>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        {dropdownContent}
      </DropdownMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="rounded-lg bg-background data-[state=open]:bg-muted/50 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!min-h-10"
              aria-label="Open account menu"
            >
              <Avatar className="size-8 rounded-full">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback className="rounded-full bg-slate-300 text-xs font-medium">
                  {user.name
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("") || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          {dropdownContent}
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

// Module tabs (top bar navigation)
interface ModuleTabsProps {
  className?: string;
  groups: NavGroup[];
  activeGroupIndex: number;
  onChange: (index: number) => void;
}

const ModuleTabs = ({
  className,
  groups,
  activeGroupIndex,
  onChange,
}: ModuleTabsProps) => {
  return (
    <nav
      aria-label="Primary modules"
      className={cn(
        "hidden flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap md:flex",
        className,
      )}
    >
      {groups.map((group, index) => {
        const isActive = index === activeGroupIndex;
        return (
          <button
            key={group.title}
            type="button"
            onClick={() => onChange(index)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <span>{group.title}</span>
          </button>
        );
      })}
    </nav>
  );
};

// Mobile bottom navigation
interface MobileBottomNavProps {
  className?: string;
  groups: NavGroup[];
  activeGroupIndex: number;
  onChange: (index: number) => void;
}

const MobileBottomNav = ({
  className,
  groups,
  activeGroupIndex,
  onChange,
}: MobileBottomNavProps) => {
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden",
        className,
      )}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))`,
        }}
      >
        {groups.map((group, index) => {
          // Use first item's icon as the group icon
          const Icon = group.items[0]?.icon;
          const isActive = index === activeGroupIndex;
          return (
            <button
              key={group.title}
              type="button"
              onClick={() => {
                onChange(index);
                setOpenMobile(false);
              }}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-xs transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={group.title}
            >
              {Icon && <Icon className="size-5" />}
              <span className="truncate">{group.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  sidebarData: SidebarData;
  activeGroupIndex: number;
}

const DEFAULT_NAV_GROUP: NavGroup = { title: "Overview", items: [] };

const AppSidebar = ({ sidebarData, activeGroupIndex, ...props }: AppSidebarProps) => {
  const activeGroup =
    sidebarData.navGroups[activeGroupIndex] ??
    sidebarData.navGroups[0] ??
    DEFAULT_NAV_GROUP;

  return (
    <Sidebar
      collapsible="icon"
      className="top-14 flex h-[calc(100svh-3.5rem)]! flex-col"
      {...props}
    >
      <SidebarHeader className="shrink-0">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <span className="px-2 text-sm font-medium group-data-[collapsible=icon]:hidden">
            {activeGroup.title}
          </span>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <div className="min-h-0 flex-1 overflow-hidden">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{activeGroup.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activeGroup.items.map((item) => (
                  <NavMenuItem key={item.label} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>{sidebarData.footerGroup.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarData.footerGroup.items.map((item) => {
                  const Icon = item.icon;
                  const isExternal = item.href.startsWith("http");
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton asChild isActive={item.isActive}>
                        <Link
                          href={item.href}
                          {...(isExternal && {
                            target: "_blank",
                            rel: "noopener noreferrer",
                          })}
                        >
                          <Icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>
      <SidebarFooter className="shrink-0 border-t border-sidebar-border bg-sidebar/95 py-2">
        <NavUser user={sidebarData.user ?? DEFAULT_USER} />
      </SidebarFooter>
    </Sidebar>
  );
};

export type ApplicationShell5User = UserData;
export type ApplicationShell5Logo = Partial<SidebarData["logo"]>;

interface ApplicationShell5Props {
  className?: string;
  children?: React.ReactNode;
  user?: UserData | null;
  logo?: Partial<SidebarData["logo"]> | null;
}

const ApplicationShell5 = ({ className, children, user, logo }: ApplicationShell5Props) => {
  const pathname = usePathname();
  const [activeGroupIndex, setActiveGroupIndex] = React.useState(0);

  const sidebarData = React.useMemo(() => {
    const data = buildSidebarData(user, logo);
    data.navGroups.forEach((group) => {
      group.items.forEach((item) => {
        item.isActive = pathname === item.href;
      });
    });
    data.footerGroup.items.forEach((item) => {
      item.isActive = pathname === item.href;
    });
    return data;
  }, [user, logo, pathname]);

  const activeGroup =
    sidebarData.navGroups[activeGroupIndex] ??
    sidebarData.navGroups[0] ??
    ({ title: "Overview", items: [] } as NavGroup);

  return (
    <SidebarProvider className={cn("flex flex-col", className)}>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center gap-4 px-4">
          <div className="flex items-center gap-3 md:hidden">
            <SidebarTrigger />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <img
              src={sidebarData.logo.src}
              alt={sidebarData.logo.alt}
              className="h-7 w-auto"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <NavUser user={sidebarData.user ?? DEFAULT_USER} variant="header" />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <AppSidebar sidebarData={sidebarData} activeGroupIndex={activeGroupIndex} />
        <SidebarInset className="pb-20 md:pb-0 bg-stone-100">
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="min-h-[100vh] flex-1 rounded-xl bg-stone-100 md:min-h-min">
              {children}
            </div>
          </div>
        </SidebarInset>
      </div>

      <MobileBottomNav
        groups={sidebarData.navGroups}
        activeGroupIndex={activeGroupIndex}
        onChange={setActiveGroupIndex}
      />
    </SidebarProvider>
  );
};

export { ApplicationShell5 };
