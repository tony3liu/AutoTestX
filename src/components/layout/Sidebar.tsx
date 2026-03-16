/**
 * Sidebar Component
 * Minimalist, stylish, and grand design.
 */
import { NavLink } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
  ListTodo,
  FileText,
  Brain,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import logoPng from '@/assets/logo.png';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  collapsed?: boolean;
  onClick?: () => void;
}

function NavItem({ to, icon, label, badge, collapsed, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all duration-300',
          'hover:bg-black/5 dark:hover:bg-white/5 text-foreground/70 outline-none',
          isActive
            ? 'bg-primary/10 dark:bg-primary/20 text-primary shadow-sm ring-1 ring-primary/20'
            : '',
          collapsed && 'justify-center px-0'
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className={cn("flex shrink-0 items-center justify-center transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
            {icon}
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
              {badge && (
                <Badge variant="secondary" className="ml-auto shrink-0 font-medium">
                  {badge}
                </Badge>
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" strokeWidth={2} />, label: '测试大盘' },
    { to: '/test-cases', icon: <ListTodo className="h-5 w-5" strokeWidth={2} />, label: '用例管理' },
    { to: '/schedules', icon: <Clock className="h-5 w-5" strokeWidth={2} />, label: '定期执行' },
    { to: '/reports', icon: <FileText className="h-5 w-5" strokeWidth={2} />, label: '测试报告' },
    { to: '/models', icon: <Brain className="h-5 w-5" strokeWidth={2} />, label: '模型设置' },
  ];

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col border-r border-border/40 bg-background/50 backdrop-blur-[20px] transition-all duration-300',
        sidebarCollapsed ? 'w-20' : 'w-[260px]'
      )}
    >
      {/* Top Header Toggle */}
      <div className={cn("flex items-center p-4 h-[72px]", sidebarCollapsed ? "justify-center" : "justify-between")}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3 px-2 overflow-hidden select-none">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-sm">
              <img src={logoPng} alt="AutoTestX" className="h-5 w-auto shrink-0" />
            </div>
            <span className="text-lg font-bold tracking-tight truncate whitespace-nowrap text-foreground">
              AutoTestX
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px]" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col px-3 mt-4 gap-2 flex-1">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 mt-auto">
        <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all duration-300',
                'hover:bg-black/5 dark:hover:bg-white/5 text-foreground/70',
                isActive && 'bg-primary/10 dark:bg-primary/20 text-primary ring-1 ring-primary/20 shadow-sm',
                sidebarCollapsed ? 'justify-center px-0' : ''
              )
            }
          >
          {({ isActive }) => (
            <>
              <div className={cn("flex shrink-0 items-center justify-center transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                <SettingsIcon className="h-5 w-5" strokeWidth={2} />
              </div>
              {!sidebarCollapsed && <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">系统设置</span>}
            </>
          )}
        </NavLink>
      </div>
    </aside>
  );
}