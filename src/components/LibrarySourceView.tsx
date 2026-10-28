import { useState } from 'react';
import type { FBAccount, MediaFolder } from '../types.ts';
import { INITIAL_FOLDERS } from '../mockData.ts';

interface LibrarySourceViewProps {
  accounts: FBAccount[];
  showToast: (msg: string) => void;
  onNavigate: (page: any) => void;
}

export default function LibrarySourceView({ accounts, showToast, onNavigate }: LibrarySourceViewProps) {
  const allPages = accounts.flatMap(a => a.pages);
  const [selectedPage, setSelectedPage] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [contentType, setContentType] = useState<'video' | 'picture' | 'both'>('video');
  const [postsPerDay, setPostsPerDay] = useState<number>(3);
  const [times, setTimes] = useState<string[]>(['12:00', '18:00', '21:00']);
  const [captionMode, setCaptionMode] = useState<'hashtags' | 'custom'>('hashtags');
  const [hashtags, setHashtags] = useState('#fashion #style');

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPage) {
      alert('Facebook page select karein.');
      return;
    }
    showToast('Auto-post library source added successfully!');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header section from screenshot */}
      <div>
        <div className="text-xs font-semibold text-[#718096] uppercase tracking-wider mb-1">
          Posting
        </div>
        <h1 className="text-2xl font-bold text-[#0E2A2F] tracking-tight">
          Auto-post from library
        </h1>
        <p className="text-sm text-[#5B6B73] mt-1.5 leading-relaxed">
          Pick a folder from your Media library and a page. PostFlow then posts the next file from that folder at the times you choose, and never repeats a file.
        </p>
      </div>

      {/* Main Form Box matching user screenshot */}
      <div className="bg-white rounded-[14px] p-7 border border-[#D8E0E5] shadow-xs space-y-5">
        <h2 className="text-base font-bold text-[#0E2A2F]">Add a source</h2>

        <form onSubmit={handleAddSource} className="space-y-5">
          {/* Facebook page + Folder row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#0E2A2F] block mb-1.5">Facebook page</label>
              <select
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                className="w-full p-2.5 text-sm border border-[#D8E0E5] rounded-[10px] bg-white text-[#2d3748] focus:outline-none focus:border-[#0E2A2F]"
              >
                <option value="">Start typing a page name...</option>
                {allPages.map(p => (
                  <option key={p.page_id} value={p.page_id}>
                    📄 {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0E2A2F] block mb-1.5">Folder</label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full p-2.5 text-sm border border-[#D8E0E5] rounded-[10px] bg-white text-[#2d3748] focus:outline-none focus:border-[#0E2A2F]"
              >
                <option value="">Choose a folder...</option>
                {INITIAL_FOLDERS.map(f => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name} ({f.videoCount} videos)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content type segmented buttons */}
          <div>
            <label className="text-xs font-semibold text-[#0E2A2F] block mb-1.5">Content type</label>
            <div className="grid grid-cols-3 gap-2 border border-[#D8E0E5] p-1 rounded-[10px] bg-[#f8fafc]">
              {(['video', 'picture', 'both'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setContentType(t)}
                  className={`py-2 text-xs font-semibold rounded-[8px] capitalize transition-all cursor-pointer ${
                    contentType === t
                      ? 'bg-white text-[#0E2A2F] shadow-xs border border-[#D8E0E5]'
                      : 'text-[#718096] hover:text-[#0E2A2F]'
                  }`}
                >
                  {t === 'video' ? 'Videos' : t === 'picture' ? 'Pictures' : 'Both'}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-[#718096] mt-1.5 block">
              "Both" alternates: one video, then one picture, and so on.
            </span>
          </div>

          {/* Posts per day */}
          <div>
            <label className="text-xs font-semibold text-[#0E2A2F] block mb-1.5">Posts per day</label>
            <select
              value={postsPerDay}
              onChange={(e) => {
                const count = Number(e.target.value);
                setPostsPerDay(count);
                const updated = [...times];
                while (updated.length < count) updated.push('18:00');
                setTimes(updated.slice(0, count));
              }}
              className="w-full p-2.5 text-sm border border-[#D8E0E5] rounded-[10px] bg-white text-[#2d3748] focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Posting times with clocks */}
          <div>
            <label className="text-xs font-semibold text-[#0E2A2F] block mb-1.5">Posting times</label>
            <div className="flex flex-wrap gap-2.5">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-1.5 border border-[#D8E0E5] rounded-[8px] p-1.5 px-3 bg-white">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => {
                      const updated = [...times];
                      updated[i] = e.target.value;
                      setTimes(updated);
                    }}
                    className="text-xs font-mono font-medium focus:outline-none"
                  />
                  <span className="text-xs text-[#a0aec0]">🕒</span>
                </div>
              ))}
            </div>
            <span className="text-[11px] text-[#718096] mt-1.5 block">
              Times are in your own time zone (Europe/London).
            </span>
          </div>

          {/* Caption mode */}
          <div>
            <label className="text-xs font-semibold text-[#0E2A2F] block mb-1.5">Caption</label>
            <div className="grid grid-cols-2 gap-2 border border-[#D8E0E5] p-1 rounded-[10px] bg-[#f8fafc]">
              <button
                type="button"
                onClick={() => setCaptionMode('hashtags')}
                className={`py-2 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                  captionMode === 'hashtags'
                    ? 'bg-white text-[#0E2A2F] shadow-xs border border-[#D8E0E5]'
                    : 'text-[#718096] hover:text-[#0E2A2F]'
                }`}
              >
                Hashtags only
              </button>
              <button
                type="button"
                onClick={() => setCaptionMode('custom')}
                className={`py-2 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                  captionMode === 'custom'
                    ? 'bg-white text-[#0E2A2F] shadow-xs border border-[#D8E0E5]'
                    : 'text-[#718096] hover:text-[#0E2A2F]'
                }`}
              >
                My own captions
              </button>
            </div>
          </div>

          {/* Hashtags field */}
          <div>
            <label className="text-xs font-semibold text-[#0E2A2F] block mb-1.5">Hashtags (optional)</label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="w-full p-2.5 text-sm border border-[#D8E0E5] rounded-[10px] bg-white focus:outline-none focus:border-[#0E2A2F]"
            />
          </div>

          <div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0E2A2F] text-white text-xs font-bold rounded-[8px] hover:bg-[#163E45] transition-colors cursor-pointer"
            >
              Add source
            </button>
          </div>
        </form>

        <div className="pt-2 text-xs text-[#718096]">
          You have no folders yet. Make one in the{' '}
          <button onClick={() => onNavigate('media-library')} className="text-[#0E2A2F] font-bold underline cursor-pointer">
            Media library
          </button>{' '}
          first.
        </div>
      </div>
    </div>
  );
}
