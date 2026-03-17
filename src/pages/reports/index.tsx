import { useEffect, useState } from 'react';
import { useTestStore } from '@/stores/test-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Terminal, Clock, CheckCircle2, XCircle, AlertCircle, List, ChevronRight, ChevronDown, Activity } from 'lucide-react';
import type { TestTask, TestResult } from '@/types/test';
import { cn } from '@/lib/utils';

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-none border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> 已完成</Badge>;
    case 'failed': return <Badge variant="destructive" className="shadow-none"><XCircle className="w-3 h-3 mr-1" /> 已失败</Badge>;
    case 'running': return <Badge className="bg-blue-500/10 text-blue-500 animate-pulse border-blue-500/20 shadow-none"><Activity className="w-3 h-3 mr-1" /> 执行中</Badge>;
    default: return <Badge variant="secondary" className="shadow-none"><AlertCircle className="w-3 h-3 mr-1" /> 错误</Badge>;
  }
}

function ReportItem({ report }: { report: TestResult }) {
  const [expanded, setExpanded] = useState(false);
  const [translatedReason, setTranslatedReason] = useState<string | null>(null);

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden mb-3 bg-secondary/5 transition-all">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/10"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="font-medium text-sm">{report.test_case_name || report.caseId}</span>
          <Badge variant={report.status === 'pass' ? 'outline' : 'destructive'} className={cn("text-[10px] px-1.5 py-0", report.status === 'pass' && "text-green-500 border-green-500/30")}>
            {report.status.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {(report.duration || 0).toFixed(1)}s</span>
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-border/40 bg-background/50 space-y-4">
          {report.error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20 text-xs">
              <strong>错误：</strong> {report.error}
            </div>
          )}

          {report.failureReason && (
            <div className="space-y-2">
              <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[12px] font-semibold text-amber-500 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" /> 判定理由 (Judge Reasoning)
                  </h4>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const btn = e.currentTarget;
                      btn.disabled = true;
                      const originalText = btn.innerHTML;
                      btn.innerHTML = '翻译中...';
                      try {
                        const translated = await useTestStore.getState().translateReason(report.failureReason!);
                        setTranslatedReason(translated);
                      } finally {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                      }
                    }}
                    className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 px-2 py-0.5 rounded transition-colors"
                  >
                    翻译成中文
                  </button>
                </div>
                <p className="text-[12px] leading-relaxed text-muted-foreground italic mb-3">
                  {report.failureReason}
                </p>
                {translatedReason && (
                  <div className="mt-3 pt-3 border-t border-amber-500/10 text-[12px] text-foreground leading-relaxed animate-in fade-in slide-in-from-top-1">
                    <div className="font-semibold mb-1">🔍 中文解释：</div>
                    {translatedReason}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="flex items-center text-[12px] font-semibold opacity-70">
              <Terminal className="w-3 h-3 mr-2" /> 执行日志 ({report.logs.length})
            </h4>
            <div className="bg-muted/40 rounded-md p-3 font-mono text-[11px] overflow-y-auto max-h-[200px] leading-relaxed">
              {report.logs.map((log, idx) => (
                <div key={idx} className="mb-1 text-muted-foreground/80">
                  <span className="opacity-30 select-none w-5 inline-block">{idx + 1}</span> {log}
                </div>
              ))}
              {report.logs.length === 0 && <span className="opacity-30 italic">无日志</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Reports() {
  const { testTasks, fetchTestTasks, fetchTaskDetails, isLoading } = useTestStore();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [taskDetails, setTaskDetails] = useState<Record<string, TestTask>>({});

  useEffect(() => {
    fetchTestTasks();
    const timer = setInterval(fetchTestTasks, 5000); // Polling for running tasks
    return () => clearInterval(timer);
  }, [fetchTestTasks]);

  const toggleTask = async (taskId: string) => {
    if (expandedTaskId === taskId) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(taskId);
      if (!taskDetails[taskId]) {
        try {
          const details = await fetchTaskDetails(taskId);
          setTaskDetails(prev => ({ ...prev, [taskId]: details }));
        } catch (e) {
          console.error('Failed to load task details', e);
        }
      }
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 bg-background">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">执行计划及任务</h2>
          <p className="text-muted-foreground text-sm">管理测试任务的执行记录和批量统计。</p>
        </div>
        <div className="bg-secondary/20 px-4 py-2 rounded-lg border border-border/50">
          <span className="text-sm font-medium">总任务数: </span>
          <span className="text-xl font-bold">{testTasks.length}</span>
        </div>
      </div>

      {isLoading && testTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 h-[300px]">
          <Activity className="w-8 h-8 text-primary animate-spin mb-4" />
          <span className="text-muted-foreground">加载执行历史中...</span>
        </div>
      ) : testTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border/60 rounded-xl bg-secondary/5 h-[400px]">
          <h3 className="text-lg font-semibold text-foreground/80">
            暂无任务执行记录
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            当您手动运行测试套件、单用例，或定时任务触发时，相关记录会在此处显示。
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {testTasks.map((task: TestTask) => {
            const details = taskDetails[task.id];
            const isExpanded = expandedTaskId === task.id;
            const progress = task.totalCount > 0
              ? ((task.passCount + task.failCount + task.errorCount) / task.totalCount) * 100
              : 0;

            return (
              <Card key={task.id} className={cn(
                "overflow-hidden border-border/50 shadow-sm transition-all bg-card/50",
                isExpanded && "ring-1 ring-primary/20 shadow-md"
              )}>
                <CardHeader className="p-0">
                  <div
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-secondary/10 active:bg-secondary/20 transition-colors"
                    onClick={() => toggleTask(task.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-full",
                        task.status === 'completed' ? "bg-green-500/10 text-green-500" :
                          task.status === 'failed' ? "bg-red-500/10 text-red-500" :
                            "bg-blue-500/10 text-blue-500"
                      )}>
                        {task.suiteId ? <List className="w-5 h-5" /> : <Terminal className="w-5 h-5" />}
                      </div>
                      <div className="space-y-0.5">
                        <CardTitle className="text-lg">{task.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {new Date(task.createdAt).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="hidden md:flex flex-col items-end gap-1 min-w-[120px]">
                        <div className="flex gap-3 text-xs font-medium">
                          <span className="text-green-500">P: {task.passCount}</span>
                          <span className="text-red-500">F: {task.failCount}</span>
                          {task.errorCount > 0 && <span className="text-orange-500">E: {task.errorCount}</span>}
                        </div>
                        <Progress value={progress} className="h-1.5 w-full bg-secondary" />
                      </div>
                      <StatusBadge status={task.status} />
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-6 px-6">
                    <div className="border-t border-border/40 pt-6 space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <List className="w-4 h-4 text-muted-foreground" />
                          执行明细 ({task.totalCount})
                        </h4>
                      </div>

                      {!details ? (
                        <div className="flex justify-center py-8"><Activity className="animate-spin w-6 h-6 text-primary" /></div>
                      ) : details.reports && details.reports.length > 0 ? (
                        <div className="space-y-1">
                          {details.reports.map(report => (
                            <ReportItem key={report.reportId} report={report} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground text-sm">
                          暂无详细报告数据
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Reports;
