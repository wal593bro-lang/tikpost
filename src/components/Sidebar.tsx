import { useState } from 'react';
import type { NavigationPage } from '../types.ts';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ currentPage, onNavigate, isOpenMobile, onCloseMobile }: SidebarProps) {
  const [manualMenuOpen, setManualMenuOpen] = useState(
    currentPage.startsWith('manual-upload')
  );

  const handleNav = (page: NavigationPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      {/* Sidebar Container with PostFlow #0E2A2F Dark Teal styling */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[240px] bg-[#0E2A2F] text-[#A0B2B7] py-5 overflow-y-auto z-50 transition-transform duration-200 md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Logo with Yellow Airplane */}
        <div className="px-5 pb-5">
          <button
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-2.5 text-left text-white text-xl font-bold cursor-pointer hover:opacity-95"
          >
            <div className="w-8 h-8 rounded-lg bg-[#F7C948] flex items-center justify-center text-[#0E2A2F] text-base font-black shadow-xs">
              ✈
            </div>
            <span className="tracking-tight text-white font-extrabold text-[21px]">PostFlow</span>
          </button>
        </div>

        {/* SECTION: Facebook */}
        <div className="px-5 pt-2 pb-1 text-[11px] font-bold text-[#627D83] uppercase tracking-wider">
          Facebook
        </div>
        <nav className="space-y-0.5">
          <button
            onClick={() => handleNav('dashboard')}
            className={`w-full flex items-center justify-between px-5 py-2.5 text-[13px] font-medium text-left transition-colors ${
              currentPage === 'dashboard'
                ? 'bg-[#163E45] text-[#F7C948] font-semibold'
                : 'text-[#A0B2B7] hover:bg-[#13353B] hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <span>🏠</span>
              <span>Dashboard</span>
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#1877f2] text-white">
              0
            </span>
          </button>

          <button
            onClick={() => handleNav('accounts')}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-left transition-colors ${
              currentPage === 'accounts'
                ? 'bg-[#163E45] text-[#F7C948] font-semibold'
                : 'text-[#A0B2B7] hover:bg-[#13353B] hover:text-white'
            }`}
          >
            <span>👤</span>
            <span>Accounts</span>
          </button>

          <button
            onClick={() => handleNav('connect-app')}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-left transition-colors ${
              currentPage === 'connect-app'
                ? 'bg-[#163E45] text-[#F7C948] font-semibold'
                : 'text-[#A0B2B7] hover:bg-[#13353B] hover:text-white'
            }`}
          >
            <span>🔑</span>
            <span>App settings</span>
          </button>
        </nav>

        {/* SECTION: Posting */}
        <div className="px-5 pt-4 pb-1 text-[11px] font-bold text-[#627D83] uppercase tracking-wider">
          Posting
        </div>
        <nav className="space-y-0.5">
          <button
            onClick={() => setManualMenuOpen(prev => !prev)}
            className={`w-full flex items-center justify-between px-5 py-2.5 text-[13px] font-medium text-left transition-colors ${
              currentPage.startsWith('manual-upload')
                ? 'bg-[#163E45] text-white font-semibold'
                : 'text-[#A0B2B7] hover:bg-[#13353B] hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <span>📤</span>
              <span>Manual upload</span>
            </span>
            <span className="text-xs">{manualMenuOpen ? '▴' : '▾'}</span>
          </button>

          {manualMenuOpen && (
            <div className="bg-[#0A1F23] py-1 space-y-0.5">
              <button
                onClick={() => handleNav('manual-upload-compose')}
                className={`w-full flex items-center gap-2 pl-11 pr-5 py-1.5 text-[12px] text-left transition-colors ${
                  currentPage === 'manual-upload-compose'
                    ? 'text-[#F7C948] font-semibold'
                    : 'text-[#879FA5] hover:text-white'
                }`}
              >
                <span>✏️</span>
                <span>Compose</span>
              </button>
              <button
                onClick={() => handleNav('manual-upload-queue')}
                className={`w-full flex items-center gap-2 pl-11 pr-5 py-1.5 text-[12px] text-left transition-colors ${
                  currentPage === 'manual-upload-queue'
                    ? 'text-[#F7C948] font-semibold'
                    : 'text-[#879FA5] hover:text-white'
                }`}
              >
                <span>🗓️</span>
                <span>Queue</span>
              </button>
              <button
                onClick={() => handleNav('manual-upload-history')}
                className={`w-full flex items-center gap-2 pl-11 pr-5 py-1.5 text-[12px] text-left transition-colors ${
                  currentPage === 'manual-upload-history'
                    ? 'text-[#F7C948] font-semibold'
                    : 'text-[#879FA5] hover:text-white'
                }`}
              >
                <span>📜</span>
                <span>History</span>
              </button>
              <button
                onClick={() => handleNav('manual-upload-logs')}
                className={`w-full flex items-center gap-2 pl-11 pr-5 py-1.5 text-[12px] text-left transition-colors ${
                  currentPage === 'manual-upload-logs'
                    ? 'text-[#F7C948] font-semibold'
                    : 'text-[#879FA5] hover:text-white'
                }`}
              >
                <span>🐞</span>
                <span>Logs</span>
              </button>
            </div>
          )}

          <button
            onClick={() => handleNav('media-library')}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-left transition-colors ${
              currentPage === 'media-library'
                ? 'bg-[#163E45] text-[#F7C948] font-semibold'
                : 'text-[#A0B2B7] hover:bg-[#13353B] hover:text-white'
            }`}
          >
            <span>📁</span>
            <span>Media library</span>
          </button>

          <button
            onClick={() => handleNav('library-sources')}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-left transition-colors ${
              currentPage === 'library-sources'
                ? 'bg-[#163E45] text-[#F7C948] font-semibold'
                : 'text-[#A0B2B7] hover:bg-[#13353B] hover:text-white'
            }`}
          >
            <span>🔁</span>
            <span>Auto-post from library</span>
          </button>
        </nav>

        {/* SECTION: Automation */}
        <div className="px-5 pt-4 pb-1 text-[11px] font-bold text-[#627D83] uppercase tracking-wider">
          Automation
        </div>
        <nav className="space-y-0.5">
          <button
            onClick={() => handleNav('auto-upload')}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-left transition-colors relative ${
              currentPage === 'auto-upload'
                ? 'bg-[#163E45] text-[#F7C948] font-semibold'
                : 'text-[#A0B2B7] hover:bg-[#13353B] hover:text-white'
            }`}
          >
            <span className="text-[#3b82f6]">⬇️</span>
            <span>Auto download & upload</span>
            {currentPage === 'auto-upload' && (
              <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#F7C948]" />
            )}
          </button>

          <button
            onClick={() => handleNav('schedule')}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-left transition-colors ${
              currentPage === 'schedule'
                ? 'bg-[#163E45] text-[#F7C948] font-semibold'
                : 'text-[#A0B2B7] hover:bg-[#13353B] hover:text-white'
            }`}
          >
            <span>📅</span>
            <span>Schedule</span>
          </button>

          <button
            onClick={() => handleNav('download-post')}
            className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium text-left transition-colors ${
              currentPage === 'download-post'
                ? 'bg-[#163E45] text-[#F7C948] font-semibold'
                : 'text-[#A0B2B7] hover:bg-[#13353B] hover:text-white'
            }`}
          >
            <span>🚀</span>
            <span>Post now</span>
          </button>
        </nav>

        {/* User Footer matching user screenshot */}
        <div className="px-5 pt-5 pb-2 mt-8 border-t border-[#16393F] text-xs">
          <div className="text-white font-medium truncate">danisahib0@gmail.com</div>
          <button
            onClick={() => onNavigate('accounts')}
            className="text-[#F7C948] hover:underline font-semibold mt-1 text-[11px] block cursor-pointer"
          >
            Change Account
          </button>
        </div>
      </aside>
    </>
  );
}
