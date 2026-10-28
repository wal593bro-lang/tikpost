import { useState } from 'react';
import type { AutomationItem, FBAccount } from '../types.ts';

interface ScheduleViewProps {
  automations: AutomationItem[];
  accounts?: FBAccount[];
  showToast: (msg: string) => void;
}

interface ScheduledItem {
  id: string;
  videoUrl: string;
  pageId: string;
  pageName: string;
  caption: string;
  time: string;
}

export default function ScheduleView({ automations, accounts = [], showToast }: ScheduleViewProps) {
  const allPages = accounts.flatMap(a => a.pages);
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedPageId, setSelectedPageId] = useState(allPages[0]?.page_id || '');
  const [caption, setCaption] = useState('');
  
  // Default datetime 1 hour ahead
  const defaultTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    return d.toISOString().slice(0, 16);
  };
  const [scheduledTime, setScheduledTime] = useState(defaultTime());

  const [queue, setQueue] = useState<ScheduledItem[]>([
    {
      id: 'q-1',
      videoUrl: 'https://www.tiktok.com/@daily_clips/video/71829104',
      pageId: '109849182749102',
      pageName: 'Pakistan Politics Official',
      caption: 'Breaking press conference analysis. #News #Pakistan',
      time: '2026-03-18 18:00'
    },
    {
      id: 'q-2',
      videoUrl: 'https://www.youtube.com/shorts/viral_reel_482',
      pageId: '102948192049183',
      pageName: 'Viral News Pulse',
      caption: 'Today’s top trending debate. #Trending',
      time: '2026-03-18 20:30'
    }
  ]);

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPage = allPages.find(p => p.page_id === selectedPageId) || { name: 'Connected Page' };

    const newItem: ScheduledItem = {
      id: 'q-' + Date.now(),
      videoUrl,
      pageId: selectedPageId,
      pageName: targetPage.name,
      caption,
      time: scheduledTime.replace('T', ' ')
    };

    setQueue(prev => [newItem, ...prev]);
    setVideoUrl('');
    setCaption('');
    showToast(`⏰ Post schedule ho gayi! Page: ${targetPage.name}`);
  };

  const handleCancel = (id: string) => {
    setQueue(prev => prev.filter(q => q.id !== id));
    showToast('Scheduled post cancelled');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Schedule Form Card matching user HTML */}
      <div className="bg-white rounded-[14px] p-7 border border-[#D8E0E5] shadow-xs">
        <h2 className="text-xl font-bold text-[#0E2A2F] mb-1 flex items-center gap-2">
          <span>⏰</span>
          <span>Schedule a Post</span>
        </h2>
        <div className="text-[13px] text-[#5B6B73] mb-5">
          Aage ki tareekh/waqt pe post set karein — tool khud post kar dega.
        </div>

        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#0E2A2F] block mb-1">
              Video URL (YouTube / TikTok / Reels)
            </label>
            <input
              type="url"
              required
              placeholder="https://www.tiktok.com/@user/video/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full p-2.5 text-xs border border-[#D8E0E5] rounded-[10px] focus:outline-none focus:border-[#0E2A2F] font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0E2A2F] block mb-1">
              Facebook Page
            </label>
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="w-full p-2.5 text-xs border border-[#D8E0E5] rounded-[10px] bg-white font-medium focus:outline-none focus:border-[#0E2A2F]"
            >
              {allPages.length === 0 ? (
                <option value="">Aap ke pages load ho rahe hain...</option>
              ) : (
                allPages.map(p => (
                  <option key={p.page_id} value={p.page_id}>
                    📄 {p.name} ({p.page_id})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0E2A2F] block mb-1">
              Caption (optional)
            </label>
            <input
              type="text"
              placeholder="Caption & Hashtags (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full p-2.5 text-xs border border-[#D8E0E5] rounded-[10px] focus:outline-none focus:border-[#0E2A2F]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0E2A2F] block mb-1">
              Post Karne Ki Date aur Time
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full p-2.5 text-xs border border-[#D8E0E5] rounded-[10px] font-mono focus:outline-none focus:border-[#0E2A2F]"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-[#42b72a] text-white text-xs font-bold rounded-[10px] hover:bg-[#36a420] transition-colors cursor-pointer"
          >
            ⏰ Schedule Post
          </button>
        </form>
      </div>

      {/* Queue Card */}
      <div className="bg-white rounded-[14px] p-6 border border-[#D8E0E5] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0E2A2F]">🗓️ Scheduled Posts Queue</h3>
          <span className="text-xs font-mono text-[#718096] bg-slate-100 px-2 py-0.5 rounded">
            {queue.length} posts
          </span>
        </div>

        <div className="space-y-2.5">
          {queue.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border border-[#eef1f5] rounded-[10px] gap-3 text-xs"
            >
              <div className="min-w-0">
                <div className="font-bold text-[#0E2A2F] truncate">📄 {item.pageName}</div>
                <div className="text-[#5B6B73] truncate mt-0.5">{item.caption || 'No caption'}</div>
                <div className="text-[#1877f2] font-mono mt-1 font-semibold">⏰ {item.time}</div>
              </div>

              <button
                onClick={() => handleCancel(item.id)}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md shrink-0 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
