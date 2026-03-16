import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, Clock, XCircle } from 'lucide-react';

export function Dashboard() {
  return (
    <div className="flex-1 space-y-6 p-8 bg-background">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">测试大盘</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-secondary/10 border-border/50 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">应用总用例数</CardTitle>
            <Activity className="h-4 w-4 text-primary opacity-60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              较昨日 +0
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 border-border/50 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最新通过率</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500 opacity-60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">100%</div>
            <p className="text-xs text-muted-foreground mt-1">
              基于过去 7 天数据
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-red-500/5 border-border/50 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失败用例</CardTitle>
            <XCircle className="h-4 w-4 text-red-500 opacity-60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              当前无阻断问题
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-orange-500/5 border-border/50 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均运行时长</CardTitle>
            <Clock className="h-4 w-4 text-orange-500 opacity-60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">0s</div>
            <p className="text-xs text-muted-foreground mt-1">
              AI Agent 执行平均时间
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8 flex items-center justify-center border-2 border-dashed border-border/60 rounded-xl h-64 text-muted-foreground bg-secondary/5">
        暂无运行记录
      </div>
    </div>
  );
}

export default Dashboard;
