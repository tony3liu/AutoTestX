// 测试报告页面

export function Reports() {
  return (
    <div className="flex-1 space-y-6 p-8 bg-background">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">测试报告</h2>
      </div>

      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border/60 rounded-xl bg-secondary/5 h-[400px]">
        <h3 className="mt-4 text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
          暂无测试报告
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          执行自动化用例后，测试报告将在此处生成，为您提供 AI 代理动作的详细日志和快照。
        </p>
      </div>
    </div>
  );
}

export default Reports;
