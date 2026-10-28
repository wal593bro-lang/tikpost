import { useState } from 'react';
import type { ScheduledJob, FBAccount } from '../types.ts';

interface ManualUploadViewProps {
  initialTab?: 'compose' | 'queue' | 'history' | 'logs';
  jobs: ScheduledJob[];
  setJobs: React.Dispatch<React.SetStateAction<ScheduledJob[]>>;
  accounts: FBAccount[];
  showToast: (msg: string) => void;
}

export default function ManualUploadView({
  initialTab = 'compose',
  jobs,
  setJobs,
  accounts,
  showToast
}: ManualUploadViewProps) {
  const [tab, setTab] = useState<'compose' | 'queue' | 'history' | 'logs'>(initialTab);

  // Compose State
  const allPages = accounts.flatMap(a => a.pages);
  const [selectedPageId, setSelectedPageId] = useState<string>(allPages[0]?.page_id || '');
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [fileName, setFileName] = useState('pakistan_update_reel.mp4');
  const [postMode, setPostMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState('2026-03-19T18:00');

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPage = allPages.find(p => p.page_id === selectedPageId) || allPages[0];

    const newJob: ScheduledJob = {
      id: 'job-' + Date.now(),
      pageName: targetPage?.name || 'Selected Page',
      pageId: selectedPageId,
      filename: fileName,
      mediaType,
      caption,
      status: postMode === 'now' ? 'posted' : 'pending',
      scheduledTime: postMode === 'now' ? 'Just now' : new Date(scheduledDate).toLocaleString(),
      postUrl: postMode === 'now' ? `https://facebook.com/${selectedPageId}/posts/${Date.now()}` : undefined
    };

    setJobs(prev => [newJob, ...prev]);
    showToast(postMode === 'now' ? '🚀 Post published to Facebook page!' : '🗓️ Post scheduled successfully in queue.');
    setCaption('');
  };

  const handleCancelJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    showToast('Scheduled post removed from queue');
  };

  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const historyJobs = jobs.filter(j => j.status === 'posted' || j.status === 'failed');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[14px] p-6 border border-[#e8ebf0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>📤</span>
            <span>Manual Upload & Management</span>
          </h1>
          <p className="text-sm text-[#718096] mt-1">
            Publish manual videos/photos, inspect automated queue, and check publish logs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#f4f6fa] p-1 rounded-[10px] border border-[#e2e8f0]">
          {(['compose', 'queue', 'history', 'logs'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-[8px] capitalize transition-all cursor-pointer ${
                tab === t
                  ? 'bg-white text-[#1877f2] shadow-xs'
                  : 'text-[#718096] hover:text-[#1a1a2e]'
              }`}
            >
              {t === 'compose' ? '✏️ Compose' :
               t === 'queue' ? `🗓️ Queue (${pendingJobs.length})` :
               t === 'history' ? '📜 History' : '🐞 Logs'}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: COMPOSE */}
      {tab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[14px] p-6 border border-[#e8ebf0]">
            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#4a5568] block mb-1">Target Facebook Page</label>
                <select
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="w-full p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] bg-white font-medium"
                >
                  {allPages.map(p => (
                    <option key={p.page_id} value={p.page_id}>
                      📄 {p.name} ({p.page_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#4a5568] block mb-1">Media Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setMediaType('video'); setFileName('parliament_update.mp4'); }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-[8px] border transition-all ${
                      mediaType === 'video' ? 'bg-[#e7f1ff] border-[#1877f2] text-[#1877f2]' : 'bg-white border-[#e2e8f0]'
                    }`}
                  >
                    🎬 Video (Reel / Watch)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMediaType('image'); setFileName('infographic_card.jpg'); }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-[8px] border transition-all ${
                      mediaType === 'image' ? 'bg-[#e7f1ff] border-[#1877f2] text-[#1877f2]' : 'bg-white border-[#e2e8f0]'
                    }`}
                  >
                    🖼️ Photo / Infographic
                  </button>
                </div>
              </div>

              <div className="p-4 border-2 border-dashed border-[#e2e8f0] rounded-[12px] bg-[#f8fafc] text-center">
                <div className="text-2xl mb-1">{mediaType === 'video' ? '📹' : '🖼️'}</div>
                <div className="text-xs font-semibold text-[#1a1a2e]">{fileName}</div>
                <div className="text-[11px] text-[#a0aec0] mt-0.5">Ready for upload (AES encrypted stream)</div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#4a5568] block mb-1">Post Caption / Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Apni post ka caption likhein..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full p-3 text-sm border border-[#e2e8f0] rounded-[10px] focus:outline-none focus:border-[#1877f2] bg-white resize-y"
                />

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['#PakistanNews', '#ViralReels', '#BreakingUpdate', '#DailyShorts', '#TrendingNow'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setCaption(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + tag)}
                      className="text-[11px] bg-[#f0f6ff] text-[#1877f2] px-2 py-0.5 rounded font-medium hover:bg-[#e7f1ff]"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#4a5568] block mb-1">Publish Timing</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setPostMode('now')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-[8px] border ${
                      postMode === 'now' ? 'bg-[#e7f1ff] border-[#1877f2] text-[#1877f2]' : 'bg-white border-[#e2e8f0]'
                    }`}
                  >
                    ⚡ Publish Immediately
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostMode('schedule')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-[8px] border ${
                      postMode === 'schedule' ? 'bg-[#e7f1ff] border-[#1877f2] text-[#1877f2]' : 'bg-white border-[#e2e8f0]'
                    }`}
                  >
                    🗓️ Schedule For Later
                  </button>
                </div>

                {postMode === 'schedule' && (
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-2.5 border border-[#e2e8f0] rounded-[10px] text-xs font-mono bg-white"
                  />
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#1877f2] text-white rounded-[10px] text-sm font-semibold hover:bg-[#166fe5] transition-colors"
              >
                {postMode === 'now' ? '🚀 Post to Facebook Now' : '🗓️ Add to Schedule Queue'}
              </button>
            </form>
          </div>

          {/* Facebook Post Preview Card */}
          <div className="bg-white rounded-[14px] p-6 border border-[#e8ebf0] space-y-4">
            <h3 className="text-xs font-bold text-[#a0aec0] uppercase tracking-wider">Live Facebook Feed Preview</h3>
            
            <div className="border border-[#e2e8f0] rounded-[12px] p-4 bg-white shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#1877f2] text-white flex items-center justify-center font-bold text-xs">
                  FB
                </div>
                <div>
                  <div className="text-xs font-bold text-[#1a1a2e]">
                    {allPages.find(p => p.page_id === selectedPageId)?.name || 'Selected Facebook Page'}
                  </div>
                  <div className="text-[10px] text-[#a0aec0]">Just now · 🌍 Public</div>
                </div>
              </div>

              <div className="text-xs text-[#2d3748] whitespace-pre-wrap min-h-[40px]">
                {caption || 'Your caption and hashtags will appear here in the preview.'}
              </div>

              <div className="h-44 bg-slate-900 rounded-[8px] flex items-center justify-center text-white text-xs font-medium">
                {mediaType === 'video' ? '▶ Video Player Preview' : '🖼️ Photo Preview'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUEUE */}
      {tab === 'queue' && (
        <div className="bg-white rounded-[14px] p-6 border border-[#e8ebf0] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1a1a2e]">Scheduled Queue ({pendingJobs.length})</h2>
            <span className="text-xs text-[#a0aec0]">Jobs are checked every 20 seconds</span>
          </div>

          {pendingJobs.length === 0 ? (
            <div className="text-center py-10 text-[#a0aec0] text-sm">
              Queue khali hai. Koi pending scheduled post nahi hai.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingJobs.map(job => (
                <div key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-[#eef1f5] rounded-[10px] hover:bg-slate-50/70">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#1a1a2e]">📄 {job.pageName}</div>
                    <div className="text-xs text-[#718096] truncate mt-0.5">{job.caption}</div>
                    <div className="flex items-center gap-2 text-xs text-[#a0aec0] mt-1 font-mono">
                      <span>{job.filename}</span>
                      <span>·</span>
                      <span className="text-[#1877f2] font-semibold">{job.scheduledTime}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#fef5e7] text-[#f39c12]">
                      Pending
                    </span>
                    <button
                      onClick={() => handleCancelJob(job.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#e74c3c] border border-[#e2e8f0] rounded-[8px] hover:bg-rose-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORY */}
      {tab === 'history' && (
        <div className="bg-white rounded-[14px] p-6 border border-[#e8ebf0] space-y-4">
          <h2 className="text-base font-bold text-[#1a1a2e]">Published & Completed Posts</h2>
          <div className="space-y-3">
            {historyJobs.map(job => (
              <div key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-[#eef1f5] rounded-[10px]">
                <div>
                  <div className="font-semibold text-sm text-[#1a1a2e]">📄 {job.pageName}</div>
                  <div className="text-xs text-[#718096] mt-0.5">{job.caption}</div>
                  <div className="text-[11px] text-[#a0aec0] mt-1 font-mono">{job.scheduledTime}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#e6f7ed] text-[#2e9e5b]">
                    Posted
                  </span>
                  {job.postUrl && (
                    <a
                      href={job.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#1877f2] font-semibold hover:underline"
                    >
                      View on Facebook →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LOGS */}
      {tab === 'logs' && (
        <div className="bg-white rounded-[14px] p-6 border border-[#e8ebf0] space-y-3">
          <h2 className="text-base font-bold text-[#1a1a2e]">Server Execution & Graph API Logs</h2>
          <div className="bg-slate-900 rounded-[10px] p-4 font-mono text-xs text-slate-200 space-y-2 max-h-[350px] overflow-y-auto">
            <div><span className="text-slate-400">[2026-03-18 10:04:12]</span> <span className="text-emerald-400">INFO</span> PostFlow daemon started on port 3000.</div>
            <div><span className="text-slate-400">[2026-03-18 10:04:15]</span> <span className="text-blue-400">AUTH</span> AES-256-GCM master key verified from data/.key</div>
            <div><span className="text-slate-400">[2026-03-18 10:05:01]</span> <span className="text-emerald-400">CRON</span> Source tick completed for 13 idle and 3 active pages.</div>
            <div><span className="text-slate-400">[2026-03-18 10:09:44]</span> <span className="text-emerald-400">FB_GRAPH</span> Page token valid for Pakistan Politics Official (expires in 58 days).</div>
            <div><span className="text-slate-400">[2026-03-18 10:14:22]</span> <span className="text-amber-400">WARN</span> Prime Headlines Daily reached temporary Meta rate limit threshold. Automatic backoff applied.</div>
          </div>
        </div>
      )}
    </div>
  );
}
