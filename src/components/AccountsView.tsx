import { useState } from 'react';
import type { FBAccount } from '../types.ts';

interface AccountsViewProps {
  accounts: FBAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FBAccount[]>>;
  showToast: (msg: string) => void;
}

export default function AccountsView({ accounts, setAccounts, showToast }: AccountsViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newUserId, setNewUserId] = useState('');

  const handleReconnect = (id: number) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a));
    showToast('Facebook access token successfully renewed');
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Account "${name}" ko disconnect karna chahte hain?`)) {
      setAccounts(prev => prev.filter(a => a.id !== id));
      showToast(`Account "${name}" disconnected`);
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const newAcc: FBAccount = {
      id: Date.now(),
      name: newAccName.trim(),
      fb_user_id: newUserId.trim() || '1000' + Math.floor(Math.random() * 900000000),
      page_count: 1,
      status: 'active',
      connected_at: new Date().toISOString().split('T')[0],
      pages: [
        {
          id: Date.now() + 1,
          page_id: '' + Math.floor(1000000000000000 + Math.random() * 900000000000000),
          name: `${newAccName.trim()} Official`,
          owner: newAccName.trim()
        }
      ]
    };

    setAccounts(prev => [newAcc, ...prev]);
    setIsAddModalOpen(false);
    setNewAccName('');
    setNewUserId('');
    showToast('New Facebook account connected successfully');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-[14px] p-6 border border-[#e8ebf0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>👤</span>
            <span>Connected Facebook Accounts</span>
          </h1>
          <p className="text-sm text-[#718096] mt-1">
            Manage personal profiles and Business Manager accounts authorized to post on your pages.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-white bg-[#1877f2] hover:bg-[#166fe5] transition-colors cursor-pointer"
        >
          ＋ Connect FB Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-white rounded-[14px] p-5 border border-[#e8ebf0] flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-[#e7f1ff] text-[#1877f2] font-bold text-lg flex items-center justify-center shrink-0">
                  {acc.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-base text-[#1a1a2e] truncate">{acc.name}</div>
                  <div className="text-xs text-[#a0aec0] font-mono">{acc.fb_user_id}</div>
                </div>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full capitalize ${
                  acc.status === 'active' ? 'bg-[#e6f7ed] text-[#2e9e5b]' : 'bg-[#fff3cd] text-[#b8860b]'
                }`}>
                  {acc.status}
                </span>
              </div>

              <div className="text-xs text-[#718096] bg-[#f8fafc] p-3 rounded-[10px] space-y-1.5 mb-3">
                <div className="flex justify-between">
                  <span>Connected Pages:</span>
                  <b className="font-semibold text-slate-800">{acc.pages.length} pages</b>
                </div>
                <div className="flex justify-between">
                  <span>Authorized Date:</span>
                  <span className="font-mono text-slate-600">{acc.connected_at}</span>
                </div>
                <div className="flex justify-between">
                  <span>Permissions:</span>
                  <span className="text-[#2e9e5b] font-medium">pages_manage_posts</span>
                </div>
              </div>

              <div className="space-y-1 mb-2">
                <div className="text-[11px] font-bold text-[#a0aec0] uppercase tracking-wider">Pages:</div>
                <div className="max-h-[110px] overflow-y-auto space-y-1 text-xs text-[#4a5568]">
                  {acc.pages.map(p => (
                    <div key={p.id} className="truncate p-1 bg-[#f4f6fa] rounded">
                      📄 {p.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#edf2f7] flex items-center gap-2">
              <button
                onClick={() => handleReconnect(acc.id)}
                className="flex-1 py-2 text-xs font-semibold text-[#1877f2] border border-[#e2e8f0] rounded-[8px] hover:bg-slate-50 transition-colors"
              >
                🔄 Refresh Token
              </button>
              <button
                onClick={() => handleDelete(acc.id, acc.name)}
                className="py-2 px-3 text-xs font-semibold text-[#e74c3c] border border-[#e2e8f0] rounded-[8px] hover:bg-rose-50 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">Connect Facebook Profile</h3>
            <p className="text-xs text-[#718096] mb-4">
              Enter profile details to authorize posting permissions via Graph API OAuth.
            </p>

            <form onSubmit={handleAddAccount} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#4a5568] block mb-1">Profile Name / Owner</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Reyes H"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#4a5568] block mb-1">Facebook User ID (Optional)</label>
                <input
                  type="text"
                  placeholder="100084729184712"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="w-full p-2.5 text-sm border border-[#e2e8f0] rounded-[10px] focus:outline-none focus:border-[#1877f2]"
                />
              </div>

              <div className="p-3 bg-[#e7f1ff] rounded-[10px] text-xs text-[#1877f2]">
                ℹ️ Connecting in production will trigger Facebook OAuth dialog: <code>/fb/connect</code>.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold border border-[#e2e8f0] rounded-[10px] text-[#4a5568] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-semibold bg-[#1877f2] text-white rounded-[10px] hover:bg-[#166fe5]"
                >
                  Authorize Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
