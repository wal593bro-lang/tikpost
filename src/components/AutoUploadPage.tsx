import { useState, useMemo } from 'react';
import type { AutomationItem, IdlePageItem, FBAccount, AutomationStatus } from '../types.ts';

interface AutoUploadPageProps {
  automations: AutomationItem[];
  setAutomations: React.Dispatch<React.SetStateAction<AutomationItem[]>>;
  idlePages: IdlePageItem[];
  setIdlePages: React.Dispatch<React.SetStateAction<IdlePageItem[]>>;
  accounts: FBAccount[];
  showToast: (msg: string) => void;
}

interface PickedPage {
  page_id: number;
  fbPageId: string;
  name: string;
  owner: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook';
  source: string;
  count: number;
  times: string[];
}

export default function AutoUploadPage({
  automations,
  setAutomations,
  idlePages,
  setIdlePages,
  accounts,
  showToast
}: AutoUploadPageProps) {
  // UI states
  const [showIdle, setShowIdle] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Modal Wizard State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [accSearch, setAccSearch] = useState('');
  const [pageSearch, setPageSearch] = useState('');
  const [selectedAccId, setSelectedAccId] = useState<number | null>(null);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<number>>(new Set());

  // Step 2 state
  const [srcMode, setSrcMode] = useState<'each' | 'bulk'>('each');
  const [picked, setPicked] = useState<PickedPage[]>([]);
  const [bulkPlatform, setBulkPlatform] = useState<'youtube' | 'tiktok' | 'instagram' | 'facebook'>('youtube');
  const [bulkLinksText, setBulkLinksText] = useState('');
  const [showBulkMap, setShowBulkMap] = useState(false);

  // Step 3 state
  const [timeMode, setTimeMode] = useState<'same' | 'each'>('same');
  const [sameCount, setSameCount] = useState<number>(4);
  const [sameTimes, setSameTimes] = useState<string[]>(['12:00', '15:00', '18:00', '21:00']);

  // Schedule Editor Modal State (Click to edit schedule & times for any page)
  const [scheduleModalCard, setScheduleModalCard] = useState<AutomationItem | null>(null);
  const [schedTimes, setSchedTimes] = useState<string[]>(['12:00', '15:00', '18:00', '21:00']);
  const [schedPostsCount, setSchedPostsCount] = useState<number>(4);
  const [schedPlatform, setSchedPlatform] = useState<'youtube' | 'tiktok' | 'instagram' | 'facebook'>('tiktok');
  const [schedSource, setSchedSource] = useState<string>('');
  const [schedAntiSpamJitter, setSchedAntiSpamJitter] = useState<boolean>(true);
  const [schedBufferTarget, setSchedBufferTarget] = useState<number>(20);
  const [schedStatus, setSchedStatus] = useState<AutomationStatus>('active');
  const [testPostStep, setTestPostStep] = useState<'idle' | 'fetching' | 'uploading' | 'done'>('idle');

  // Stats computation
  const stats = useMemo(() => {
    const total = automations.length;
    const r2Ready = automations.filter(a => a.r2Ready).length;
    const lowBuffer = automations.filter(a => a.bufferVideosCount < a.targetBufferVideos).length;
    const needsAttention = automations.filter(a => a.status !== 'active').length;
    const failedSkipped = automations.reduce((acc, curr) => acc + curr.failedCount, 0);
    const totalPosted = automations.reduce((acc, curr) => acc + curr.postedCount, 0);

    return { total, r2Ready, lowBuffer, needsAttention, failedSkipped, totalPosted };
  }, [automations]);

  // Filtered and sorted automations
  const displayAutomations = useMemo(() => {
    let list = automations.filter(a => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = a.pageName.toLowerCase().includes(q) || a.source.toLowerCase().includes(q) || a.fbPageId.includes(q);
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (sortBy === 'newest') {
      list = [...list].reverse();
    } else if (sortBy === 'posted') {
      list = [...list].sort((a, b) => b.postedCount - a.postedCount);
    }

    return list;
  }, [automations, searchQuery, statusFilter, sortBy]);

  // Refresh simulation
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Pages buffer and Facebook tokens refreshed successfully.');
    }, 1200);
  };

  // Open Wizard (optionally for a specific idle page)
  const handleOpenAddPage = (preselectIdle?: IdlePageItem) => {
    setIsModalOpen(true);
    setWizardStep(1);
    setAccSearch('');
    setPageSearch('');
    
    if (preselectIdle) {
      // Find the account that owns this page
      const acc = accounts.find(a => a.pages.some(p => p.id === preselectIdle.pageId));
      if (acc) {
        setSelectedAccId(acc.id);
        setSelectedPageIds(new Set([preselectIdle.pageId]));
      } else {
        setSelectedAccId(accounts[0]?.id || null);
        setSelectedPageIds(new Set());
      }
    } else {
      setSelectedAccId(accounts[0]?.id || null);
      setSelectedPageIds(new Set());
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPageIds(new Set());
    setPicked([]);
    setShowBulkMap(false);
  };

  // Wizard Step Navigation
  const handleGoStep2 = () => {
    if (selectedPageIds.size === 0) {
      alert('Pehle page(s) chunein.');
      return;
    }

    const currentAccount = accounts.find(a => a.id === selectedAccId);
    if (!currentAccount) return;

    const newPicked: PickedPage[] = currentAccount.pages
      .filter(p => selectedPageIds.has(p.id))
      .map(p => ({
        page_id: p.id,
        fbPageId: p.page_id,
        name: p.name,
        owner: currentAccount.name,
        platform: 'youtube',
        source: '',
        count: 4,
        times: ['12:00', '15:00', '18:00', '21:00']
      }));

    setPicked(newPicked);
    setWizardStep(2);
  };

  const handleMatchBulk = () => {
    const lines = bulkLinksText.split('\n').map(l => l.trim()).filter(Boolean);
    const updated = picked.map((p, idx) => ({
      ...p,
      platform: bulkPlatform,
      source: lines[idx] || ''
    }));
    setPicked(updated);
    setShowBulkMap(true);
  };

  const handleGoStep3 = () => {
    for (const p of picked) {
      if (!p.source || !p.source.trim()) {
        alert(`${p.name} ka source URL daalein.`);
        return;
      }
    }
    setWizardStep(3);
  };

  const handleUseSuggested = () => {
    const suggested = ['12:00', '15:00', '18:00', '21:00'];
    setSameCount(4);
    setSameTimes(suggested);
  };

  const handleSetSameCount = (count: number) => {
    setSameCount(count);
    const updated = [...sameTimes];
    while (updated.length < count) {
      const h = 10 + updated.length * 2;
      updated.push(`${h < 10 ? '0' : ''}${h % 24}:00`);
    }
    setSameTimes(updated.slice(0, count));
  };

  // Submit Wizard & create active automation items
  const handleSubmitWizard = () => {
    if (timeMode === 'same') {
      for (let k = 0; k < sameCount; k++) {
        if (!sameTimes[k]) {
          alert('Saare times daalein.');
          return;
        }
      }
    }

    // Auto-Spread algorithm to avoid FB rate-limits:
    // channel 1 = +0 min, channel 2 = +3 min, channel 3 = +6 min...
    function shiftTimes(timesArr: string[], shiftMin: number) {
      return timesArr.filter(Boolean).map(t => {
        const [h, m] = t.split(':').map(Number);
        let total = (h * 60 + m + shiftMin);
        total = ((total % 1440) + 1440) % 1440;
        const hh = Math.floor(total / 60);
        const mm = total % 60;
        return `${hh < 10 ? '0' : ''}${hh}:${mm < 10 ? '0' : ''}${mm}`;
      });
    }

    const createdItems: AutomationItem[] = picked.map((p, idx) => {
      const baseTimes = timeMode === 'same' ? sameTimes.slice(0, sameCount) : p.times;
      const shift = ((idx * 3) + Math.floor(Math.random() * 3)) % 60;
      const spreadTimes = shiftTimes(baseTimes, shift);
      const ppd = spreadTimes.length;

      return {
        id: 'auto-' + Date.now() + '-' + idx,
        pageId: p.page_id,
        fbPageId: p.fbPageId,
        pageName: p.name,
        owner: p.owner,
        platform: p.platform,
        source: p.source.trim(),
        status: 'active',
        r2Ready: true,
        bufferDays: 5,
        bufferVideosCount: ppd * 5, // ready on setup
        targetBufferVideos: ppd * 5,
        postedCount: 0,
        queuedCount: ppd * 5,
        failedCount: 0,
        followers: 12500,
        followersChange: 0,
        postsPerDay: ppd,
        times: spreadTimes,
        lastPosted: 'Just connected',
        nextPostTime: `Today at ${spreadTimes[0]}`
      };
    });

    // Add to automations
    setAutomations(prev => [...createdItems, ...prev]);

    // Remove from idle pages if they were idle
    const addedPageIds = new Set(picked.map(p => p.page_id));
    setIdlePages(prev => prev.filter(idle => !addedPageIds.has(idle.pageId)));

    handleCloseModal();
    showToast(`✅ ${picked.length} pages automation successfully shuru ho gayi!`);
  };

  // Card Actions
  const handleToggleStatus = (id: string) => {
    setAutomations(prev => prev.map(a => {
      if (a.id === id) {
        const nextStatus = a.status === 'active' ? 'paused' : 'active';
        showToast(`Page is now ${nextStatus}`);
        return { ...a, status: nextStatus };
      }
      return a;
    }));
  };

  const handleDeleteCard = (id: string, name: string) => {
    if (confirm(`Kya aap "${name}" ki automation remove karna chahte hain?`)) {
      setAutomations(prev => prev.filter(a => a.id !== id));
      showToast(`Automation removed for ${name}`);
    }
  };

  const handleSimulatePost = (id: string) => {
    setAutomations(prev => prev.map(a => {
      if (a.id === id) {
        showToast(`🚀 New post published to Facebook page: ${a.pageName}`);
        return {
          ...a,
          postedCount: a.postedCount + 1,
          queuedCount: Math.max(0, a.queuedCount - 1),
          bufferVideosCount: Math.max(0, a.bufferVideosCount - 1),
          lastPosted: 'Just now',
          followersChange: a.followersChange + 4
        };
      }
      return a;
    }));
  };

  // Open Schedule Editor Modal for any card
  const handleOpenScheduleModal = (card: AutomationItem) => {
    setScheduleModalCard(card);
    const times = card.times && card.times.length > 0 ? [...card.times] : ['12:00', '15:00', '18:00', '21:00'];
    setSchedTimes(times);
    setSchedPostsCount(card.postsPerDay || times.length || 4);
    setSchedPlatform(card.platform || 'tiktok');
    setSchedSource(card.source || '');
    setSchedAntiSpamJitter(true);
    setSchedBufferTarget(card.targetBufferVideos || 20);
    setSchedStatus(card.status || 'active');
  };

  const handleCloseScheduleModal = () => {
    setScheduleModalCard(null);
  };

  const handleSetSchedPostsCount = (cnt: number) => {
    setSchedPostsCount(cnt);
    if (cnt === 1) {
      setSchedTimes(['18:00']);
    } else if (cnt === 2) {
      setSchedTimes(['13:00', '19:00']);
    } else if (cnt === 3) {
      setSchedTimes(['12:00', '16:00', '20:00']);
    } else if (cnt === 4) {
      setSchedTimes(['12:00', '15:00', '18:00', '21:00']);
    } else if (cnt === 5) {
      setSchedTimes(['10:00', '13:00', '16:00', '19:00', '22:00']);
    } else if (cnt === 6) {
      setSchedTimes(['09:00', '12:00', '15:00', '18:00', '20:30', '22:30']);
    } else {
      const step = 14 / (cnt + 1);
      const newTimes: string[] = [];
      for (let i = 1; i <= cnt; i++) {
        const hour = Math.floor(9 + step * i);
        const mins = (i % 2 === 0 ? '30' : '00');
        newTimes.push(`${String(hour).padStart(2, '0')}:${mins}`);
      }
      setSchedTimes(newTimes);
    }
  };

  const handleAddSchedTimeSlot = () => {
    setSchedTimes(prev => [...prev, '20:00']);
    setSchedPostsCount(prev => prev + 1);
  };

  const handleRemoveSchedTimeSlot = (idx: number) => {
    if (schedTimes.length <= 1) {
      alert('Kam az kam aik time slot lazmi hona chahiye.');
      return;
    }
    const updated = schedTimes.filter((_, i) => i !== idx);
    setSchedTimes(updated);
    setSchedPostsCount(updated.length);
  };

  const handleSaveSchedule = () => {
    if (!scheduleModalCard) return;

    if (!schedSource.trim()) {
      alert('Source URL khali nahi ho sakti!');
      return;
    }
    if (schedTimes.length === 0) {
      alert('Kam az kam aik time slot lazmi hona chahiye.');
      return;
    }

    const sortedTimes = [...schedTimes].sort();
    const now = new Date();
    const curTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nextSlot = sortedTimes.find(t => t > curTimeStr) || sortedTimes[0];
    const isTomorrow = !sortedTimes.some(t => t > curTimeStr);
    const nextPostTime = isTomorrow ? `Kal at ${nextSlot}` : `Today at ${nextSlot}`;

    setAutomations(prev => {
      const updated = prev.map(item => {
        if (item.id === scheduleModalCard.id) {
          return {
            ...item,
            postsPerDay: sortedTimes.length,
            times: sortedTimes,
            source: schedSource.trim(),
            platform: schedPlatform,
            targetBufferVideos: schedBufferTarget,
            status: schedStatus,
            nextPostTime
          };
        }
        return item;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('postflow_automations', JSON.stringify(updated));
      }
      return updated;
    });

    showToast(`✅ "${scheduleModalCard.pageName}" ka schedule update ho gaya! (${sortedTimes.length} posts/day: ${sortedTimes.join(', ')})`);
    handleCloseScheduleModal();
  };

  const handleTestPostInsideModal = () => {
    if (!scheduleModalCard || testPostStep !== 'idle') return;
    setTestPostStep('fetching');

    setTimeout(() => {
      setTestPostStep('uploading');
      setTimeout(() => {
        setTestPostStep('done');
        handleSimulatePost(scheduleModalCard.id);

        setTimeout(() => {
          setTestPostStep('idle');
        }, 3500);
      }, 1000);
    }, 800);
  };

  const activeAccount = accounts.find(a => a.id === selectedAccId);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-[14px] p-6 border border-[#e8ebf0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>⬇️</span>
            <span>Auto Download/Upload</span>
          </h1>
          <p className="text-sm text-[#718096] mt-1">
            Connected pages — automated download aur posting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowIdle(prev => !prev)}
            className={`px-4 py-2.5 rounded-[10px] text-sm font-semibold border transition-all cursor-pointer ${
              showIdle
                ? 'bg-[#e7f1ff] text-[#1877f2] border-[#1877f2]'
                : 'bg-white text-[#4a5568] border-[#e2e8f0] hover:bg-slate-50'
            }`}
          >
            💤 Idle Pages ({idlePages.length})
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-[10px] text-sm font-semibold border border-[#e2e8f0] bg-white text-[#4a5568] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh Pages'}
          </button>

          <button
            onClick={() => handleOpenAddPage()}
            className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            ＋ Add Page
          </button>
        </div>
      </div>

      {/* Stats Grid (6 cards from user HTML) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-[14px] p-[18px] border border-[#e8ebf0]">
          <div className="text-[11px] font-semibold text-[#a0aec0] uppercase tracking-wider">Total Pages</div>
          <div className="text-[26px] font-extrabold text-[#1877f2] mt-1.5 font-mono tabular-nums">{stats.total}</div>
        </div>

        <div className="bg-white rounded-[14px] p-[18px] border border-[#e8ebf0]">
          <div className="text-[11px] font-semibold text-[#a0aec0] uppercase tracking-wider">R2 Ready</div>
          <div className="text-[26px] font-extrabold text-[#2e9e5b] mt-1.5 font-mono tabular-nums">{stats.r2Ready}</div>
        </div>

        <div className="bg-white rounded-[14px] p-[18px] border border-[#e8ebf0]">
          <div className="text-[11px] font-semibold text-[#a0aec0] uppercase tracking-wider">Low Buffer</div>
          <div className="text-[26px] font-extrabold text-[#f39c12] mt-1.5 font-mono tabular-nums">{stats.lowBuffer}</div>
        </div>

        <div className="bg-white rounded-[14px] p-[18px] border border-[#e8ebf0]">
          <div className="text-[11px] font-semibold text-[#a0aec0] uppercase tracking-wider">Needs Attention</div>
          <div className="text-[26px] font-extrabold text-[#e74c3c] mt-1.5 font-mono tabular-nums">{stats.needsAttention}</div>
        </div>

        <div className="bg-white rounded-[14px] p-[18px] border border-[#e8ebf0]">
          <div className="text-[11px] font-semibold text-[#a0aec0] uppercase tracking-wider">Failed/Skipped</div>
          <div className="text-[26px] font-extrabold text-[#e74c3c] mt-1.5 font-mono tabular-nums">{stats.failedSkipped}</div>
        </div>

        <div className="bg-white rounded-[14px] p-[18px] border border-[#e8ebf0]">
          <div className="text-[11px] font-semibold text-[#a0aec0] uppercase tracking-wider">Total Posted</div>
          <div className="text-[26px] font-extrabold text-[#1877f2] mt-1.5 font-mono tabular-nums">{stats.totalPosted}</div>
        </div>
      </div>

      {/* R2 5-day Buffer Info Bar */}
      <div className="bg-[#fff7ed] border border-[#fed7aa] rounded-[10px] p-3 px-4 text-[13px] text-[#9a6a3a] flex items-center gap-2">
        <span>ℹ️</span>
        <span>
          Tool strict 5-day R2 buffer rakhta hai. Har page par posting tab start hoti hai jab required videos R2 par ready hon. Ready pages:{' '}
          <b className="font-bold font-mono">{stats.r2Ready}/{stats.total}</b>.
        </span>
      </div>

      {/* Pages Head & Filter Bar */}
      <div className="bg-white rounded-t-[14px] p-4 sm:px-5 border border-[#e8ebf0] border-b-0 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#1a1a2e]">📚 Automation Pages</h3>
          <div className="text-xs text-[#a0aec0] mt-0.5">{displayAutomations.length} pages active</div>
        </div>
      </div>

      <div className="bg-white rounded-b-[14px] p-4 sm:px-5 border border-[#e8ebf0] border-t-0 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="🔍 Search pages or sources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] focus:outline-none focus:border-[#1877f2] bg-white"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] bg-white text-[#2d3748] font-semibold min-w-[170px] focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="inactive">Inactive</option>
          <option value="verification-req">Verification Req.</option>
          <option value="rate-limited">Rate Limited</option>
          <option value="page-not-accessible">Page Not Accessible</option>
          <option value="invalid-token">Invalid Token</option>
          <option value="invalid-username">Invalid Username</option>
          <option value="creator-suspended">Creator Suspended</option>
          <option value="completed">Completed</option>
          <option value="2fa-req-on-bm">2FA Req. on BM</option>
          <option value="check-dev-app">Check Dev App</option>
          <option value="account-suspended">Account Suspended</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] bg-white text-[#2d3748] font-semibold min-w-[140px] focus:outline-none"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="posted">Most Posted</option>
        </select>
      </div>

      {/* Active Cards Grid */}
      {displayAutomations.length === 0 ? (
        <div className="bg-white rounded-[14px] p-10 border border-[#e8ebf0] text-center text-[#a0aec0]">
          Abhi koi channel/page nahi. "＋ Add Page" se add karein.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayAutomations.map((card) => {
            const bufferPct = Math.min(100, Math.round((card.bufferVideosCount / card.targetBufferVideos) * 100));
            const isBufferFull = card.bufferVideosCount >= card.targetBufferVideos;

            return (
              <div
                key={card.id}
                onClick={() => handleOpenScheduleModal(card)}
                className={`bg-white rounded-[14px] p-5 border border-[#e8ebf0] shadow-xs flex flex-col justify-between hover:border-[#1877f2] hover:shadow-md transition-all cursor-pointer relative group ${
                  card.status === 'active' ? 'border-l-4 border-l-[#2e9e5b]' :
                  card.status === 'paused' ? 'border-l-4 border-l-[#e74c3c]' :
                  card.status === 'rate-limited' ? 'border-l-4 border-l-[#f39c12]' :
                  'border-l-4 border-l-[#e74c3c]'
                }`}
              >
                <div>
                  {/* Top Bar with Page info & Status badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-bold text-[15px] text-[#1a1a2e] leading-snug group-hover:text-[#1877f2] transition-colors flex items-center gap-1.5">
                        <span>{card.pageName}</span>
                      </div>
                      <div className="text-xs text-[#a0aec0] font-mono mt-0.5">{card.fbPageId}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        card.status === 'active' ? 'bg-[#e6f7ed] text-[#2e9e5b]' :
                        card.status === 'paused' ? 'bg-[#fdeaea] text-[#e74c3c]' :
                        'bg-[#fef5e7] text-[#f39c12]'
                      }`}>
                        {card.status}
                      </span>
                      {card.r2Ready && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e6f7ed] text-[#2e9e5b]">
                          R2 Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Buffer Box */}
                  <div className="bg-[#f8fafc] border border-[#edf2f7] rounded-[10px] p-2.5 px-3 my-3">
                    <div className="flex justify-between items-center text-xs text-[#4a5568] font-bold mb-1.5">
                      <span>5-Day R2 Buffer</span>
                      <span className="font-mono tabular-nums text-xs">
                        {card.bufferVideosCount}/{card.targetBufferVideos} videos ({bufferPct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[#e8edf5] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isBufferFull ? 'bg-[#2e9e5b]' : 'bg-[#f39c12]'
                        }`}
                        style={{ width: `${bufferPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Followers stat row */}
                  <div className="grid grid-cols-2 gap-2 my-2.5">
                    <div className="bg-[#f4f6fa] rounded-[8px] p-2">
                      <div className="text-[10px] text-[#a0aec0] font-bold uppercase">Followers</div>
                      <div className="text-base font-bold text-[#1a1a2e] font-mono tabular-nums mt-0.5">
                        {card.followers.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-[#f4f6fa] rounded-[8px] p-2">
                      <div className="text-[10px] text-[#a0aec0] font-bold uppercase">Growth (7d)</div>
                      <div className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
                        card.followersChange >= 0 ? 'text-[#2e9e5b]' : 'text-[#e74c3c]'
                      }`}>
                        {card.followersChange >= 0 ? `+${card.followersChange}` : card.followersChange}
                      </div>
                    </div>
                  </div>

                  {/* Source link info */}
                  <div className="text-xs text-[#718096] bg-[#f4f6fa] p-2 px-2.5 rounded-[8px] my-2 break-all">
                    <span className="font-semibold uppercase text-[10px] text-[#a0aec0] block mb-0.5">
                      Source ({card.platform}):
                    </span>
                    <a
                      href={card.source}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#1877f2] hover:underline"
                    >
                      {card.source}
                    </a>
                  </div>

                  {/* Posted / Queued / Failed counts */}
                  <div className="grid grid-cols-3 gap-2 my-3">
                    <div className="text-center p-2 rounded-[8px] bg-[#e6f7ed]">
                      <div className="text-lg font-extrabold text-[#2e9e5b] font-mono tabular-nums">
                        {card.postedCount}
                      </div>
                      <div className="text-[10px] uppercase text-[#a0aec0] font-bold mt-0.5">Posted</div>
                    </div>
                    <div className="text-center p-2 rounded-[8px] bg-[#fef5e7]">
                      <div className="text-lg font-extrabold text-[#f39c12] font-mono tabular-nums">
                        {card.queuedCount}
                      </div>
                      <div className="text-[10px] uppercase text-[#a0aec0] font-bold mt-0.5">Queued</div>
                    </div>
                    <div className="text-center p-2 rounded-[8px] bg-[#fdeaea]">
                      <div className="text-lg font-extrabold text-[#e74c3c] font-mono tabular-nums">
                        {card.failedCount}
                      </div>
                      <div className="text-[10px] uppercase text-[#a0aec0] font-bold mt-0.5">Failed</div>
                    </div>
                  </div>

                  {/* Prominent Schedule Banner (Clickable!) */}
                  <div className="p-2.5 bg-[#f0f6ff] border border-[#d0e4ff] rounded-[9px] flex items-center justify-between text-xs text-[#1877f2] font-semibold hover:bg-[#e4efff] transition-colors mt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-[#718096] font-bold">⏰ Daily Schedule</span>
                      <span className="font-mono text-[#0E2A2F] text-[13px] font-bold mt-0.5">
                        {card.times && card.times.length > 0 ? card.times.join(' · ') : '12:00 · 15:00 · 18:00 · 21:00'}
                      </span>
                      <span className="text-[11px] text-[#718096] mt-0.5">
                        {card.postsPerDay || card.times?.length || 4} posts/din · Next: <b className="text-[#1877f2]">{card.nextPostTime || 'Today'}</b>
                      </span>
                    </div>
                    <span className="text-xs bg-white text-[#1877f2] border border-[#c4dcff] px-2.5 py-1.5 rounded-[7px] font-bold shadow-2xs group-hover:border-[#1877f2] flex items-center gap-1">
                      <span>⚙️ Set Times</span>
                    </span>
                  </div>
                </div>

                {/* Toolbar */}
                <div
                  className="flex items-center gap-2 mt-4 pt-3 border-t border-[#edf2f7]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleOpenScheduleModal(card)}
                    className="flex-1 text-center py-2 px-2 border border-[#1877f2] bg-[#e7f1ff] hover:bg-[#d5e7ff] text-[#1877f2] rounded-[9px] text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    title="Click to set schedule & posting times"
                  >
                    <span>⏰</span>
                    <span>Schedule</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(card.id)}
                    className="py-2 px-2.5 border border-[#e2e8f0] rounded-[9px] text-xs font-semibold text-[#f39c12] hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {card.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                  </button>

                  <button
                    onClick={() => handleSimulatePost(card.id)}
                    className="py-2 px-2.5 border border-[#2e9e5b] bg-[#e6f7ed] rounded-[9px] text-xs font-bold text-[#2e9e5b] hover:bg-[#d5f3e1] transition-colors cursor-pointer"
                  >
                    🚀 Post Now
                  </button>

                  <button
                    onClick={() => handleDeleteCard(card.id, card.pageName)}
                    className="py-2 px-2 border border-[#e2e8f0] rounded-[9px] text-xs font-semibold text-[#e74c3c] hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete automation"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* IDLE PAGES SECTION (The exact 13 pages from user HTML) */}
      {showIdle && (
        <div className="mt-8 space-y-3">
          <div className="bg-white rounded-[14px] p-4 sm:px-5 border border-[#e8ebf0]">
            <h3 className="text-base font-bold text-[#1a1a2e]">
              💤 Idle Pages — posting nahi lagi ({idlePages.length})
            </h3>
            <div className="text-xs text-[#a0aec0] mt-0.5">
              Yeh pages connect hain par koi channel/source nahi laga. "＋ Add Page" se in pe posting laga sakte ho.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {idlePages.map((idle) => (
              <div
                key={idle.id}
                className="bg-white rounded-[14px] p-5 border border-[#e8ebf0] border-l-4 border-l-[#cbd5e0] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-bold text-[15px] text-[#1a1a2e]">{idle.name}</div>
                      <div className="text-xs text-[#a0aec0] font-mono mt-0.5">{idle.fbPageId}</div>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#edf2f7] text-[#718096]">
                      💤 Idle
                    </span>
                  </div>

                  <div className="text-xs text-[#718096] bg-[#f4f6fa] p-2.5 rounded-[8px] my-2">
                    <div className="mb-1 text-slate-800">
                      👤 <b>Owner:</b> {idle.owner}
                    </div>
                    <div className="text-[#a0aec0]">
                      ⚠️ Is page pe abhi koi channel/source nahi. Posting shuru karne ke liye channel add karein.
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#edf2f7]">
                  <button
                    onClick={() => handleOpenAddPage(idle)}
                    className="w-full text-center py-2 border border-[#e2e8f0] rounded-[9px] text-xs font-semibold text-[#1877f2] hover:bg-[#e7f1ff] transition-colors"
                  >
                    ＋ Channel lagao
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD PAGE 3-STEP WIZARD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
          <div className="bg-white rounded-[16px] p-6 max-w-[620px] w-full relative shadow-2xl my-auto">
            {/* Close Cross */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-5 text-2xl text-[#999] hover:text-[#333] cursor-pointer"
            >
              ×
            </button>

            <h2 className="text-xl font-bold text-[#1a1a2e] mb-1">➕ Add New Page</h2>
            <div className="text-[13px] text-[#a0aec0] mb-4">
              Step {wizardStep} of 3: {
                wizardStep === 1 ? 'Select Account & Pages' :
                wizardStep === 2 ? 'Set Source per Page' :
                'Configure Posting Schedule'
              }
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-[#eef1f5] rounded-full mb-5 overflow-hidden">
              <div
                className="h-full bg-[#1877f2] transition-all duration-300"
                style={{ width: `${(wizardStep / 3) * 100}%` }}
              />
            </div>

            {/* STEP 1: Select Account & Pages */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-[13px] font-semibold text-[#4a5568] mb-1.5 block">
                    Select Facebook Account <span className="text-[#a0aec0] font-normal">({accounts.length} connected)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="🔍 Search connected accounts..."
                    value={accSearch}
                    onChange={(e) => setAccSearch(e.target.value)}
                    className="w-full p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] focus:outline-none focus:border-[#1877f2] bg-white mb-2"
                  />

                  <div className="max-h-[180px] overflow-y-auto border border-[#eef1f5] rounded-[10px]">
                    {accounts
                      .filter(a => a.name.toLowerCase().includes(accSearch.toLowerCase()) || a.fb_user_id.includes(accSearch))
                      .map((acc) => (
                        <div
                          key={acc.id}
                          onClick={() => {
                            setSelectedAccId(acc.id);
                            setSelectedPageIds(new Set());
                          }}
                          className={`flex items-center gap-3 p-3 cursor-pointer border-b border-[#f4f6fa] hover:bg-[#f0f6ff] transition-colors ${
                            selectedAccId === acc.id ? 'bg-[#e7f1ff]' : ''
                          }`}
                        >
                          <div className="w-[38px] h-[38px] rounded-full bg-[#e7f1ff] flex items-center justify-center font-bold text-[#1877f2]">
                            {acc.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-slate-800">{acc.name}</div>
                            <div className="text-xs text-[#a0aec0] font-mono">
                              {acc.fb_user_id} · {acc.pages.length} pages
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Pages List under chosen account */}
                {activeAccount && (
                  <div>
                    <label className="text-[13px] font-semibold text-[#4a5568] mb-1.5 block">
                      Select Pages for {activeAccount.name}
                    </label>
                    <input
                      type="text"
                      placeholder="🔍 Search pages..."
                      value={pageSearch}
                      onChange={(e) => setPageSearch(e.target.value)}
                      className="w-full p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] focus:outline-none focus:border-[#1877f2] bg-white mb-2.5"
                    />

                    <div className="flex items-center gap-3 mb-2 text-[13px]">
                      <button
                        onClick={() => {
                          const allIds = activeAccount.pages.map(p => p.id);
                          setSelectedPageIds(new Set(allIds));
                        }}
                        className="text-[#1877f2] font-semibold hover:underline"
                      >
                        ✓ Select all pages
                      </button>
                      <button
                        onClick={() => setSelectedPageIds(new Set())}
                        className="text-[#e74c3c] font-semibold hover:underline"
                      >
                        ✕ Clear
                      </button>
                      <span className="ml-auto text-xs text-[#a0aec0]">
                        {selectedPageIds.size} selected
                      </span>
                    </div>

                    <div className="max-h-[220px] overflow-y-auto border border-[#eef1f5] rounded-[10px] p-2 space-y-1.5">
                      {activeAccount.pages
                        .filter(p => p.name.toLowerCase().includes(pageSearch.toLowerCase()) || p.page_id.includes(pageSearch))
                        .map((page) => (
                          <label
                            key={page.id}
                            className="flex items-center gap-3 p-2.5 border border-[#eef1f5] rounded-[8px] hover:bg-[#f4f6fa] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPageIds.has(page.id)}
                              onChange={(e) => {
                                const next = new Set(selectedPageIds);
                                if (e.target.checked) next.add(page.id);
                                else next.delete(page.id);
                                setSelectedPageIds(next);
                              }}
                              className="accent-[#1877f2] w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <div className="font-semibold text-sm text-[#1a1a2e]">{page.name}</div>
                              <div className="text-xs text-[#a0aec0] font-mono">{page.page_id}</div>
                            </div>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={handleGoStep2}
                    className="w-full py-2.5 bg-[#1877f2] text-white rounded-[10px] text-sm font-semibold hover:bg-[#166fe5] transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Set Source per page (Ek-ek vs Bulk Paste) */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                {/* Mode switch */}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setSrcMode('each')}
                    className={`flex-1 py-2.5 text-center rounded-[10px] text-[13px] font-semibold border transition-all ${
                      srcMode === 'each'
                        ? 'bg-[#e7f1ff] border-[#1877f2] text-[#1877f2]'
                        : 'bg-white border-[#e2e8f0] text-[#4a5568]'
                    }`}
                  >
                    📝 Ek-ek
                  </button>
                  <button
                    onClick={() => setSrcMode('bulk')}
                    className={`flex-1 py-2.5 text-center rounded-[10px] text-[13px] font-semibold border transition-all ${
                      srcMode === 'bulk'
                        ? 'bg-[#e7f1ff] border-[#1877f2] text-[#1877f2]'
                        : 'bg-white border-[#e2e8f0] text-[#4a5568]'
                    }`}
                  >
                    ⚡ Bulk Paste
                  </button>
                </div>

                {/* EK-EK MODE */}
                {srcMode === 'each' && (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    <p className="text-[13px] text-[#718096]">Har page ka source channel set karein:</p>
                    {picked.map((p, i) => (
                      <div key={p.page_id} className="border border-[#eef1f5] rounded-[10px] p-3.5 space-y-2">
                        <div className="font-bold text-sm text-[#1a1a2e]">📄 {p.name}</div>
                        <div className="flex gap-2">
                          <select
                            value={p.platform}
                            onChange={(e) => {
                              const updated = [...picked];
                              updated[i].platform = e.target.value as any;
                              setPicked(updated);
                            }}
                            className="w-[120px] p-2.5 border border-[#e2e8f0] rounded-[10px] text-[13px] bg-white font-medium"
                          >
                            <option value="youtube">YouTube</option>
                            <option value="tiktok">TikTok</option>
                            <option value="instagram">Instagram</option>
                            <option value="facebook">Facebook</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Source profile/page URL or @handle"
                            value={p.source}
                            onChange={(e) => {
                              const updated = [...picked];
                              updated[i].source = e.target.value;
                              setPicked(updated);
                            }}
                            className="flex-1 p-2.5 border border-[#e2e8f0] rounded-[10px] text-[13px] bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* BULK PASTE MODE */}
                {srcMode === 'bulk' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <label className="text-[13px] font-semibold text-[#4a5568] whitespace-nowrap">
                        Platform (sab links ke liye):
                      </label>
                      <select
                        value={bulkPlatform}
                        onChange={(e) => setBulkPlatform(e.target.value as any)}
                        className="p-2 border border-[#e2e8f0] rounded-[10px] text-[13px] bg-white font-medium"
                      >
                        <option value="youtube">YouTube</option>
                        <option value="tiktok">TikTok</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                      </select>
                    </div>

                    <label className="text-[13px] font-semibold text-[#4a5568] block">
                      Saare links paste karein (ek line pe ek):
                    </label>
                    <textarea
                      rows={5}
                      placeholder={`https://www.tiktok.com/@channel1\nhttps://www.instagram.com/profile/reels/\nhttps://www.youtube.com/@PakClipsOfficial`}
                      value={bulkLinksText}
                      onChange={(e) => setBulkLinksText(e.target.value)}
                      className="w-full p-2.5 border border-[#e2e8f0] rounded-[10px] text-xs font-mono bg-white resize-y"
                    />

                    <button
                      onClick={handleMatchBulk}
                      className="px-4 py-2 bg-[#8b5cf6] text-white rounded-[10px] text-xs font-semibold hover:bg-[#7c3aed] transition-colors"
                    >
                      🔗 Match karo
                    </button>

                    {showBulkMap && (
                      <div className="mt-3 space-y-2 max-h-[160px] overflow-y-auto">
                        <label className="text-xs font-semibold text-[#4a5568] block">
                          Preview — galat ho to box mein theek karein:
                        </label>
                        {picked.map((p, i) => (
                          <div key={p.page_id} className="flex items-center gap-2.5 border border-[#eef1f5] rounded-[10px] p-2 text-xs">
                            <span className="font-semibold w-[140px] truncate">📄 {p.name}</span>
                            <span className="text-[#a0aec0]">←</span>
                            <input
                              type="text"
                              value={p.source}
                              placeholder="(koi link nahi)"
                              onChange={(e) => {
                                const updated = [...picked];
                                updated[i].source = e.target.value;
                                setPicked(updated);
                              }}
                              className={`flex-1 p-1.5 border rounded-[8px] text-xs ${
                                !p.source ? 'border-[#e74c3c] bg-[#fdeaea]' : 'border-[#e2e8f0]'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="flex-1 py-2.5 border border-[#e2e8f0] rounded-[10px] text-sm font-semibold text-[#4a5568] hover:bg-slate-50 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleGoStep3}
                    className="flex-1 py-2.5 bg-[#1877f2] text-white rounded-[10px] text-sm font-semibold hover:bg-[#166fe5] transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Configure Posting Schedule */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <label className="text-[13px] font-semibold text-[#4a5568] block">
                  Schedule kaise set karein?
                </label>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setTimeMode('same')}
                    className={`flex-1 py-2.5 text-center rounded-[10px] text-[13px] font-semibold border transition-all ${
                      timeMode === 'same'
                        ? 'bg-[#e7f1ff] border-[#1877f2] text-[#1877f2]'
                        : 'bg-white border-[#e2e8f0] text-[#4a5568]'
                    }`}
                  >
                    ⏰ Same for all
                  </button>
                  <button
                    onClick={() => setTimeMode('each')}
                    className={`flex-1 py-2.5 text-center rounded-[10px] text-[13px] font-semibold border transition-all ${
                      timeMode === 'each'
                        ? 'bg-[#e7f1ff] border-[#1877f2] text-[#1877f2]'
                        : 'bg-white border-[#e2e8f0] text-[#4a5568]'
                    }`}
                  >
                    📋 Per-page alag
                  </button>
                </div>

                {timeMode === 'same' ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleUseSuggested}
                      className="px-3.5 py-2 bg-[#16a085] text-white rounded-[9px] text-xs font-semibold hover:bg-[#138d75] transition-colors cursor-pointer"
                    >
                      📌 Suggested times use karo (12:00, 15:00, 18:00, 21:00)
                    </button>

                    <div>
                      <label className="text-[13px] font-semibold text-[#4a5568] block mb-1.5">
                        Posts Per Day (kitni post roz?)
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => (
                          <button
                            key={k}
                            onClick={() => handleSetSameCount(k)}
                            className={`p-2 border rounded-[10px] text-center cursor-pointer transition-colors ${
                              sameCount === k
                                ? 'bg-[#e7f1ff] border-[#1877f2]'
                                : 'bg-white border-[#e2e8f0] hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-base font-extrabold text-[#1877f2] font-mono">{k}</div>
                            <div className="text-[9px] uppercase font-bold text-[#a0aec0]">
                              {k === 1 ? 'post' : 'posts'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[13px] font-semibold text-[#4a5568] block mb-1.5">
                        Times (har post ka time)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: sameCount }).map((_, idx) => (
                          <input
                            key={idx}
                            type="time"
                            value={sameTimes[idx] || ''}
                            onChange={(e) => {
                              const updated = [...sameTimes];
                              updated[idx] = e.target.value;
                              setSameTimes(updated);
                            }}
                            className="w-[110px] p-2 border border-[#e2e8f0] rounded-[8px] text-[13px] bg-white font-mono"
                          />
                        ))}
                      </div>
                      <div className="text-xs text-[#a0aec0] mt-1.5">
                        ⏰ Apni marzi se har post ka time daalein (24h format). Har channel ko +3-5 min auto-spread kiya jayega taake Facebook spam flag na kare.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                    {picked.map((p, i) => (
                      <div key={p.page_id} className="border border-[#eef1f5] rounded-[10px] p-3 space-y-2">
                        <div className="font-bold text-sm text-[#1a1a2e]">📄 {p.name}</div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {[1, 2, 3, 4, 5, 6].map((k) => (
                            <button
                              key={k}
                              onClick={() => {
                                const updated = [...picked];
                                updated[i].count = k;
                                const curTimes = updated[i].times || [];
                                while (curTimes.length < k) curTimes.push('12:00');
                                updated[i].times = curTimes.slice(0, k);
                                setPicked(updated);
                              }}
                              className={`p-1.5 border rounded-[8px] text-center ${
                                p.count === k ? 'bg-[#e7f1ff] border-[#1877f2]' : 'bg-white border-[#e2e8f0]'
                              }`}
                            >
                              <div className="text-xs font-bold text-[#1877f2]">{k}</div>
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {Array.from({ length: p.count }).map((_, timeIdx) => (
                            <input
                              key={timeIdx}
                              type="time"
                              value={p.times[timeIdx] || ''}
                              onChange={(e) => {
                                const updated = [...picked];
                                if (!updated[i].times) updated[i].times = [];
                                updated[i].times[timeIdx] = e.target.value;
                                setPicked(updated);
                              }}
                              className="w-[100px] p-1.5 border border-[#e2e8f0] rounded-[8px] text-xs font-mono"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="flex-1 py-2.5 border border-[#e2e8f0] rounded-[10px] text-sm font-semibold text-[#4a5568] hover:bg-slate-50 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSubmitWizard}
                    className="flex-1 py-2.5 bg-[#1877f2] text-white rounded-[10px] text-sm font-semibold hover:bg-[#166fe5] transition-colors"
                  >
                    ✅ Create Selected Pages
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCHEDULE & TIMING SETTINGS MODAL */}
      {scheduleModalCard && (
        <div
          className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6 backdrop-blur-xs"
          onClick={handleCloseScheduleModal}
        >
          <div
            className="bg-white rounded-[18px] p-6 max-w-[620px] w-full relative shadow-2xl my-auto border border-[#e8ebf0] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseScheduleModal}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#f4f6fa] hover:bg-[#e2e8f0] text-slate-500 font-bold flex items-center justify-center transition-colors cursor-pointer text-lg"
              title="Close modal"
            >
              ×
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">⏰</span>
              <div>
                <h2 className="text-xl font-bold text-[#1a1a2e]">Schedule & Timing Settings</h2>
                <div className="text-xs text-[#718096] flex items-center gap-2 mt-0.5">
                  <span className="font-semibold text-[#0E2A2F]">{scheduleModalCard.pageName}</span>
                  <span>•</span>
                  <span className="font-mono">{scheduleModalCard.fbPageId}</span>
                </div>
              </div>
            </div>

            {/* Current Summary Pill */}
            <div className="bg-[#f8fafc] border border-[#edf2f7] rounded-[12px] p-3 my-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                  schedStatus === 'active' ? 'bg-[#e6f7ed] text-[#2e9e5b]' : 'bg-[#fdeaea] text-[#e74c3c]'
                }`}>
                  ● {schedStatus}
                </span>
                <span className="text-xs text-[#718096]">
                  R2 Buffer: <b className="font-mono text-[#0E2A2F]">{scheduleModalCard.bufferVideosCount}/{schedBufferTarget} ready</b>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSchedStatus(prev => prev === 'active' ? 'paused' : 'active')}
                className="text-xs font-bold text-[#1877f2] hover:underline cursor-pointer"
              >
                {schedStatus === 'active' ? '⏸ Click to Pause' : '▶ Click to Activate'}
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* SECTION 1: Daily Posts Frequency */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#718096]">
                    1. Daily Posting Frequency (Posts per day)
                  </label>
                  <span className="text-xs font-mono font-bold text-[#1877f2]">
                    {schedPostsCount} posts har roz
                  </span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => handleSetSchedPostsCount(cnt)}
                      className={`py-2 px-1 rounded-[9px] border text-center transition-all cursor-pointer ${
                        schedPostsCount === cnt
                          ? 'bg-[#1877f2] text-white border-[#1877f2] font-extrabold shadow-xs'
                          : 'bg-white text-[#4a5568] border-[#e2e8f0] hover:bg-slate-50 font-bold'
                      }`}
                    >
                      <div className="text-sm font-mono leading-none">{cnt}</div>
                      <div className="text-[9px] uppercase mt-0.5 opacity-80">post</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: Exact Post Timing Slots */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#718096]">
                    2. Posting Time Slots (24h PKT Format)
                  </label>
                  <span className="text-xs text-[#a0aec0]">Exact posting time</span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSchedPostsCount(4);
                      setSchedTimes(['12:00', '15:00', '18:00', '21:00']);
                    }}
                    className="text-xs bg-[#e7f1ff] hover:bg-[#d8e9ff] text-[#1877f2] font-semibold px-2.5 py-1 rounded-[7px] border border-[#c6deff] transition-colors cursor-pointer"
                  >
                    📌 Suggested Peak (12, 15, 18, 21)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSchedPostsCount(4);
                      setSchedTimes(['09:00', '13:00', '17:00', '21:00']);
                    }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-[7px] border border-slate-200 transition-colors cursor-pointer"
                  >
                    🌅 Morning to Night
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSchedPostsCount(4);
                      setSchedTimes(['17:00', '19:30', '21:45', '23:30']);
                    }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded-[7px] border border-slate-200 transition-colors cursor-pointer"
                  >
                    🌙 Evening Peak
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetSchedPostsCount(schedPostsCount)}
                    className="text-xs bg-[#16a085]/10 hover:bg-[#16a085]/20 text-[#16a085] font-semibold px-2.5 py-1 rounded-[7px] border border-[#16a085]/30 transition-colors cursor-pointer"
                  >
                    ⚡ Auto Spread Evenly
                  </button>
                </div>

                {/* Time Inputs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#f8fafc] border border-[#edf2f7] rounded-[12px] p-3">
                  {schedTimes.map((timeVal, idx) => (
                    <div key={idx} className="bg-white border border-[#e2e8f0] rounded-[8px] p-1.5 px-2 flex items-center justify-between gap-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-[#a0aec0] font-mono">#{idx + 1}</span>
                        <input
                          type="time"
                          value={timeVal}
                          onChange={(e) => {
                            const updated = [...schedTimes];
                            updated[idx] = e.target.value;
                            setSchedTimes(updated);
                          }}
                          className="w-full text-xs font-mono font-bold text-[#0E2A2F] outline-none bg-transparent cursor-pointer"
                        />
                      </div>
                      {schedTimes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSchedTimeSlot(idx)}
                          className="text-[#e74c3c] hover:bg-red-50 w-5 h-5 rounded flex items-center justify-center text-xs font-bold cursor-pointer"
                          title="Remove this slot"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddSchedTimeSlot}
                    className="border border-dashed border-[#1877f2] hover:bg-[#e7f1ff] text-[#1877f2] rounded-[8px] p-1.5 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>＋</span>
                    <span>Add Slot</span>
                  </button>
                </div>
              </div>

              {/* SECTION 3: Source Channel / URL */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#718096] block mb-1.5">
                  3. Source Channel & Platform
                </label>
                <div className="flex gap-2">
                  <select
                    value={schedPlatform}
                    onChange={(e) => setSchedPlatform(e.target.value as any)}
                    className="w-32 p-2.5 border border-[#e2e8f0] rounded-[10px] text-xs font-bold bg-white text-[#0E2A2F] outline-none cursor-pointer"
                  >
                    <option value="tiktok">TikTok</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>

                  <input
                    type="text"
                    value={schedSource}
                    onChange={(e) => setSchedSource(e.target.value)}
                    placeholder="https://tiktok.com/@channel or @handle"
                    className="flex-1 p-2.5 border border-[#e2e8f0] rounded-[10px] text-xs bg-white text-[#0E2A2F] outline-none font-mono focus:border-[#1877f2]"
                  />
                </div>
              </div>

              {/* SECTION 4: Anti-Spam & Buffer Security */}
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-[12px] p-3 text-xs text-[#166534] space-y-2">
                <label className="flex items-start gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={schedAntiSpamJitter}
                    onChange={(e) => setSchedAntiSpamJitter(e.target.checked)}
                    className="mt-0.5 rounded text-[#1877f2]"
                  />
                  <span>
                    <b>🛡️ Anti-Spam Random Delay (+3 to 5 mins):</b> Facebook algorithm se safe rehne ke liye exact min ke bajaye random spread karein.
                  </span>
                </label>

                <div className="flex items-center justify-between pt-1 border-t border-[#bbf7d0]/60 text-[11px] text-[#15803d]">
                  <span>5-Day Strict Buffer Target:</span>
                  <span className="font-mono font-bold">{schedPostsCount * 5} videos required (20 max)</span>
                </div>
              </div>
            </div>

            {/* Live Dispatch Feedback Box */}
            {testPostStep !== 'idle' && (
              <div className={`p-3 rounded-[12px] text-xs border my-3 ${
                testPostStep === 'done'
                  ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]'
                  : 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]'
              }`}>
                <div className="font-bold text-sm mb-1 flex items-center gap-1.5">
                  {testPostStep === 'fetching' && '⏳ Step 1: Downloading video from TikTok buffer...'}
                  {testPostStep === 'uploading' && `⏳ Step 2: Publishing Reel to Facebook (${scheduleModalCard.pageName})...`}
                  {testPostStep === 'done' && '🎉 Mubarak! Video Facebook Page par successfully post ho gayi!'}
                </div>
                <div className="text-[11px] leading-relaxed">
                  {testPostStep === 'fetching' && `Source: ${schedSource || scheduleModalCard.source} se video R2 buffer me fetch ho rahi hai...`}
                  {testPostStep === 'uploading' && `Facebook Graph API Reel endpoint par upload in progress (Page ID: ${scheduleModalCard.fbPageId})...`}
                  {testPostStep === 'done' && `Post published! Posted count +1, R2 Buffer: ${Math.max(0, scheduleModalCard.bufferVideosCount - 1)}/${schedBufferTarget} ready.`}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-4 mt-4 border-t border-[#edf2f7]">
              <button
                type="button"
                disabled={testPostStep !== 'idle'}
                onClick={handleTestPostInsideModal}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-[10px] text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  testPostStep === 'fetching' ? 'bg-blue-50 text-blue-700 border-blue-300 animate-pulse' :
                  testPostStep === 'uploading' ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse' :
                  testPostStep === 'done' ? 'bg-[#10b981] text-white border-[#059669]' :
                  'text-[#2e9e5b] bg-[#e6f7ed] hover:bg-[#d5f3e1] border-[#2e9e5b]'
                }`}
              >
                <span>{testPostStep === 'done' ? '✅' : '🚀'}</span>
                <span>
                  {testPostStep === 'fetching' && '⏳ 1/3: Video Fetching...'}
                  {testPostStep === 'uploading' && '⏳ 2/3: Uploading to FB...'}
                  {testPostStep === 'done' && 'Post Ho Gayi!'}
                  {testPostStep === 'idle' && 'Test Post Now'}
                </span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCloseScheduleModal}
                  className="flex-1 sm:flex-none px-4 py-2.5 border border-[#e2e8f0] rounded-[10px] text-xs font-bold text-[#4a5568] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-[10px] text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>💾</span>
                  <span>Save Schedule Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
