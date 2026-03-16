import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus, PlayCircle, Brain, Pencil, Trash2 } from 'lucide-react';
import { useTestStore } from '@/stores/test-store';
import { useProviderStore } from '@/stores/providers';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Select } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function TestCases() {
  const { testCases, fetchTestCases, createTestCase, updateTestCase, deleteTestCase, runTest, isLoading, isSaving, runningTestCaseId } = useTestStore();
  const { accounts, fetchProviders } = useProviderStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({ 
    name: '', 
    steps: '', 
    assertions: '',
    accountId: '',
    modelId: ''
  });

  useEffect(() => {
    fetchTestCases();
    fetchProviders();
  }, [fetchTestCases, fetchProviders]);

  const handleEdit = (tc: any) => {
    setEditingId(tc.id);
    setFormData({
      name: tc.name,
      steps: tc.steps.join('\n'),
      assertions: tc.assertions.map((a: any) => a.expected).join('\n'),
      accountId: tc.accountId || '',
      modelId: tc.modelId || ''
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    try {
      const stepsList = formData.steps.split('\n').filter(s => s.trim());
      const assertionsList = formData.assertions.split('\n').filter(a => a.trim());
      
      const payload = {
        name: formData.name,
        steps: stepsList,
        assertions: assertionsList.map(a => ({ type: 'text', expected: a })),
        variables: {},
        accountId: formData.accountId || undefined,
        modelId: formData.modelId || undefined
      };

      if (editingId) {
        await updateTestCase({ ...payload, id: editingId } as any);
        toast.success('测试用例更新成功');
      } else {
        await createTestCase({
          id: crypto.randomUUID(),
          ...payload
        } as any);
        toast.success('测试用例创建成功');
      }
      
      setIsOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
      toast.error('保存失败');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', steps: '', assertions: '', accountId: '', modelId: '' });
  };

  const handleRunTest = async (testCaseId: string, testName: string) => {
    try {
      toast.info(`正在执行用例 [${testName}]... 请不要切走焦点或关闭应用`);
      const result = await runTest(testCaseId);
      if (result.status === 'pass') {
        toast.success(`用例 [${testName}] 执行通过！`);
      } else {
        toast.error(`用例 [${testName}] 执行失败: ${result.error || '详见测试报告'}`);
      }
    } catch (e: any) {
      toast.error(`执行出错: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTestCase(id);
      toast.success('用例已删除');
      setCaseToDelete(null);
    } catch (e) {
      toast.error('删除失败');
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 bg-background">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">用例管理</h2>
        
        <Sheet open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <SheetTrigger asChild>
            <Button className="font-semibold shadow-sm" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> 新建用例
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-none flex flex-col border-border/40">
            <SheetHeader className="text-left space-y-1 mt-2">
              <SheetTitle className="text-2xl font-bold">
                {editingId ? '编辑自动测试用例' : '新建自动测试用例'}
              </SheetTitle>
              <SheetDescription className="text-base text-muted-foreground">
                使用自然语言编写 AI 能够理解的浏览器操作步骤和断言规则。
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto py-6 space-y-6 px-1">
              <div className="space-y-2">
                <Label htmlFor="case-name" className="text-base font-semibold">用例名称</Label>
                <Input 
                  id="case-name" 
                  placeholder="例如：登录并在后台首页验证标题" 
                  className="bg-secondary/30"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="case-steps" className="text-base font-semibold">操作步骤 (按行分割)</Label>
                <Textarea 
                  id="case-steps" 
                  className="min-h-[150px] bg-secondary/30 resize-none font-mono text-sm leading-relaxed" 
                  placeholder="1. 打开 https://example.com&#10;2. 点击右上角的 登录 按钮&#10;3. 在邮箱输入框输入 test@example.com" 
                  value={formData.steps}
                  onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-2">支持多步骤，通过回车换行来区分下一步。</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="case-assertions" className="text-base font-semibold">预期断言 (按行分割)</Label>
                <Textarea 
                  id="case-assertions" 
                  className="min-h-[100px] bg-secondary/30 resize-none font-mono text-sm leading-relaxed" 
                  placeholder="1. 页面中应该包含文本 欢迎回来&#10;2. 应该能看到头像元素" 
                  value={formData.assertions}
                  onChange={(e) => setFormData({ ...formData, assertions: e.target.value })}
                />
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="text-base font-semibold">AI 模型配置 (可选)</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">指定 AI 提供商账户</Label>
                  <Select 
                    value={formData.accountId} 
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  >
                    <option value="">(系统默认配置)</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.label} ({acc.vendorId})
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">指定模型 (Model ID)</Label>
                  <Input 
                    placeholder="例如: gpt-4o, claude-3-5-sonnet-latest" 
                    className="bg-secondary/30"
                    value={formData.modelId}
                    onChange={(e) => setFormData({ ...formData, modelId: e.target.value })}
                  />
                  <p className="text-[12px] text-muted-foreground">留空则使用所选账户的默认模型。</p>
                </div>
              </div>
            </div>

            <SheetFooter className="mt-auto pt-6 border-t border-border/40 pb-2">
              <div className="flex w-full justify-end gap-3">
                <Button variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
                <Button onClick={handleSave} disabled={!formData.name || isSaving}>
                  {isSaving ? '保存中...' : (editingId ? '保存修改' : '创建用例')}
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
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
          <Button className="mt-6 font-semibold" variant="default" size="lg" onClick={() => setIsOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> 马上体验
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 max-w-5xl">
          {testCases.map((tc) => (
            <Card key={tc.id} className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{tc.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>包含 {tc.steps.length} 个步骤, {tc.assertions.length} 个断言</span>
                      {tc.modelId && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> {tc.modelId}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(tc)}
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => setCaseToDelete(tc.id)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-border/60 mx-1" />
                    <Button 
                      variant={runningTestCaseId === tc.id ? "default" : "outline"}
                      size="sm" 
                      className="font-medium min-w-[100px]"
                      disabled={runningTestCaseId !== null}
                      onClick={() => handleRunTest(tc.id, tc.name)}
                    >
                      {runningTestCaseId === tc.id ? (
                         <span className="flex items-center gap-2 animate-pulse"><PlayCircle className="h-4 w-4" /> 运行中...</span>
                      ) : (
                         <span>运行用例</span>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!caseToDelete}
        title="确认删除"
        message="您确定要删除此测试用例吗？此操作不可撤销。"
        confirmLabel="确认删除"
        cancelLabel="取消"
        variant="destructive"
        onConfirm={() => { if (caseToDelete) handleDelete(caseToDelete); }}
        onCancel={() => setCaseToDelete(null)}
      />
    </div>
  );
}

export default TestCases;
