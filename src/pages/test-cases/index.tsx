import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTestStore } from '@/stores/test-store';
import { useEffect } from 'react';

export function TestCases() {
  const { testCases, fetchTestCases, isLoading } = useTestStore();

  useEffect(() => {
    fetchTestCases();
  }, [fetchTestCases]);

  return (
    <div className="flex-1 space-y-6 p-8 bg-background">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">用例管理</h2>
        <div className="flex items-center space-x-2">
          <Button className="font-semibold shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> 新建用例
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground h-64 border-2 border-dashed border-border/60 rounded-xl">
          正在加载用例数据...
        </div>
      ) : testCases.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border/60 rounded-xl bg-secondary/5 h-[400px]">
          <h3 className="mt-4 text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            还没创建任何用例
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            开始编写您的第一个 AI 自动化测试用例，只需采用自然语言描述即可。
          </p>
          <Button className="mt-6 font-semibold" variant="default" size="lg">
            <Plus className="mr-2 h-4 w-4" /> 马上体验
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 max-w-5xl">
          {testCases.map((tc) => (
            <Card key={tc.id} className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{tc.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">包含 {tc.steps.length} 个步骤, {tc.assertions.length} 个断言</p>
                  </div>
                  <Button variant="outline" size="sm" className="font-medium">
                    运行用例
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default TestCases;
