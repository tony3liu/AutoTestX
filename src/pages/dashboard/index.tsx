import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react';
import { useTestStore } from '@/stores/test-store';
import { motion } from 'framer-motion';

export function Dashboard() {
  const { dashboardStats, fetchDashboardStats } = useTestStore();

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  const stats = dashboardStats || {
    caseCount: 0,
    passRate: 0,
    failCount24h: 0,
    avgDuration: 0,
    recentActivity: []
  };

  const maxVal = Math.max(...stats.recentActivity.map(a => a.total), 1);

  return (
    <div className="flex-1 space-y-6 p-8 bg-background overflow-y-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">AutoTest X Dashboard</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20 px-3 py-1 rounded-full border border-border/50">
          <Activity className="w-3 h-3 text-primary animate-pulse" />
          实时同步中
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-secondary/10 border-border/50 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">应用总用例数</CardTitle>
            <Activity className="h-4 w-4 text-primary opacity-60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.caseCount}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              当前活跃用例
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 border-border/50 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最新通过率</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500 opacity-60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.passRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              基于过去 7 天统计
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-red-500/5 border-border/50 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失败 (24h)</CardTitle>
            <XCircle className="h-4 w-4 text-red-500 opacity-60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.failCount24h}</div>
            <p className="text-xs text-muted-foreground mt-1 text-red-500/80 font-medium">
              需要关注的项目
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-orange-500/5 border-border/50 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均运行耗时</CardTitle>
            <Clock className="h-4 w-4 text-orange-500 opacity-60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.avgDuration.toFixed(1)}s</div>
            <p className="text-xs text-muted-foreground mt-1">
              AI Agent 正常执行时长
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-border/50 bg-card/30 backdrop-blur shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">最近 7 天活跃度 (Active Execution History)</CardTitle>
            <div className="flex items-center gap-4 text-xs font-normal text-muted-foreground">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">🟢 PASS</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">🔴 FAIL</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-10 pb-6">
          {stats.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-secondary/5 rounded-xl border border-dashed border-border/50">
              <p className="text-sm text-muted-foreground italic">暂无历史记录可供分析 (No execution history)</p>
            </div>
          ) : (
            <div className="flex items-end justify-between h-[180px] gap-2 md:gap-4 overflow-x-auto pb-4 px-2">
              {stats.recentActivity.map((day) => {
                const passHeight = day.total > 0 ? (day.pass / day.total) * 100 : 0;
                const failHeight = day.total > 0 ? ((day.total - day.pass) / day.total) * 100 : 0;
                const totalHeight = (day.total / maxVal) * 100;
                
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full max-w-[40px] h-full flex flex-col justify-end gap-1">
                      {/* Tooltip */}
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border/80 text-[10px] px-2 py-1.5 rounded-md shadow-xl z-10 whitespace-nowrap">
                        <div className="font-bold border-b border-border/40 mb-1 pb-1">{day.date}</div>
                        <div className="text-green-500">Pass: {day.pass}</div>
                        <div className="text-red-500">Fail: {day.total - day.pass}</div>
                        <div className="text-muted-foreground">Total: {day.total}</div>
                      </div>

                      {/* Bar segments */}
                      <div 
                        className="w-full flex flex-col justify-end overflow-hidden rounded-md border border-border/30 bg-secondary transition-all group-hover:ring-1 group-hover:ring-primary/20"
                        style={{ height: `${totalHeight}%`, minHeight: day.total > 0 ? '4px' : '2px' }}
                      >
                         {day.total > 0 ? (
                           <>
                             <motion.div 
                               initial={{ height: 0 }}
                               animate={{ height: `${failHeight}%` }}
                               className="w-full bg-red-500/70"
                             />
                             <motion.div 
                               initial={{ height: 0 }}
                               animate={{ height: `${passHeight}%` }}
                               className="w-full bg-primary/70"
                             />
                           </>
                         ) : (
                           <div className="h-full w-full bg-secondary/50" />
                         )}
                      </div>
                    </div>
                    <span className="text-[10px] mt-3 font-medium opacity-50 text-center whitespace-nowrap">
                      {day.date.split('-').slice(1).join('/')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
