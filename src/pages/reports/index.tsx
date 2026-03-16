import { useEffect } from 'react';
import { useTestStore } from '@/stores/test-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Terminal, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { TestResult } from '@/types/test';

function StatusBadge({ status }: { status: string }) {
  if (status === 'pass') return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-none"><CheckCircle2 className="w-3 h-3 mr-1" /> 通过</Badge>;
  if (status === 'fail') return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> 失败</Badge>;
  return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> 错误</Badge>;
}

export function Reports() {
  const { testReports, fetchTestReports, isLoading } = useTestStore();

  useEffect(() => {
    fetchTestReports();
  }, [fetchTestReports]);

  return (
    <div className="flex-1 space-y-6 p-8 bg-background">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">测试报告</h2>
        <p className="text-muted-foreground">共 {testReports.length} 份报告</p>
      </div>

      {isLoading && testReports.length === 0 ? (
        <div className="flex justify-center p-12"><span className="animate-pulse">加载中...</span></div>
      ) : testReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border/60 rounded-xl bg-secondary/5 h-[400px]">
          <h3 className="mt-4 text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            暂无测试报告
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            执行自动化用例后，测试报告将在此处生成。
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {testReports.map((report: TestResult) => (
            <Card key={report.reportId} className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
              <CardHeader className="bg-secondary/10 pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{report.test_case_name || report.caseId}</CardTitle>
                    <CardDescription suppressHydrationWarning>
                      执行时间: {report.createdAt ? new Date(report.createdAt).toLocaleString() : '未知'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      {(report.duration || 0).toFixed(1)}s
                    </div>
                    <StatusBadge status={report.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {(report.error || report.status !== 'pass') && (
                  <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
                    <strong className="font-semibold block mb-1">执行错误：</strong>
                    {report.error || "未知失败"}
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="flex items-center text-sm font-semibold text-foreground">
                    <Terminal className="w-4 h-4 mr-2 text-muted-foreground" />
                    执行日志 ({report.logs.length})
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-[300px] overflow-y-auto">
                    {report.logs.map((log, idx) => (
                      <div key={idx} className="mb-1 text-muted-foreground">
                        <span className="opacity-50 select-none w-6 inline-block">{idx + 1}</span> {log}
                      </div>
                    ))}
                    {report.logs.length === 0 && (
                      <div className="text-muted-foreground/50 italic">无日志数据</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Reports;
