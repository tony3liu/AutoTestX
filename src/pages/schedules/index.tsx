import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus, Clock, Pencil, Trash2, Calendar, Activity, List, Layout, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { useScheduleStore } from '@/stores/schedule-store';
import { useTestStore } from '@/stores/test-store';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { convertNaturalLanguageToCron } from '@/lib/cron-utils';

export function Schedules() {
  const { schedules, fetchSchedules, createSchedule, updateSchedule, deleteSchedule, toggleSchedule, isLoading, isSaving } = useScheduleStore();
  const { testCases, testSuites, fetchTestCases, fetchTestSuites } = useTestStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    testCaseId: '',
    testSuiteId: '',
    cronExpr: '0 0 * * *', // Default daily at midnight
    type: 'case' as 'case' | 'suite'
  });

  const [showAiInput, setShowAiInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isConvertingLocal, setIsConvertingLocal] = useState(false);

  useEffect(() => {
    fetchSchedules();
    fetchTestCases();
    fetchTestSuites();
  }, [fetchSchedules, fetchTestCases, fetchTestSuites]);

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    const type = s.testSuiteId ? 'suite' : 'case';
    setFormData({
      name: s.name,
      testCaseId: s.testCaseId || '',
      testSuiteId: s.testSuiteId || '',
      cronExpr: s.cronExpr,
      type
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        cronExpr: formData.cronExpr,
        testCaseId: formData.type === 'case' ? formData.testCaseId : undefined,
        testSuiteId: formData.type === 'suite' ? formData.testSuiteId : undefined,
      };

      if (editingId) {
        await updateSchedule(editingId, payload);
        toast.success('已更新定期计划');
      } else {
        await createSchedule(payload);
        toast.success('已创建定期计划');
      }
      setIsOpen(false);
      resetForm();
      setShowAiInput(false); // Reset AI input state
      setAiPrompt(''); // Clear AI prompt
    } catch (err) {
      toast.error('保存失败，请检查数据');
    }
  };

  const handleAiConvert = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsConvertingLocal(true);
    try {
      const cronExpr = await convertNaturalLanguageToCron(aiPrompt);
      setFormData(prev => ({ ...prev, cronExpr }));
      toast.success('成功从自然语言生成 Cron 表达式', {
        description: `"${aiPrompt}" -> ${cronExpr}`
      });
      setShowAiInput(false);
      setAiPrompt('');
    } catch (err) {
      toast.error('AI 转换失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsConvertingLocal(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', testCaseId: '', testSuiteId: '', cronExpr: '0 0 * * *', type: 'case' });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      toast.success('计划已删除');
      setItemToDelete(null);
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const formatDate = (ts?: number) => {
    if (!ts) return '从未运行';
    return format(ts, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
  };

  return (
    <div className="flex-1 space-y-6 p-8 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">定期执行</h2>
          <p className="text-muted-foreground mt-1">
            设置定时任务，自动化执行您的测试用例或套件。
          </p>
        </div>
        
        <Sheet open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <SheetTrigger asChild>
            <Button className="font-semibold shadow-sm" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> 新建计划
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[450px] flex flex-col border-border/40">
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="text-2xl font-bold">
                {editingId ? '编辑定期计划' : '新建定期计划'}
              </SheetTitle>
              <SheetDescription>
                配置 Cron 表达式来定时触发指定的测试任务。
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex-1 py-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">计划名称</Label>
                <Input 
                  placeholder="例如：每日冒烟测试" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">任务类型</Label>
                <Tabs value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="case" className="text-xs">单个用例</TabsTrigger>
                    <TabsTrigger value="suite" className="text-xs">测试套件</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  {formData.type === 'case' ? '选择测试用例' : '选择测试套件'}
                </Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.type === 'case' ? formData.testCaseId : formData.testSuiteId}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    [formData.type === 'case' ? 'testCaseId' : 'testSuiteId']: e.target.value 
                  })}
                >
                  <option value="">请选择...</option>
                  {formData.type === 'case' ? (
                    testCases.map(tc => <option key={tc.id} value={tc.id}>{tc.name}</option>)
                  ) : (
                    testSuites.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Cron 表达式</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80 decoration-primary/30"
                        onClick={() => setShowAiInput(!showAiInput)}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI 智能生成
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>输入自然语言自动生成 Cron</TooltipContent>
                  </Tooltip>
                </div>
                
                {showAiInput && (
                  <div className="mb-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="relative group">
                      <Input 
                        placeholder="例如：每天凌晨 3 点，或者：每 30 分钟" 
                        className="pr-10 border-primary/30 bg-primary/5 focus-visible:ring-primary/40 focus-visible:border-primary/50"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiConvert()}
                        disabled={isConvertingLocal}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-primary hover:bg-primary/10 disabled:opacity-50"
                        onClick={handleAiConvert}
                        disabled={!aiPrompt.trim() || isConvertingLocal}
                      >
                        {isConvertingLocal ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground pl-1">
                      💡 提示：输入具体的时间描述，回车即可转换
                    </p>
                  </div>
                )}

                <Input 
                  placeholder="* * * * *" 
                  value={formData.cronExpr}
                  onChange={(e) => setFormData({ ...formData, cronExpr: e.target.value })}
                />
                
                <div className="mt-2 p-3 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">常用参考：</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="text-[11px] text-left hover:text-primary transition-colors" onClick={() => setFormData({...formData, cronExpr: '0 * * * *'})}>每小时 (0 * * * *)</button>
                    <button className="text-[11px] text-left hover:text-primary transition-colors" onClick={() => setFormData({...formData, cronExpr: '0 0 * * *'})}>每天零点 (0 0 * * *)</button>
                    <button className="text-[11px] text-left hover:text-primary transition-colors" onClick={() => setFormData({...formData, cronExpr: '0 9 * * 1-5'})}>工作日 9:00</button>
                    <button className="text-[11px] text-left hover:text-primary transition-colors" onClick={() => setFormData({...formData, cronExpr: '*/30 * * * *'})}>每 30 分钟</button>
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="mt-auto pt-6 border-t border-border/40 pb-2">
              <div className="flex w-full justify-end gap-3">
                <Button variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!formData.name || (formData.type === 'case' ? !formData.testCaseId : !formData.testSuiteId) || isSaving}
                >
                  {isSaving ? '保存中...' : (editingId ? '保存修改' : '创建计划')}
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 h-64 border-2 border-dashed border-border/60 rounded-xl text-muted-foreground">
          正在加载计划数据...
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border/60 rounded-xl bg-secondary/5 h-[300px]">
          <Clock className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">暂无定期计划</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            您可以创建定时任务来在每天、每小时或自定义时间自动运行测试。
          </p>
          <Button className="mt-6" variant="outline" onClick={() => setIsOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> 马上创建
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 max-w-5xl">
          {schedules.map((s) => {
            const targetName = s.testSuiteId 
              ? (testSuites.find(ts => ts.id === s.testSuiteId)?.name || '未知套件')
              : (testCases.find(tc => tc.id === s.testCaseId)?.name || '未知用例');
            const isSuite = !!s.testSuiteId;

            return (
              <Card key={s.id} className={cn("shadow-sm border-border/50 transition-all", !s.enabled && "opacity-60")}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg truncate">{s.name}</h3>
                        {!s.enabled && <Badge variant="secondary" className="h-5">已禁用</Badge>}
                        {isSuite && <Badge variant="outline" className="h-5 bg-primary/5 text-primary border-primary/20">套件</Badge>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span className="truncate">{s.cronExpr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 shrink-0" />
                          <span className="truncate">上次运行: {formatDate(s.lastRunAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2">
                          {isSuite ? <List className="h-4 w-4 shrink-0" /> : <Layout className="h-4 w-4 shrink-0" />}
                          <span className="truncate">对应目标: {targetName}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <Switch 
                        checked={s.enabled} 
                        onCheckedChange={(checked) => toggleSchedule(s.id, checked)} 
                      />
                      <div className="w-px h-6 bg-border/40 mx-1" />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        onClick={() => setItemToDelete(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!itemToDelete}
        title="确认删除"
        message="您确定要删除此定期计划吗？"
        confirmLabel="确认删除"
        cancelLabel="取消"
        variant="destructive"
        onConfirm={() => { if (itemToDelete) handleDelete(itemToDelete); }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}

export default Schedules;
