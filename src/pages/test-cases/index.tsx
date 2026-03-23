import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Plus, PlayCircle, Brain, Pencil, Trash2, List, Layout, CheckCircle2,
  Filter, Clock, MoreVertical, Sparkles, TrendingUp,
  ArrowUpDown, Search
} from 'lucide-react';
import { useTestStore } from '@/stores/test-store';
import { useProviderStore } from '@/stores/providers';
import { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

// --- Unified item type for combined list ---
type UnifiedItem = 
  | { kind: 'case'; id: string; name: string; steps: string[]; assertions: any[]; modelId?: string; accountId?: string; createdAt?: number; lastRunAgo?: string; status?: string }
  | { kind: 'suite'; id: string; name: string; description?: string; testCaseIds: string[]; createdAt?: number; lastRunAgo?: string; status?: string };

// Relative time helper
function timeAgo(ts?: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TestCases() {
  const { t } = useTranslation('testCases');

  const { 
    testCases, fetchTestCases, createTestCase, updateTestCase, deleteTestCase, runTest,
    testSuites, fetchTestSuites, createTestSuite, updateTestSuite, deleteTestSuite, runSuite,
    dashboardStats, fetchDashboardStats,
    isLoading, isSaving, runningTestCaseId, runningSuiteId
  } = useTestStore();
  
  const { accounts, fetchProviders } = useProviderStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'case' | 'suite'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

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

  // New Case type selection
  const [showNewMenu, setShowNewMenu] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTestCases();
    fetchTestSuites();
    fetchProviders();
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, [fetchTestCases, fetchTestSuites, fetchProviders, fetchDashboardStats]);

  // Click outside to close menus
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenuId(null);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Build unified list
  const unifiedList: UnifiedItem[] = useMemo(() => {
    const cases: UnifiedItem[] = testCases.map(tc => ({
      kind: 'case' as const,
      ...tc,
      lastRunAgo: timeAgo(tc.createdAt),
      status: tc.createdAt ? 'READY' : 'DRAFT'
    }));
    const suites: UnifiedItem[] = testSuites.map(ts => ({
      kind: 'suite' as const,
      ...ts,
      lastRunAgo: timeAgo(ts.createdAt),
      status: ts.testCaseIds.length > 0 ? 'READY' : 'DRAFT'
    }));

    let items = [...cases, ...suites];

    // Filter by type
    if (filterType !== 'all') items = items.filter(i => i.kind === filterType);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }

    // Sort
    if (sortBy === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    return items;
  }, [testCases, testSuites, filterType, searchQuery, sortBy]);

  // Stats
  const stats = dashboardStats || {
    caseCount: testCases.length,
    passRate: 0,
    failCount24h: 0,
    avgDuration: 0,
    recentActivity: []
  };

  // Precision tips (i18n)
  const tips = [t('tip1'), t('tip2'), t('tip3')];
  const tipIndex = Math.floor(Date.now() / 86400000) % tips.length;

  // --- Case Actions ---
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
    setContextMenuId(null);
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
        toast.success(t('caseUpdated'));
      } else {
        await createTestCase({
          id: crypto.randomUUID(),
          ...payload
        } as any);
        toast.success(t('caseCreated'));
      }
      
      setIsCaseOpen(false);
      resetCaseForm();
    } catch {
      toast.error(t('saveFailed'));
    }
  };

  const resetCaseForm = () => {
    setEditingCaseId(null);
    setCaseFormData({ name: '', steps: '', assertions: '', accountId: '', modelId: '' });
  };

  const handleRunTest = async (testCaseId: string, testName: string) => {
    try {
      setContextMenuId(null);
      toast.info(t('runningToast', { name: testName }));
      const result = await runTest(testCaseId);
      if (result.status === 'pass') {
        toast.success(t('passToast', { name: testName }));
      } else {
        toast.error(t('failToast', { name: testName, error: result.error || '' }));
      }
    } catch (e: any) {
      toast.error(t('runError', { error: e.message }));
    }
  };

  // --- Suite Actions ---
  const handleEditSuite = (ts: any) => {
    setEditingSuiteId(ts.id);
    setSuiteFormData({
      name: ts.name,
      description: ts.description || '',
      testCaseIds: ts.testCaseIds || []
    });
    setIsSuiteOpen(true);
    setContextMenuId(null);
  };

  const handleSaveSuite = async () => {
    try {
      if (editingSuiteId) {
        await updateTestSuite({ ...suiteFormData, id: editingSuiteId } as any);
        toast.success(t('suiteUpdated'));
      } else {
        await createTestSuite({ ...suiteFormData, id: crypto.randomUUID() } as any);
        toast.success(t('suiteCreated'));
      }
      setIsSuiteOpen(false);
      resetSuiteForm();
    } catch {
      toast.error(t('suiteSaveFailed'));
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
      setContextMenuId(null);
      toast.info(t('suiteRunningToast', { name: suiteName }));
      await runSuite(suiteId);
      toast.success(t('suiteStartedToast', { name: suiteName }));
    } catch (e: any) {
      toast.error(t('suiteRunError', { error: e.message }));
    }
  };

  async function handleDeleteCase(id: string) {
    try {
      await deleteTestCase(id);
      toast.success(t('caseDeleted'));
      setCaseToDelete(null);
    } catch { toast.error(t('deleteFailed')); }
  }

  async function handleDeleteSuite(id: string) {
    try {
      await deleteTestSuite(id);
      toast.success(t('suiteDeleted'));
      setSuiteToDelete(null);
    } catch { toast.error(t('deleteFailed')); }
  }

  return (
    <div className="flex-1 flex bg-background overflow-hidden">
      {/* ========== LEFT: Main Content ========== */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-8 pb-6 space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight text-foreground">{t('pageTitle')}</h2>
            <p className="text-muted-foreground text-[15px] max-w-xl leading-relaxed">
              {t('pageSubtitle')}
            </p>
          </div>

          {/* Toolbar: Filter + Sort + Search + New */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Button */}
            <div className="relative" ref={filterRef}>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 gap-2 rounded-full border-border/60 bg-background hover:bg-secondary/40 font-medium"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <Filter className="w-3.5 h-3.5" />
                {t('filter')}
                {filterType !== 'all' && (
                  <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-primary text-primary-foreground">
                    {filterType === 'case' ? 'Case' : 'Suite'}
                  </Badge>
                )}
              </Button>
              <AnimatePresence>
                {showFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-11 left-0 z-50 bg-popover border border-border/60 rounded-xl shadow-xl p-1.5 min-w-[160px]"
                  >
                    {[
                      { value: 'all' as const, label: t('filterAll') },
                      { value: 'case' as const, label: t('filterCase') },
                      { value: 'suite' as const, label: t('filterSuite') },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                          filterType === opt.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary/50 text-foreground/80"
                        )}
                        onClick={() => { setFilterType(opt.value); setShowFilterMenu(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sort Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 gap-2 rounded-full border-border/60 bg-background hover:bg-secondary/40 font-medium"
              onClick={() => setSortBy(sortBy === 'recent' ? 'name' : 'recent')}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortBy === 'recent' ? t('recentlyModified') : t('byName')}
            </Button>

            {/* Search */}
            <div className="relative flex-1 max-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-full border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            {/* New Button */}
            <div className="relative" ref={newMenuRef}>
              <Button 
                className="h-10 px-6 gap-2 rounded-full font-bold shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setShowNewMenu(!showNewMenu)}
              >
                <Plus className="w-4 h-4" />
                {t('newCase')}
              </Button>
              <AnimatePresence>
                {showNewMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    className="absolute top-12 right-0 z-50 bg-popover border border-border/60 rounded-xl shadow-xl p-1.5 min-w-[180px]"
                  >
                    <button
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2.5"
                      onClick={() => { resetCaseForm(); setIsCaseOpen(true); setShowNewMenu(false); }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Layout className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{t('newCase')}</div>
                        <div className="text-[11px] text-muted-foreground">{t('newCaseDesc')}</div>
                      </div>
                    </button>
                    <button
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-secondary/50 transition-colors flex items-center gap-2.5"
                      onClick={() => { resetSuiteForm(); setIsSuiteOpen(true); setShowNewMenu(false); }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <List className="w-3.5 h-3.5 text-orange-500" />
                      </div>
                      <div>
                        <div className="font-medium">{t('newSuite')}</div>
                        <div className="text-[11px] text-muted-foreground">{t('newSuiteDesc')}</div>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Unified List */}
          <div className="space-y-3">
            {isLoading && unifiedList.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground italic">{t('loading')}</div>
            ) : unifiedList.length === 0 ? (
              <div className="h-60 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl bg-secondary/5 text-center px-4">
                <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? t('emptySearch') : t('emptyList')}
                </p>
              </div>
            ) : unifiedList.map((item) => {
              const isCase = item.kind === 'case';
              const badgeClass = isCase
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-orange-500/30 bg-orange-500/5 text-orange-500';
              const statusColor = item.status === 'READY'
                ? 'text-green-600 dark:text-green-400'
                : 'text-muted-foreground';

              const stepsCount = isCase ? (item as any).steps?.length || 0 : (item as any).testCaseIds?.length || 0;
              const stepsLabel = isCase ? t('steps', { count: stepsCount }) : t('cases', { count: stepsCount });
              const assertCount = isCase ? (item as any).assertions?.length || 0 : 0;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group"
                >
                  <Card className="shadow-sm border-border/50 hover:shadow-md hover:border-border/80 transition-all duration-200 rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-0">
                        {/* Play / Run button area */}
                        <button
                          className={cn(
                            "flex items-center justify-center w-16 h-full min-h-[72px] shrink-0 transition-colors",
                            isCase
                              ? "hover:bg-primary/5 text-primary/60 hover:text-primary"
                              : "hover:bg-orange-500/5 text-orange-500/60 hover:text-orange-500",
                            (runningTestCaseId || runningSuiteId) && "opacity-50 pointer-events-none"
                          )}
                          onClick={() => {
                            if (isCase) handleRunTest(item.id, item.name);
                            else handleRunSuite(item.id, item.name);
                          }}
                          disabled={runningTestCaseId !== null || runningSuiteId !== null}
                          title={isCase ? t('runCase') : t('runSuite')}
                        >
                          {(runningTestCaseId === item.id || runningSuiteId === item.id) ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <PlayCircle className="w-6 h-6" />
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-4 pr-2">
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-semibold text-base truncate">{item.name}</h3>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                            <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 font-semibold uppercase tracking-wider rounded-md", badgeClass)}>
                              {isCase ? 'CASE' : 'SUITE'}
                            </Badge>
                            <span className="flex items-center gap-1">
                              ☰ {stepsLabel}
                            </span>
                            {isCase && assertCount > 0 && (
                              <span className="flex items-center gap-1">
                                ⊘ {t('assertions', { count: assertCount })}
                              </span>
                            )}
                            {isCase && (item as any).modelId && (
                              <span className="flex items-center gap-1 opacity-60">
                                <Brain className="h-3 w-3" /> {(item as any).modelId}
                              </span>
                            )}
                            {item.lastRunAgo && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {item.lastRunAgo}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-3 pr-2 shrink-0">
                          <span className={cn("text-xs font-semibold tracking-wide", statusColor)}>
                            {item.status}
                          </span>

                          {/* More menu */}
                          <div className="relative" ref={contextMenuId === item.id ? contextMenuRef : undefined}>
                            <button
                              className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenuId(contextMenuId === item.id ? null : item.id);
                              }}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <AnimatePresence>
                              {contextMenuId === item.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-9 z-50 bg-popover border border-border/60 rounded-xl shadow-xl p-1 min-w-[140px]"
                                >
                                  <button
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary/50 flex items-center gap-2 transition-colors"
                                    onClick={() => {
                                      if (isCase) handleRunTest(item.id, item.name);
                                      else handleRunSuite(item.id, item.name);
                                    }}
                                  >
                                    <PlayCircle className="w-3.5 h-3.5 text-green-500" /> {t('run')}
                                  </button>
                                  <button
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary/50 flex items-center gap-2 transition-colors"
                                    onClick={() => {
                                      if (isCase) {
                                        const tc = testCases.find(c => c.id === item.id);
                                        if (tc) handleEditCase(tc);
                                      } else {
                                        const ts = testSuites.find(s => s.id === item.id);
                                        if (ts) handleEditSuite(ts);
                                      }
                                    }}
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-blue-500" /> {t('edit')}
                                  </button>
                                  <div className="h-px bg-border/40 my-1" />
                                  <button
                                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-destructive/10 text-destructive flex items-center gap-2 transition-colors"
                                    onClick={() => {
                                      setContextMenuId(null);
                                      if (isCase) setCaseToDelete(item.id);
                                      else setSuiteToDelete(item.id);
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> {t('delete')}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========== RIGHT: Stats Sidebar ========== */}
      <div className="w-[280px] shrink-0 border-l border-border/40 bg-secondary/5 overflow-y-auto hidden lg:block">
        <div className="p-5 space-y-4">
          {/* System Health */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('systemHealth')}</span>
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="text-4xl font-black text-foreground tracking-tight">
                {stats.passRate}<span className="text-lg">%</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{t('passRate')}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-secondary/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stats.passRate, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                {t('healthDesc')} {stats.passRate > 0 ? t('healthImprovement', { value: (stats.passRate - 98).toFixed(1) }) : ''}
              </p>
            </CardContent>
          </Card>

          {/* Total Cases */}
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('totalCases')}</span>
              <div className="text-3xl font-black text-foreground mt-1 tracking-tight">
                {stats.caseCount > 0 ? stats.caseCount.toLocaleString() : testCases.length}
              </div>
            </CardContent>
          </Card>

          {/* Executions */}
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t('executions')}</span>
              <div className="text-3xl font-black text-foreground mt-1 tracking-tight">
                {stats.recentActivity.reduce((sum, d) => sum + d.total, 0).toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>

          {/* Precision Tip */}
          <Card className="border-none shadow-md bg-gradient-to-br from-primary/90 to-primary text-primary-foreground overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">{t('precisionTip')}</span>
              </div>
              <p className="text-sm leading-relaxed opacity-90">
                "{tips[tipIndex]}"
              </p>
            </CardContent>
          </Card>

          {/* Mini activity chart */}
          {stats.recentActivity.length > 0 && (
            <Card className="border-border/40 shadow-sm">
              <CardContent className="p-5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">{t('activity7Day')}</span>
                <div className="flex items-end gap-1 h-[60px]">
                  {stats.recentActivity.map((day) => {
                    const maxVal = Math.max(...stats.recentActivity.map(a => a.total), 1);
                    const h = (day.total / maxVal) * 100;
                    const passRatio = day.total > 0 ? day.pass / day.total : 0;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col justify-end" title={`${day.date}: ${day.pass}/${day.total}`}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(h, 4)}%` }}
                          className="rounded-sm"
                          style={{
                            background: passRatio > 0.8 ? 'hsl(var(--primary))' : passRatio > 0.5 ? '#f59e0b' : '#ef4444',
                            opacity: 0.7
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ========== SHEETS (Edit Forms) ========== */}

      {/* Case Sheet */}
      <Sheet open={isCaseOpen} onOpenChange={setIsCaseOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-none flex flex-col border-border/40">
          <SheetHeader className="text-left space-y-1 mt-2">
            <SheetTitle className="text-2xl font-bold">{editingCaseId ? t('editCase') : t('createCase')}</SheetTitle>
            <SheetDescription>{t('caseSheetDesc')}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-6 space-y-6 px-1">
             <div className="space-y-2">
                <Label className="text-sm font-semibold">{t('caseName')}</Label>
                <Input value={caseFormData.name} onChange={(e) => setCaseFormData({...caseFormData, name: e.target.value})} />
             </div>
             <div className="space-y-2">
                <Label className="text-sm font-semibold">{t('caseSteps')}</Label>
                <Textarea className="min-h-[150px] font-mono text-xs" value={caseFormData.steps} onChange={(e) => setCaseFormData({...caseFormData, steps: e.target.value})} />
             </div>
             <div className="space-y-2">
                <Label className="text-sm font-semibold">{t('caseAssertions')}</Label>
                <Textarea className="min-h-[100px] font-mono text-xs" value={caseFormData.assertions} onChange={(e) => setCaseFormData({...caseFormData, assertions: e.target.value})} />
             </div>
             <div className="space-y-4 pt-4 border-t">
                <Label className="text-sm font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> {t('execConfig')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] opacity-70">{t('provider')}</Label>
                    <select 
                      className="w-full h-8 bg-secondary/30 rounded border-none text-xs px-2"
                      value={caseFormData.accountId}
                      onChange={(e) => setCaseFormData({...caseFormData, accountId: e.target.value})}
                    >
                      <option value="">{t('defaultConfig')}</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] opacity-70">{t('modelId')}</Label>
                    <Input 
                      className="h-8 text-xs bg-secondary/30 border-none px-2"
                      value={caseFormData.modelId}
                      onChange={(e) => setCaseFormData({...caseFormData, modelId: e.target.value})}
                      placeholder={t('modelPlaceholder')}
                    />
                  </div>
                </div>
             </div>
          </div>
          <SheetFooter className="mt-auto pt-6 border-t">
            <Button onClick={handleSaveCase} disabled={isSaving || !caseFormData.name}>{t('save')}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Suite Sheet */}
      <Sheet open={isSuiteOpen} onOpenChange={setIsSuiteOpen}>
        <SheetContent className="w-[400px] sm:w-[500px] flex flex-col border-border/40">
          <SheetHeader className="mt-2 text-left">
            <SheetTitle className="text-2xl font-bold">{editingSuiteId ? t('editSuite') : t('createSuite')}</SheetTitle>
            <SheetDescription>{t('suiteSheetDesc')}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t('suiteName')}</Label>
              <Input value={suiteFormData.name} onChange={(e) => setSuiteFormData({...suiteFormData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t('suiteDesc')}</Label>
              <Input value={suiteFormData.description} onChange={(e) => setSuiteFormData({...suiteFormData, description: e.target.value})} />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center justify-between">
                <span>{t('includedCases', { count: suiteFormData.testCaseIds.length })}</span>
                <span className="text-[11px] text-muted-foreground font-normal">{t('selectCasesHint')}</span>
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
                        <div className="text-[10px] text-muted-foreground">{t('steps', { count: tc.steps.length })}</div>
                     </div>
                     {suiteFormData.testCaseIds.includes(tc.id) && <CheckCircle2 className="w-4 h-4 text-primary" />}
                   </div>
                 ))}
                 {testCases.length === 0 && <div className="p-10 text-center text-xs text-muted-foreground italic">{t('noCasesAvailable')}</div>}
              </div>
            </div>
          </div>
          <SheetFooter className="mt-auto pt-6 border-t">
            <Button onClick={handleSaveSuite} disabled={isSaving || !suiteFormData.name || suiteFormData.testCaseIds.length === 0}>
               {t('saveSuite')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!caseToDelete}
        title={t('confirmDeleteCase')}
        message={t('confirmDeleteCaseMsg')}
        onConfirm={() => { if (caseToDelete) handleDeleteCase(caseToDelete); }}
        onCancel={() => setCaseToDelete(null)}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!suiteToDelete}
        title={t('confirmDeleteSuite')}
        message={t('confirmDeleteSuiteMsg')}
        onConfirm={() => { if (suiteToDelete) handleDeleteSuite(suiteToDelete); }}
        onCancel={() => setSuiteToDelete(null)}
        variant="destructive"
      />
    </div>
  );
}

export default TestCases;
