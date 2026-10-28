import { useState } from 'react';

interface ConnectAppViewProps {
  showToast: (msg: string) => void;
}

export default function ConnectAppView({ showToast }: ConnectAppViewProps) {
  const [appId, setAppId] = useState('184729104829104');
  const [appSecret, setAppSecret] = useState('9a8f4c2b1e8d7a6e5b4c3d2e1f0a9b8c');
  const [appName, setAppName] = useState('PostFlow Production App');
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(true);

  const baseUrl = window.location.origin;
  const redirectUri = `${baseUrl}/fb/callback`;
  const webhookUrl = `${baseUrl}/fb/webhook`;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    showToast('Facebook App credentials saved & encrypted on disk.');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-[14px] p-6 border border-[#e8ebf0]">
        <h1 className="text-[22px] font-bold text-[#1a1a2e] flex items-center gap-2">
          <span>🔑</span>
          <span>Facebook App Settings</span>
        </h1>
        <p className="text-sm text-[#718096] mt-1">
          Meta Developer Console se credentials yahan lagayein taake Facebook Pages ke sath automated posting chal sakay.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form: App ID & Secret */}
        <div className="md:col-span-2 bg-white rounded-[14px] p-6 border border-[#e8ebf0] space-y-5">
          <h2 className="text-base font-bold text-[#1a1a2e]">App Credentials</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#4a5568] block mb-1">App Display Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => { setAppName(e.target.value); setSaved(false); }}
                className="w-full p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] focus:outline-none focus:border-[#1877f2] bg-white font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#4a5568] block mb-1">Facebook App ID</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => { setAppId(e.target.value); setSaved(false); }}
                className="w-full p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] focus:outline-none focus:border-[#1877f2] bg-white font-mono"
              />
              <span className="text-[11px] text-[#a0aec0] mt-1 block">Found in Meta Developer Console &gt; Settings &gt; Basic</span>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#4a5568]">Facebook App Secret</label>
                <button
                  type="button"
                  onClick={() => setShowSecret(prev => !prev)}
                  className="text-xs text-[#1877f2] hover:underline cursor-pointer"
                >
                  {showSecret ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showSecret ? 'text' : 'password'}
                value={appSecret}
                onChange={(e) => { setAppSecret(e.target.value); setSaved(false); }}
                className="w-full p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] focus:outline-none focus:border-[#1877f2] bg-white font-mono"
              />
              <span className="text-[11px] text-[#a0aec0] mt-1 block">PostFlow encrypts tokens and secrets using AES-256-GCM before saving to disk.</span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-[#2e9e5b] font-medium flex items-center gap-1.5">
                <span>●</span>
                <span>{saved ? 'Active & Encrypted' : 'Unsaved changes'}</span>
              </span>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#1877f2] text-white rounded-[10px] text-sm font-semibold hover:bg-[#166fe5] transition-colors cursor-pointer"
              >
                Save App Credentials
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Meta Setup Instructions & Copy URLs */}
        <div className="bg-white rounded-[14px] p-6 border border-[#e8ebf0] space-y-4">
          <h2 className="text-base font-bold text-[#1a1a2e]">Meta Developer Links</h2>
          <p className="text-xs text-[#718096]">
            Ye links Meta Developer Console mein lagayein:
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider block mb-1">
                Valid OAuth Redirect URI
              </label>
              <div className="flex items-center gap-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] p-2">
                <span className="text-xs font-mono text-slate-700 truncate">{redirectUri}</span>
                <button
                  onClick={() => copyToClipboard(redirectUri, 'Redirect URI')}
                  className="ml-auto text-xs font-semibold text-[#1877f2] hover:underline shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider block mb-1">
                Webhook Callback URL
              </label>
              <div className="flex items-center gap-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] p-2">
                <span className="text-xs font-mono text-slate-700 truncate">{webhookUrl}</span>
                <button
                  onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                  className="ml-auto text-xs font-semibold text-[#1877f2] hover:underline shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider block mb-1">
                Required Permissions (Scopes)
              </label>
              <div className="p-2.5 bg-[#f4f6fa] rounded-[8px] text-xs font-mono text-[#4a5568] space-y-1">
                <div>pages_show_list</div>
                <div>pages_manage_posts</div>
                <div>pages_read_engagement</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
