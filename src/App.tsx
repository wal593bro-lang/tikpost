import { useState, useEffect, useCallback } from 'react';
import type { NavigationPage, AutomationItem, IdlePageItem, FBAccount, ScheduledJob } from './types.ts';
import { INITIAL_AUTOMATIONS, INITIAL_IDLE_PAGES, INITIAL_ACCOUNTS, INITIAL_JOBS } from './mockData.ts';
import Sidebar from './components/Sidebar.tsx';
import AutoUploadPage from './components/AutoUploadPage.tsx';
import DashboardView from './components/DashboardView.tsx';
import AccountsView from './components/AccountsView.tsx';
import ConnectAppView from './components/ConnectAppView.tsx';
import ManualUploadView from './components/ManualUploadView.tsx';
import MediaLibraryView from './components/MediaLibraryView.tsx';
import LibrarySourceView from './components/LibrarySourceView.tsx';
import ScheduleView from './components/ScheduleView.tsx';
import DirectPostView from './components/DirectPostView.tsx';

function getInitialPageFromUrl(): NavigationPage {
  if (typeof window === 'undefined') return 'dashboard';
  const p = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (!p || p === 'dashboard') return 'dashboard';
  if (p === 'auto-upload') return 'auto-upload';
  if (p === 'accounts') return 'accounts';
  if (p === 'connect-app') return 'connect-app';
  if (p === 'manual-upload' || p === 'manual-upload/compose') return 'manual-upload-compose';
  if (p === 'manual-upload/queue' || p === 'manual-upload-queue') return 'manual-upload-queue';
  if (p === 'manual-upload/history' || p === 'manual-upload-history') return 'manual-upload-history';
  if (p === 'manual-upload/logs' || p === 'manual-upload-logs') return 'manual-upload-logs';
  if (p === 'media-library') return 'media-library';
  if (p === 'library-sources') return 'library-sources';
  if (p === 'schedule') return 'schedule';
  if (p === 'download-post') return 'download-post';
  return 'dashboard';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>(getInitialPageFromUrl);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core Persistent State for Facebook
  const [automations, setAutomations] = useState<AutomationItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('postflow_automations');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved automations', e);
      }
    }
    return INITIAL_AUTOMATIONS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('postflow_automations', JSON.stringify(automations));
    }
  }, [automations]);

  const [idlePages, setIdlePages] = useState<IdlePageItem[]>(INITIAL_IDLE_PAGES);
  const [accounts, setAccounts] = useState<FBAccount[]>(INITIAL_ACCOUNTS);
  const [jobs, setJobs] = useState<ScheduledJob[]>(INITIAL_JOBS);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleNavigate = useCallback((page: NavigationPage) => {
    setCurrentPage(page);
    const pathMap: Record<string, string> = {
      'dashboard': '/dashboard',
      'auto-upload': '/auto-upload',
      'accounts': '/accounts',
      'connect-app': '/connect-app',
      'manual-upload': '/manual-upload',
      'manual-upload-compose': '/manual-upload',
      'manual-upload-queue': '/manual-upload/queue',
      'manual-upload-history': '/manual-upload/history',
      'manual-upload-logs': '/manual-upload/logs',
      'media-library': '/media-library',
      'library-sources': '/library-sources',
      'schedule': '/schedule',
      'download-post': '/download-post',
    };
    const targetPath = pathMap[page] || '/dashboard';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page }, '', targetPath);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getInitialPageFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div className="min-h-screen bg-[#F2F5F7] text-[#0E2A2F] flex flex-col font-sans">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0E2A2F] text-white text-sm px-4 py-3 rounded-[10px] shadow-xl flex items-center gap-2.5 animate-in fade-in duration-200">
          <span className="text-[#2e9e5b]">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Header Button */}
      <button
        aria-label="Menu"
        onClick={() => setIsMobileMenuOpen(prev => !prev)}
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-[8px] bg-[#0E2A2F] text-white flex items-center justify-center text-xl shadow-md cursor-pointer"
      >
        ☰
      </button>

      {/* Navigation Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="md:ml-[240px] flex-1 p-4 sm:p-6 lg:p-8 pt-16 md:pt-6">
        {/* Top Header Bar matching user's screenshot */}
        <div className="bg-white rounded-[14px] p-3 px-5 border border-[#D8E0E5] shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#5B6B73]">
            <span className="font-bold text-[#0E2A2F] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1877F2]"></span>
              PostFlow
            </span>
            <span>·</span>
            <span className="font-medium">Facebook Automation & Studio Engine</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-[#5B6B73] font-medium">danisahib0@gmail.com</span>
            <button
              onClick={() => showToast('Active account: danisahib0@gmail.com')}
              className="text-[#1877F2] font-bold hover:underline cursor-pointer"
            >
              Switch
            </button>
          </div>
        </div>

        {/* View Routing - Exclusively Facebook */}
        {currentPage === 'dashboard' && (
          <DashboardView
            automations={automations}
            idlePages={idlePages}
            accounts={accounts}
            onNavigate={(p) => handleNavigate(p)}
          />
        )}

        {currentPage === 'auto-upload' && (
          <AutoUploadPage
            automations={automations}
            setAutomations={setAutomations}
            idlePages={idlePages}
            setIdlePages={setIdlePages}
            accounts={accounts}
            showToast={showToast}
          />
        )}

        {currentPage === 'accounts' && (
          <AccountsView
            accounts={accounts}
            setAccounts={setAccounts}
            showToast={showToast}
          />
        )}

        {currentPage === 'connect-app' && (
          <ConnectAppView
            showToast={showToast}
          />
        )}

        {currentPage.startsWith('manual-upload') && (
          <ManualUploadView
            initialTab={
              currentPage === 'manual-upload-queue' ? 'queue' :
              currentPage === 'manual-upload-history' ? 'history' :
              currentPage === 'manual-upload-logs' ? 'logs' : 'compose'
            }
            jobs={jobs}
            setJobs={setJobs}
            accounts={accounts}
            showToast={showToast}
          />
        )}

        {currentPage === 'library-sources' && (
          <LibrarySourceView
            accounts={accounts}
            showToast={showToast}
            onNavigate={(p) => handleNavigate(p)}
          />
        )}

        {currentPage === 'media-library' && (
          <MediaLibraryView
            showToast={showToast}
          />
        )}

        {currentPage === 'schedule' && (
          <ScheduleView
            automations={automations}
            accounts={accounts}
            showToast={showToast}
          />
        )}

        {currentPage === 'download-post' && (
          <DirectPostView
            accounts={accounts}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}
