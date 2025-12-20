import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Users, Calendar, Flag, BarChart3, ChevronLeft, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

const sidebarItems = [
  { label: 'Users', icon: Users, path: '/manage/users' },
  { label: 'Events', icon: Calendar, path: '/manage/events' },
  { label: 'Reports', icon: Flag, path: '/manage/reports' },
  { label: 'Analytics', icon: BarChart3, path: '/manage/analytics' },
];

function SidebarContent({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-1 p-2">
      {sidebarItems.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.path === '/manage/users' && location.pathname === '/manage');
        
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
              isActive 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' 
                : 'text-muted-foreground',
              collapsed && 'justify-center px-2'
            )}
          >
            <item.icon className={cn('h-5 w-5 shrink-0', collapsed && 'h-5 w-5')} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className={cn(
            'relative flex flex-col border-r bg-card transition-all duration-300',
            collapsed ? 'w-16' : 'w-64'
          )}
        >
          {/* Header */}
          <div className={cn(
            'flex h-14 items-center border-b px-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}>
            {!collapsed && (
              <h2 className="text-lg font-semibold tracking-tight">Admin Panel</h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8"
            >
              <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            </Button>
          </div>

          {/* Navigation */}
          <SidebarContent collapsed={collapsed} />
        </aside>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-20 z-40 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
            <div className="flex h-14 items-center border-b px-4">
              <h2 className="text-lg font-semibold tracking-tight">Admin Panel</h2>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
