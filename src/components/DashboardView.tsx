import { useState, useMemo } from 'react';
import type { AutomationItem, IdlePageItem, FBAccount } from '../types.ts';

interface DashboardViewProps {
  automations: AutomationItem[];
  idlePages: IdlePageItem[];
  accounts: FBAccount[];
  onNavigate: (page: any) => void;
}

export default function DashboardView({ automations, idlePages, accounts, onNavigate }: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newPageName, setNewPageName] = useState('');
  const [newPageId, setNewPageId] = useState('');

  // Active pages and statistics
  const totalConnectedPages = accounts.reduce((acc, a) => acc + (a.pages?.length || 0), 0);
  const activePipelines = automations.filter(a => a.status === 'active');
  const totalPublishedToday = automations.reduce((acc, curr) => acc + curr.postedCount, 0);
  const totalInQueue = automations.reduce((acc, curr) => acc + curr.queuedCount, 0);
  const bufferHealth = automations.length > 0 ? '92%' : '0%';
  const successRate = '100%';

  // Activity log items
  const [activityLogs, setActivityLogs] = useState([
    {
      id: 'act-1',
      pageName: 'Cute Souls',
      caption: 'So cute baby cat playing with butterflies 🐱✨ #animals #catsoftiktok',
      targetTime: 'Today at 12:00 PM',
      status: 'Published',
      bufferType: 'Cloudflare R2 (TikTok sync)',
      link: 'https://facebook.com'
    },
    {
      id: 'act-2',
      pageName: 'Tech Daily Bites',
      caption: 'Top 5 AI tools released this week that change productivity! 🚀 #tech #ai',
      targetTime: 'Today at 15:00 PM',
      status: 'In Queue',
      bufferType: 'Cloudflare R2 (YT Shorts)',
      link: '#'
    },
    {
      id: 'act-3',
      pageName: 'Cute Souls',
      caption: 'Heartwarming rescue story that will make your day! ❤️🐾',
      targetTime: 'Today at 18:00 PM',
      status: 'Scheduled',
      bufferType: 'R2 Buffered Queue',
      link: '#'
    }
  ]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return activityLogs;
    const q = searchQuery.toLowerCase();
    return activityLogs.filter(
      log => log.pageName.toLowerCase().includes(q) || log.caption.toLowerCase().includes(q)
    );
  }, [activityLogs, searchQuery]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  };

  const handleConnectPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) return;
    setIsConnectModalOpen(false);
    onNavigate('accounts');
  };

  return (
    <div className="space-y-6 max-w-[1250px] mx-auto pb-12">
      {/* Header Title & Action Buttons matching user screenshot */}
      <div className="bg-white rounded-[14px] p-6 border border-[#D8E0E5] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-[10px] bg-[#1877F2] text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-xs">
            📘
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0E2A2F] tracking-tight">
              Facebook Automation Dashboard
            </h1>
            <p className="text-[13px] text-[#5B6B73] mt-0.5">
              Apne connected Facebook Pages, automated downloaders aur posting pipelines manage karein.
            </p>
          </div>
        </div>

        {/* Top Action Buttons matching user screenshot */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('accounts')}
            className="px-4 py-2 rounded-[9px] text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166FE5] transition-all cursor-pointer shadow-xs flex items-center gap-2"
          >
            <span>+</span>
            <span>Connect Facebook Page</span>
          </button>

          <button
            onClick={() => onNavigate('auto-upload')}
            className="px-4 py-2 rounded-[9px] text-xs font-bold text-[#0E2A2F] bg-[#F2F5F7] hover:bg-[#E4E9EC] border border-[#D8E0E5] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-[#1877F2]">⬇️</span>
            <span>Auto Download & Upload</span>
          </button>

          <button
            onClick={() => onNavigate('schedule')}
            className="px-4 py-2 rounded-[9px] text-xs font-bold text-[#0E2A2F] bg-[#F2F5F7] hover:bg-[#E4E9EC] border border-[#D8E0E5] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>📅</span>
            <span>Schedule</span>
          </button>

          <button
            onClick={() => onNavigate('download-post')}
            className="px-4 py-2 rounded-[9px] text-xs font-bold text-[#0E2A2F] bg-[#F2F5F7] hover:bg-[#E4E9EC] border border-[#D8E0E5] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>🚀</span>
            <span>Post Now</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (CONNECTED PAGES, PUBLISHED TODAY, ACTIVE PIPELINES, IN QUEUE, BUFFER HEALTH, SUCCESS RATE) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white rounded-[12px] p-4 border border-[#D8E0E5] shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#73828A]">
            Connected Pages
          </div>
          <div className="text-2xl font-black text-[#0E2A2F] mt-1 font-mono">
            {totalConnectedPages}
          </div>
        </div>

        <div className="bg-white rounded-[12px] p-4 border border-[#D8E0E5] shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#73828A]">
            Published Today
          </div>
          <div className="text-2xl font-black text-[#2e9e5b] mt-1 font-mono">
            {totalPublishedToday}
          </div>
        </div>

        <div className="bg-white rounded-[12px] p-4 border border-[#D8E0E5] shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#73828A]">
            Active Pipelines
          </div>
          <div className="text-2xl font-black text-[#1877F2] mt-1 font-mono">
            {activePipelines.length}
          </div>
        </div>

        <div className="bg-white rounded-[12px] p-4 border border-[#D8E0E5] shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#73828A]">
            In Queue
          </div>
          <div className="text-2xl font-black text-[#F7C948] mt-1 font-mono">
            {totalInQueue}
          </div>
        </div>

        <div className="bg-white rounded-[12px] p-4 border border-[#D8E0E5] shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#73828A]">
            Buffer Health
          </div>
          <div className="text-2xl font-black text-[#0E2A2F] mt-1 font-mono">
            {automations.length > 0 ? '94%' : '0%'}
          </div>
        </div>

        <div className="bg-white rounded-[12px] p-4 border border-[#D8E0E5] shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#73828A]">
            Success Rate
          </div>
          <div className="text-2xl font-black text-[#1877F2] mt-1 font-mono">
            {successRate}
          </div>
        </div>
      </div>

      {/* SECTION: Active Facebook Pages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📄</span>
            <h2 className="text-base font-bold text-[#0E2A2F]">Active Facebook Pages</h2>
          </div>
          <button
            onClick={() => onNavigate('auto-upload')}
            className="px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[#0E2A2F] bg-white border border-[#D8E0E5] hover:bg-[#F2F5F7] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Add New Page</span>
          </button>
        </div>

        {automations.length === 0 ? (
          /* Empty state exactly matching screenshot when 0 pages */
          <div className="bg-white rounded-[14px] p-12 border border-dashed border-[#C5D0D6] shadow-xs text-center">
            <div className="w-14 h-14 rounded-[12px] bg-[#1877F2] text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-sm">
              📘
            </div>
            <h3 className="text-base font-bold text-[#0E2A2F]">
              No Facebook Pages Connected Yet
            </h3>
            <p className="text-xs text-[#5B6B73] max-w-md mx-auto mt-1 mb-5 leading-relaxed">
              Connect your Facebook Page to start automated downloads, Cloudflare R2 buffering, and scheduled posting.
            </p>
            <button
              onClick={() => onNavigate('accounts')}
              className="px-4 py-2.5 rounded-[9px] text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166FE5] transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
            >
              <span>+</span>
              <span>Connect Your First Facebook Page</span>
            </button>
          </div>
        ) : (
          /* Active Facebook Pages Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {automations.map(auto => (
              <div
                key={auto.id}
                className="bg-white rounded-[14px] p-5 border border-[#D8E0E5] shadow-xs hover:border-[#1877F2]/40 transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#E7F1FF] text-[#1877F2] font-black flex items-center justify-center text-sm shadow-xs">
                      FB
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#0E2A2F]">{auto.pageName}</div>
                      <div className="text-[11px] text-[#73828A] font-mono">ID: {auto.fbPageId}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E6F7ED] text-[#2E9E5B] border border-[#C6ECD6]">
                    ● Active
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#F8FAFB] p-2.5 rounded-[10px] text-center border border-[#EDF2F4]">
                  <div>
                    <div className="text-[10px] font-bold text-[#73828A] uppercase">Source</div>
                    <div className="text-xs font-semibold text-[#0E2A2F] capitalize mt-0.5">{auto.platform}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#73828A] uppercase">Buffer</div>
                    <div className="text-xs font-bold text-[#1877F2] mt-0.5 font-mono">{auto.bufferVideosCount} clips</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#73828A] uppercase">Rate</div>
                    <div className="text-xs font-bold text-[#2E9E5B] mt-0.5 font-mono">{auto.postsPerDay}/day</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#EDF2F4] text-xs">
                  <span className="text-[#73828A] text-[11px]">Next: {auto.nextPostTime || 'Today at 18:00'}</span>
                  <button
                    onClick={() => onNavigate('auto-upload')}
                    className="font-bold text-[#1877F2] hover:underline cursor-pointer"
                  >
                    Manage Pipeline →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: Facebook Posting Activity & Details */}
      <div className="bg-white rounded-[14px] border border-[#D8E0E5] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#EDF2F4] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <span className="text-base">📄</span>
            <div>
              <h2 className="text-base font-bold text-[#0E2A2F]">
                Facebook Posting Activity & Details
              </h2>
              <p className="text-xs text-[#5B6B73]">
                Recent automated posts, queue status, and publish logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search page or post..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-[8px] border border-[#D8E0E5] bg-[#F8FAFB] focus:bg-white focus:outline-none focus:border-[#1877F2] w-52"
            />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-[8px] text-xs font-semibold text-[#0E2A2F] bg-white border border-[#D8E0E5] hover:bg-[#F2F5F7] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Table of activity */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFB] border-b border-[#EDF2F4] text-[#73828A] uppercase font-bold text-[10px] tracking-wider">
                <th className="py-3 px-5">Page Name</th>
                <th className="py-3 px-5">Post Content / Caption</th>
                <th className="py-3 px-5">Target Time</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Buffer Type</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF2F4]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-[#73828A]">
                    No Facebook posts yet. Go to{' '}
                    <button
                      onClick={() => onNavigate('download-post')}
                      className="text-[#1877F2] font-semibold underline cursor-pointer"
                    >
                      Post Now
                    </button>{' '}
                    or{' '}
                    <button
                      onClick={() => onNavigate('schedule')}
                      className="text-[#1877F2] font-semibold underline cursor-pointer"
                    >
                      Schedule
                    </button>{' '}
                    to create your first post.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#F9FBFC] transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[#0E2A2F] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#1877F2]" />
                        <span>{log.pageName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-[#334155] max-w-sm truncate font-medium">
                      {log.caption}
                    </td>
                    <td className="py-3.5 px-5 text-[#5B6B73] whitespace-nowrap font-mono text-[11px]">
                      {log.targetTime}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'Published'
                            ? 'bg-[#E6F7ED] text-[#2E9E5B] border border-[#C6ECD6]'
                            : log.status === 'In Queue'
                            ? 'bg-[#FFF8E6] text-[#B7791F] border border-[#FEEBC8]'
                            : 'bg-[#EBF5FB] text-[#2B6CB0] border border-[#BEE3F8]'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-[#5B6B73] whitespace-nowrap text-[11px]">
                      {log.bufferType}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onNavigate('auto-upload')}
                        className="text-[#1877F2] font-bold hover:underline cursor-pointer ml-auto"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
