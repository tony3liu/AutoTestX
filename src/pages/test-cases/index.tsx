import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Plus, PlayCircle, Brain, Pencil, Trash2, List, CaseSensitive, Layout, CheckCircle2 } from 'lucide-react';
import { useTestStore } from '@/stores/test-store';
import { useProviderStore } from '@/stores/providers';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export function TestCases() {
  const { 
    testCases, fetchTestCases, createTestCase, updateTestCase, deleteTestCase, runTest,
    testSuites, fetchTestSuites, createTestSuite, updateTestSuite, deleteTestSuite, runSuite,
    isLoading, isSaving, runningTestCaseId, runningSuiteId
  } = useTestStore();
  
  const { accounts, fetchProviders } = useProviderStore();
  
  // Tabs state
  const [activeTab, setActiveTab] = useState('cases');

  // Case Modal state
  const [isCaseOpen, setIsCaseOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [caseFormData, setCaseFormData] = useState({ 
    name: '', steps: '', assertions: '', accountId: '', modelId: ''
  });

  // Suite Modal state
  const [isSuiteOpen, setIsSuiteOpen] = useState(false);
  const [editingSuiteId, setEditingSuiteId] = useState<string | null>(null);
  const [suiteToDelete, setSuiteToDelete] = useState<string | null>(null);
  const [suiteFormData, setSuiteFormData] = useState({
    name: '', description: '', testCaseIds: [] as string[]
  });

  useEffect(() => {
    fetchTestCases();
    fetchTestSuites();
    fetchProviders();
  }, [fetchTestCases, fetchTestSuites, fetchProviders]);

  // Case Actions
  const handleEditCase = (tc: any) => {
    setEditingCaseId(tc.id);
    setCaseFormData({
      name: tc.name,
      steps: tc.steps.join('\n'),
      assertions: tc.assertions.map((a: any) => a.expected).join('\n'),
      accountId: tc.accountId || '',
      modelId: tc.modelId || ''
    });
    setIsCaseOpen(true);
  };

  const handleSaveCase = async () => {
    try {
      const stepsList = caseFormData.steps.split('\n').filter(s => s.trim());
      const assertionsList = caseFormData.assertions.split('\n').filter(a => a.trim());
      
      const payload = {
        name: caseFormData.name,
        steps: stepsList,
        assertions: assertionsList.map(a => ({ type: 'text', expected: a })),
        variables: {},
        accountId: caseFormData.accountId || undefined,
        modelId: caseFormData.modelId || undefined
      };

      if (editingCaseId) {
        await updateTestCase({ ...payload, id: editingCaseId } as any);
        toast.success('测试用例更新成功');
      } else {
        await createTestCase({
          id: crypto.randomUUID(),
          ...payload
        } as any);
        toast.success('测试用例创建成功');
      }
      
      setIsCaseOpen(false);
      resetCaseForm();
    } catch (e) {
      toast.error('保存失败');
    }
  };

  const resetCaseForm = () => {
    setEditingCaseId(null);
    setCaseFormData({ name: '', steps: '', assertions: '', accountId: '', modelId: '' });
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

  // Suite Actions
  const handleEditSuite = (ts: any) => {
    setEditingSuiteId(ts.id);
    setSuiteFormData({
      name: ts.name,
      description: ts.description || '',
      testCaseIds: ts.testCaseIds || []
    });
    setIsSuiteOpen(true);
  };

  const handleSaveSuite = async () => {
    try {
      if (editingSuiteId) {
        await updateTestSuite({ ...suiteFormData, id: editingSuiteId } as any);
        toast.success('测试套件更新成功');
      } else {
        await createTestSuite({ ...suiteFormData, id: crypto.randomUUID() } as any);
        toast.success('测试套件创建成功');
      }
      setIsSuiteOpen(false);
      resetSuiteForm();
    } catch (e) {
      toast.error('保存套件失败');
    }
  };

  const resetSuiteForm = () => {
    setEditingSuiteId(null);
    setSuiteFormData({ name: '', description: '', testCaseIds: [] });
  };

  const toggleCaseInSuite = (caseId: string) => {
    setSuiteFormData(prev => ({
      ...prev,
      testCaseIds: prev.testCaseIds.includes(caseId)
        ? prev.testCaseIds.filter(id => id !== caseId)
        : [...prev.testCaseIds, caseId]
    }));
  };

  const handleRunSuite = async (suiteId: string, suiteName: string) => {
    try {
      toast.info(`正在开始执行套件 [${suiteName}]... 任务已创建，后台执行中`);
      await runSuite(suiteId);
      toast.success(`套件 [${suiteName}] 任务已启动，请转至测试报告查看进度`);
    } catch (e: any) {
      toast.error(`启动执行出错: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 bg-background">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">测试编排</h2>
          <p className="text-muted-foreground text-sm">通过自然语言组织用例和套件，实现高度自动化的回归测试。</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/20 p-1 border border-border/50">
          <TabsTrigger value="cases" className="gap-2 px-6">
            <CaseSensitive className="w-4 h-4" /> 用例库
          </TabsTrigger>
          <TabsTrigger value="suites" className="gap-2 px-6">
            <List className="w-4 h-4" /> 测试套件
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-6 border-none p-0 outline-none">
          <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-xl border border-border/40">
            <div className="text-sm text-muted-foreground">
              库中共收录 <span className="text-foreground font-semibold">{testCases.length}</span> 条用例
            </div>
            <Button className="font-semibold shadow-md" onClick={() => { resetCaseForm(); setIsCaseOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> 新建用例
            </Button>
          </div>

          <div className="grid gap-4 max-w-5xl">
            {isLoading && testCases.length === 0 ? (
               <div className="h-40 flex items-center justify-center text-muted-foreground italic">加载中...</div>
            ) : testCases.length === 0 ? (
               <div className="h-60 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-secondary/5 text-center px-4">
                  <p className="text-muted-foreground">您的库中还没有用例，点击“新建用例”开始编排。</p>
               </div>
            ) : testCases.map((tc) => (
              <Card key={tc.id} className="shadow-sm border-border/50 hover:shadow-md transition-all group">
                <CardContent className="p-5">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                      <div className="bg-primary/10 p-2.5 rounded-lg text-primary">
                        <Layout className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg truncate flex items-center gap-2">
                           {tc.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] py-0 px-1 border-border/40 bg-secondary/20">CASE</Badge>
                          <span>{tc.steps.length} 步骤</span>
                          <span>{tc.assertions.length} 断言</span>
                          {tc.modelId && (
                            <span className="flex items-center gap-1 opacity-70"><Brain className="h-3 w-3" /> {tc.modelId}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditCase(tc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setCaseToDelete(tc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-6 bg-border/40 mx-2" />
                      <Button 
                        variant={runningTestCaseId === tc.id ? "default" : "outline"}
                        size="sm" 
                        className="font-medium h-9 px-4 rounded-full border-primary/20 hover:border-primary/40"
                        disabled={runningTestCaseId !== null || runningSuiteId !== null}
                        onClick={() => handleRunTest(tc.id, tc.name)}
                      >
                        {runningTestCaseId === tc.id ? (
                           <span className="flex items-center gap-2 animate-pulse"><Plus className="h-3 w-3 animate-spin" /> 执行中</span>
                        ) : (
                           <span className="flex items-center gap-2 text-primary font-bold"><PlayCircle className="h-4 w-4" /> 运行用例</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="suites" className="space-y-6 border-none p-0 outline-none">
          <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-xl border border-border/40">
            <div className="text-sm text-muted-foreground">
              当前共有 <span className="text-foreground font-semibold">{testSuites.length}</span> 个测试套件
            </div>
            <Button className="font-semibold shadow-md" onClick={() => { resetSuiteForm(); setIsSuiteOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> 新建套件
            </Button>
          </div>

          <div className="grid gap-4 max-w-5xl">
            {testSuites.length === 0 ? (
               <div className="h-60 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-secondary/5 text-center px-4">
                  <p className="text-muted-foreground">测试套件可以将多个用例关联为一个任务整体，方便定期或批量运行。</p>
               </div>
            ) : testSuites.map((ts) => (
              <Card key={ts.id} className="shadow-sm border-border/50 hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex-1 min-w-0 flex items-center gap-4">
                      <div className="bg-orange-500/10 p-2.5 rounded-lg text-orange-500">
                        <List className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-lg truncate">{ts.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] py-0 px-1 border-orange-500/30 bg-orange-500/5 text-orange-500">SUITE</Badge>
                          <span>包含 {ts.testCaseIds.length} 个用例</span>
                          {ts.description && <span className="truncate max-w-[200px]">• {ts.description}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditSuite(ts)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setSuiteToDelete(ts.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-6 bg-border/40 mx-2" />
                      <Button 
                        variant={runningSuiteId === ts.id ? "default" : "outline"}
                        size="sm" 
                        className="font-medium h-9 px-4 rounded-full border-orange-500/20 hover:border-orange-500/40"
                        disabled={runningTestCaseId !== null || runningSuiteId !== null || ts.testCaseIds.length === 0}
                        onClick={() => handleRunSuite(ts.id, ts.name)}
                      >
                        {runningSuiteId === ts.id ? (
                           <span className="flex items-center gap-2 animate-pulse">启动中...</span>
                        ) : (
                           <span className="flex items-center gap-2 text-orange-500 font-bold"><PlayCircle className="h-4 w-4" /> 运行套件</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Case Sheet */}
      <Sheet open={isCaseOpen} onOpenChange={setIsCaseOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-none flex flex-col border-border/40">
          <SheetHeader className="text-left space-y-1 mt-2">
            <SheetTitle className="text-2xl font-bold">{editingCaseId ? '编辑测试用例' : '新建测试用例'}</SheetTitle>
            <SheetDescription>自然语言描述 AI 浏览器操作流程</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-6 space-y-6 px-1">
             <div className="space-y-2">
                <Label className="text-sm font-semibold">名称</Label>
                <Input value={caseFormData.name} onChange={(e) => setCaseFormData({...caseFormData, name: e.target.value})} />
             </div>
             <div className="space-y-2">
                <Label className="text-sm font-semibold">操作步骤 (按行分割)</Label>
                <Textarea className="min-h-[150px] font-mono text-xs" value={caseFormData.steps} onChange={(e) => setCaseFormData({...caseFormData, steps: e.target.value})} />
             </div>
             <div className="space-y-2">
                <Label className="text-sm font-semibold">预期断言 (按行分割)</Label>
                <Textarea className="min-h-[100px] font-mono text-xs" value={caseFormData.assertions} onChange={(e) => setCaseFormData({...caseFormData, assertions: e.target.value})} />
             </div>
             <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> 执行配置 (可选)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] opacity-70">提供商</Label>
                    <select 
                      className="w-full h-8 bg-secondary/30 rounded border-none text-xs px-2"
                      value={caseFormData.accountId}
                      onChange={(e) => setCaseFormData({...caseFormData, accountId: e.target.value})}
                    >
                      <option value="">默认配置</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] opacity-70">Model ID</Label>
                    <Input 
                      className="h-8 text-xs bg-secondary/30 border-none px-2"
                      value={caseFormData.modelId}
                      onChange={(e) => setCaseFormData({...caseFormData, modelId: e.target.value})}
                      placeholder="如 semantic-m2.5"
                    />
                  </div>
                </div>
             </div>
          </div>
          <SheetFooter className="mt-auto pt-6 border-t">
            <Button onClick={handleSaveCase} disabled={isSaving || !caseFormData.name}>保存</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Suite Sheet */}
      <Sheet open={isSuiteOpen} onOpenChange={setIsSuiteOpen}>
        <SheetContent className="w-[400px] sm:w-[500px] flex flex-col border-border/40">
          <SheetHeader className="mt-2 text-left">
            <SheetTitle className="text-2xl font-bold">{editingSuiteId ? '编辑测试套件' : '新建测试套件'}</SheetTitle>
            <SheetDescription>将库中的用例编排为自动化任务集</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">名称</Label>
              <Input value={suiteFormData.name} onChange={(e) => setSuiteFormData({...suiteFormData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">描述</Label>
              <Input value={suiteFormData.description} onChange={(e) => setSuiteFormData({...suiteFormData, description: e.target.value})} />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center justify-between">
                <span>包含用例 ({suiteFormData.testCaseIds.length})</span>
                <span className="text-[11px] text-muted-foreground font-normal">勾选用例加入套件</span>
              </Label>
              <div className="border rounded-xl divide-y max-h-[300px] overflow-y-auto bg-secondary/10">
                 {testCases.map(tc => (
                   <div 
                    key={tc.id} 
                    className="flex items-center gap-3 p-3 hover:bg-secondary/20 cursor-pointer"
                    onClick={() => toggleCaseInSuite(tc.id)}
                   >
                     <Checkbox checked={suiteFormData.testCaseIds.includes(tc.id)} />
                     <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{tc.name}</div>
                        <div className="text-[10px] text-muted-foreground">{tc.steps.length} 步骤</div>
                     </div>
                     {suiteFormData.testCaseIds.includes(tc.id) && <CheckCircle2 className="w-4 h-4 text-primary" />}
                   </div>
                 ))}
                 {testCases.length === 0 && <div className="p-10 text-center text-xs text-muted-foreground italic">暂无可关联的用例</div>}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-auto pt-6 border-t">
            <Button onClick={handleSaveSuite} disabled={isSaving || !suiteFormData.name || suiteFormData.testCaseIds.length === 0}>
               确定保存
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!caseToDelete}
        title="确认删除用例"
        message="该操作不可恢复，如果您有关联此用例的套件或计划，建议优先确认影响。"
        onConfirm={() => { if (caseToDelete) handleDeleteCase(caseToDelete); }}
        onCancel={() => setCaseToDelete(null)}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!suiteToDelete}
        title="确认删除套件"
        message="套件仅包含对用例的引用，删除套件不会影响底层的原始用例。"
        onConfirm={() => { if (suiteToDelete) handleDeleteSuite(suiteToDelete); }}
        onCancel={() => setSuiteToDelete(null)}
        variant="destructive"
      />
    </div>
  );

  async function handleDeleteCase(id: string) {
    try {
      await deleteTestCase(id);
      toast.success('用例已删除');
      setCaseToDelete(null);
    } catch { toast.error('删除失败'); }
  }

  async function handleDeleteSuite(id: string) {
    try {
      await deleteTestSuite(id);
      toast.success('套件已删除');
      setSuiteToDelete(null);
    } catch { toast.error('删除失败'); }
  }
}

export default TestCases;
