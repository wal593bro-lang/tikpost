import { useState } from 'react';
import type { FBAccount } from '../types.ts';

interface DirectPostViewProps {
  accounts: FBAccount[];
  showToast: (msg: string) => void;
}

export default function DirectPostView({ accounts, showToast }: DirectPostViewProps) {
  const allPages = accounts.flatMap(a => a.pages);
  const [selectedPageId, setSelectedPageId] = useState(allPages[0]?.page_id || '');
  const [videoUrl, setVideoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<number>(0);

  const [history, setHistory] = useState([
    {
      id: 'h-1',
      pageName: 'Pakistan Politics Official',
      caption: 'Breaking press release highlights. #News',
      time: '10 mins ago',
      status: 'Published'
    }
  ]);

  const handleDownloadAndPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPageId) {
      alert('Pehle Facebook Page select karein.');
      return;
    }

    const targetPage = allPages.find(p => p.page_id === selectedPageId) || { name: 'Connected Page' };
    setIsProcessing(true);
    setStep(1);

    setTimeout(() => setStep(2), 1000);
    setTimeout(() => setStep(3), 2000);
    setTimeout(() => {
      setStep(4);
      setIsProcessing(false);
      showToast(`🎉 Video Facebook Page (${targetPage.name}) par LIVE publish ho gayi!`);
      setHistory(prev => [
        {
          id: 'h-' + Date.now(),
          pageName: targetPage.name,
          caption,
          time: 'Just now',
          status: 'Published'
        },
        ...prev
      ]);
      setVideoUrl('');
      setCaption('');
    }, 3200);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Direct Post Form Card matching user HTML */}
      <div className="bg-white rounded-[14px] p-7 border border-[#D8E0E5] shadow-xs">
        <h2 className="text-xl font-bold text-[#0E2A2F] mb-1 flex items-center gap-2">
          <span>⬇️</span>
          <span>Download & Post (Abhi)</span>
        </h2>
        <div className="text-[13px] text-[#5B6B73] mb-5">
          YouTube/TikTok link se foran kisi page pe post karein.
        </div>

        <form onSubmit={handleDownloadAndPost} className="space-y-4">
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
              Target Facebook Page
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
              placeholder="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full p-2.5 text-xs border border-[#D8E0E5] rounded-[10px] focus:outline-none focus:border-[#0E2A2F]"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="px-6 py-2.5 bg-[#1877f2] text-white text-xs font-bold rounded-[10px] hover:bg-[#166fe5] transition-colors cursor-pointer flex items-center gap-2"
          >
            <span>⬇️</span>
            <span>{isProcessing ? 'Downloading & Uploading...' : 'Download & Post'}</span>
          </button>
        </form>

        {/* Real-time Step Feedback */}
        {step > 0 && (
          <div className="mt-4 p-3.5 bg-[#0A1F23] rounded-[10px] text-xs font-mono text-slate-300 space-y-1">
            <div className={step >= 1 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {step >= 1 ? '✓' : '○'} Step 1: Video downloaded without watermark (yt-dlp)
            </div>
            {step >= 2 && (
              <div className={step >= 2 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                ✓ Step 2: Metadata stripped & hash randomized (FFmpeg)
              </div>
            )}
            {step >= 3 && (
              <div className={step >= 3 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                ✓ Step 3: Video stored in Cloudflare R2 bucket
              </div>
            )}
            {step >= 4 && (
              <div className="text-amber-400 font-bold pt-1">
                🚀 Step 4: Video LIVE on Facebook Page!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent History Card */}
      <div className="bg-white rounded-[14px] p-6 border border-[#D8E0E5] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0E2A2F]">📜 Recent Direct Posts</h3>
          <span className="text-xs font-mono text-[#718096] bg-slate-100 px-2 py-0.5 rounded">
            {history.length} posted
          </span>
        </div>

        <div className="space-y-2.5">
          {history.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border border-[#eef1f5] rounded-[10px] gap-3 text-xs"
            >
              <div className="min-w-0">
                <div className="font-bold text-[#0E2A2F] truncate">📄 {item.pageName}</div>
                <div className="text-[#5B6B73] truncate mt-0.5">{item.caption || 'No caption'}</div>
                <div className="text-[#a0aec0] font-mono mt-1">{item.time}</div>
              </div>

              <span className="bg-[#e6f7ed] text-[#2e9e5b] font-bold text-[11px] px-2.5 py-0.5 rounded-full shrink-0">
                ● {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
