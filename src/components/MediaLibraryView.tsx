import React, { useState, useRef, useEffect } from 'react';
import type { MediaItem, MediaFolder } from '../types.ts';
import { INITIAL_FOLDERS, INITIAL_MEDIA } from '../mockData.ts';

interface MediaLibraryViewProps {
  showToast: (msg: string) => void;
}

export default function MediaLibraryView({ showToast }: MediaLibraryViewProps) {
  const [folders, setFolders] = useState<MediaFolder[]>(() => {
    try {
      const saved = localStorage.getItem('postflow_folders');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_FOLDERS;
  });

  const [mediaList, setMediaList] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem('postflow_media');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_MEDIA;
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'video' | 'image'>('all');
  const [newFolderName, setNewFolderName] = useState('');
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ total: number; done: number; folderName?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('postflow_folders', JSON.stringify(folders));
    } catch {}
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem('postflow_media', JSON.stringify(mediaList));
    } catch {}
  }, [mediaList]);

  const filteredMedia = mediaList.filter(m => {
    const matchesFolder = selectedFolderId ? m.folderId === selectedFolderId : true;
    const matchesType = filterType === 'all' ? true : m.type === filterType;
    const matchesSearch = searchQuery.trim() ? m.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) : true;
    return matchesFolder && matchesType && matchesSearch;
  });

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const newF: MediaFolder = {
      id: 'f-' + Date.now(),
      name: newFolderName.trim(),
      videoCount: 0,
      imageCount: 0
    };
    setFolders(prev => [...prev, newF]);
    setSelectedFolderId(newF.id);
    setNewFolderName('');
    setIsFolderModalOpen(false);
    showToast(`New folder "${newF.name}" created`);
  };

  const handleDeleteFolder = (folderId: string) => {
    const f = folders.find(item => item.id === folderId);
    if (!f) return;
    if (confirm(`Delete folder "${f.name}"? Media files will stay in the library.`)) {
      setFolders(prev => prev.filter(item => item.id !== folderId));
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      showToast(`Folder "${f.name}" deleted.`);
    }
  };

  // Process files (single, multiple or from folder)
  const processFiles = async (files: File[], targetFolderId?: string | null, detectedFolderName?: string) => {
    if (!files || files.length === 0) return;

    let destFolderId = targetFolderId !== undefined ? targetFolderId : selectedFolderId;

    // If folder was selected/dropped and no destFolderId was passed
    if (detectedFolderName && (!destFolderId || destFolderId === null)) {
      const existing = folders.find(f => f.name.toLowerCase() === detectedFolderName.toLowerCase());
      if (existing) {
        destFolderId = existing.id;
      } else {
        const newFolder: MediaFolder = {
          id: 'f-' + Date.now(),
          name: detectedFolderName,
          videoCount: 0,
          imageCount: 0
        };
        setFolders(prev => [...prev, newFolder]);
        destFolderId = newFolder.id;
      }
      setSelectedFolderId(destFolderId);
    }

    setUploadProgress({ total: files.length, done: 0, folderName: detectedFolderName });

    const newItems: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVid = /\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name);
      const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
      
      const item: MediaItem = {
        id: 'm-' + Date.now() + '-' + i + '-' + Math.floor(Math.random() * 1000),
        name: file.name,
        type: isVid ? 'video' : isImg ? 'image' : 'video',
        sizeMB: Math.max(1, Math.round(file.size / (1024 * 1024))) || 18,
        folderId: destFolderId || (folders[0] ? folders[0].id : 'f-general'),
        createdAt: new Date().toISOString().split('T')[0],
        duration: isVid ? `0:${String(Math.floor(20 + Math.random() * 40)).padStart(2, '0')}` : undefined
      };
      newItems.push(item);

      // Simulate staggered progress update
      setUploadProgress(prev => prev ? { ...prev, done: i + 1 } : null);
    }

    setMediaList(prev => [...newItems, ...prev]);

    // Update folder counts
    if (destFolderId) {
      setFolders(prev => prev.map(f => {
        if (f.id === destFolderId) {
          const addedVideos = newItems.filter(m => m.type === 'video').length;
          const addedImages = newItems.filter(m => m.type === 'image').length;
          return {
            ...f,
            videoCount: f.videoCount + addedVideos,
            imageCount: f.imageCount + addedImages
          };
        }
        return f;
      }));
    }

    setTimeout(() => {
      setUploadProgress(null);
      showToast(`✅ Successfully uploaded ${files.length} file(s)${detectedFolderName ? ` into "${detectedFolderName}"` : ''}!`);
    }, 800);
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      processFiles(files, selectedFolderId);
      e.target.value = '';
    }
  };

  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      let detectedName = 'Uploaded Folder';
      const firstPath = (files[0] as any).webkitRelativePath || '';
      if (firstPath) {
        const parts = firstPath.split('/');
        if (parts.length > 1) {
          detectedName = parts[0];
        }
      }
      processFiles(files, null, detectedName);
      e.target.value = '';
    }
  };

  const handleDeleteMedia = (id: string) => {
    setMediaList(prev => prev.filter(m => m.id !== id));
    showToast('Media file deleted');
  };

  // Drag and drop directory entry scanner
  const readEntryRecursive = async (entry: any, path = ''): Promise<File[]> => {
    return new Promise(resolve => {
      if (entry.isFile) {
        entry.file((f: File) => {
          (f as any).customRelativePath = path ? path + '/' + f.name : f.name;
          resolve([f]);
        }, () => resolve([]));
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const all: File[] = [];
        const read = () => {
          reader.readEntries(async (entries: any[]) => {
            if (!entries.length) {
              resolve(all);
            } else {
              for (const sub of entries) {
                const subFiles = await readEntryRecursive(sub, path ? path + '/' + entry.name : entry.name);
                all.push(...subFiles);
              }
              read();
            }
          }, () => resolve(all));
        };
        read();
      } else {
        resolve([]);
      }
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0 && typeof (items[0] as any).webkitGetAsEntry === 'function') {
      let allFiles: File[] = [];
      let topFolderName = '';

      for (let i = 0; i < items.length; i++) {
        const entry = (items[i] as any).webkitGetAsEntry();
        if (entry) {
          if (entry.isDirectory && !topFolderName) {
            topFolderName = entry.name;
          }
          const collected = await readEntryRecursive(entry);
          allFiles.push(...collected);
        }
      }

      if (allFiles.length > 0) {
        processFiles(allFiles, topFolderName ? null : selectedFolderId, topFolderName || undefined);
        return;
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files), selectedFolderId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-[14px] p-6 border border-[#e8ebf0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-[22px] font-bold text-[#1a1a2e] flex items-center gap-2">
            <span>🗂️</span>
            <span>Media Library & Auto-Post Storage</span>
          </h1>
          <p className="text-sm text-[#718096] mt-1">
            Upload individual media files or entire creator folders. Connect folders directly to Facebook & YouTube auto-post schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="px-4 py-2 border border-[#e2e8f0] rounded-[10px] text-xs font-semibold bg-white text-[#4a5568] hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <span>＋</span>
            <span>New Folder</span>
          </button>

          {/* Upload Files Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-[#cbd5e1] rounded-[10px] text-xs font-semibold bg-white text-[#1a1a2e] hover:bg-slate-100 transition-colors flex items-center gap-1.5"
          >
            <span>📄</span>
            <span>Upload Files</span>
          </button>

          {/* Upload Folder Button */}
          <button
            onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2 bg-[#1877f2] text-white rounded-[10px] text-xs font-semibold hover:bg-[#166fe5] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>📁</span>
            <span>Upload Folder</span>
          </button>

          {/* Hidden HTML5 File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".mp4,.mov,.m4v,.webm,.mkv,.jpg,.jpeg,.png,.webp"
            onChange={handleFilesSelected}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFolderSelected}
            className="hidden"
          />
        </div>
      </div>

      {/* Upgraded Drag and Drop Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-[14px] p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-[#1877f2] bg-[#f0f6ff] scale-[1.005]'
            : 'border-[#cbd5e1] bg-white hover:border-[#94a3b8] hover:bg-slate-50/50'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="max-w-md mx-auto space-y-2">
          <div className="w-12 h-12 bg-[#e7f1ff] text-[#1877f2] rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ☁️
          </div>
          <div className="font-bold text-sm text-[#1a1a2e]">
            Drag & drop files or an entire folder here
          </div>
          <div className="text-xs text-[#718096]">
            Supports individual video/image files, multiple files, or full folders (e.g. TikTok creator downloads)
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-[8px] text-xs font-semibold transition-colors"
            >
              📄 Select Files (Multiple)
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
              className="px-3.5 py-1.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-[8px] text-xs font-semibold transition-colors"
            >
              📁 Select Whole Folder
            </button>
          </div>
        </div>
      </div>

      {/* Active Uploading Banner */}
      {uploadProgress && (
        <div className="bg-[#e7f1ff] border border-[#c7ddff] rounded-[12px] p-4 text-xs font-medium text-[#1877f2] space-y-2 animate-pulse">
          <div className="flex items-center justify-between font-bold">
            <span>
              ⏳ Uploading {uploadProgress.total} file(s)
              {uploadProgress.folderName ? ` to folder "${uploadProgress.folderName}"` : ''}...
            </span>
            <span>
              {uploadProgress.done} of {uploadProgress.total} completed
            </span>
          </div>
          <div className="w-full bg-[#c7ddff] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#1877f2] h-full transition-all duration-200"
              style={{ width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Grid: Left Folders + Right Files */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Folders Sidebar */}
        <div className="bg-white rounded-[14px] p-5 border border-[#e8ebf0] space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#a0aec0] uppercase tracking-wider">Storage Folders</div>
            <button
              onClick={() => setIsFolderModalOpen(true)}
              className="text-xs text-[#1877f2] font-semibold hover:underline"
            >
              ＋ New
            </button>
          </div>

          <button
            onClick={() => setSelectedFolderId(null)}
            className={`w-full text-left px-3 py-2.5 rounded-[10px] text-xs font-semibold flex items-center justify-between transition-colors ${
              selectedFolderId === null ? 'bg-[#e7f1ff] text-[#1877f2] font-bold' : 'hover:bg-[#f4f6fa] text-[#4a5568]'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🗂️</span>
              <span>All Media Files</span>
            </span>
            <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
              {mediaList.length}
            </span>
          </button>

          <div className="space-y-1 pt-1 border-t border-[#edf2f7]">
            {folders.map(f => {
              const count = mediaList.filter(m => m.folderId === f.id).length;
              return (
                <div
                  key={f.id}
                  className={`group rounded-[10px] flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                    selectedFolderId === f.id ? 'bg-[#e7f1ff] text-[#1877f2] font-bold' : 'hover:bg-[#f4f6fa] text-[#4a5568]'
                  }`}
                >
                  <button
                    onClick={() => setSelectedFolderId(f.id)}
                    className="flex items-center gap-2 truncate flex-1 text-left"
                  >
                    <span>📁</span>
                    <span className="truncate">{f.name}</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-500 text-[11px] bg-slate-100 group-hover:bg-white px-1.5 py-0.5 rounded">
                      {count}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                      title={`Delete folder "${f.name}"`}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-full w-5 h-5 flex items-center justify-center transition-colors text-xs font-bold"
                      aria-label={`Delete folder ${f.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedFolderId && (
            <div className="pt-2 border-t border-[#edf2f7]">
              <button
                type="button"
                onClick={() => handleDeleteFolder(selectedFolderId)}
                className="w-full text-xs font-bold py-2 px-3 rounded-[8px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>🗑️</span>
                <span>Delete Active Folder</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Media Files Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-3.5 px-4 rounded-[12px] border border-[#e8ebf0] gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <input
                type="search"
                placeholder="Search file names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-[#e2e8f0] rounded-[8px] focus:outline-none focus:border-[#1877f2]"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <div className="text-xs text-[#718096]">
                Showing <b className="text-slate-900 font-mono">{filteredMedia.length}</b> assets
              </div>

              <div className="flex gap-1.5">
                {(['all', 'video', 'image'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                      filterType === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredMedia.length === 0 ? (
            <div className="bg-white rounded-[14px] border border-dashed border-[#cbd5e1] p-12 text-center text-slate-500 text-sm">
              <div className="text-3xl mb-2">📂</div>
              <div className="font-semibold text-slate-700">No media files found</div>
              <div className="text-xs text-slate-400 mt-1">
                Upload single files or drag and drop an entire folder above to get started.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredMedia.map(m => (
                <div key={m.id} className="bg-white rounded-[12px] p-3.5 border border-[#e8ebf0] flex flex-col justify-between shadow-2xs group hover:shadow-sm transition-all">
                  <div>
                    <div className="h-28 bg-[#0e2a2f] rounded-[8px] flex items-center justify-center text-white mb-2.5 relative overflow-hidden">
                      <span className="text-2xl">{m.type === 'video' ? '🎬' : '🖼️'}</span>
                      {m.duration && (
                        <span className="absolute bottom-1.5 right-1.5 bg-black/75 px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {m.duration}
                        </span>
                      )}
                      <span className="absolute top-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider text-slate-200">
                        {m.type}
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-[#1a1a2e] truncate" title={m.name}>
                      {m.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#a0aec0] mt-1 font-mono">
                      <span>{m.sizeMB} MB</span>
                      <span>·</span>
                      <span>{m.createdAt}</span>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-[#edf2f7] flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold text-[#2e9e5b] bg-[#e6f7ed] px-2 py-0.5 rounded">
                      R2 Ready
                    </span>

                    <button
                      onClick={() => handleDeleteMedia(m.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete file"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-[#1a1a2e] mb-1">Create Media Folder</h3>
            <p className="text-xs text-[#718096] mb-4">
              Folders can be linked directly to auto-post schedules for Facebook & YouTube.
            </p>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. TikTok Skytherapyx / Shorts"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full p-2.5 text-xs border border-[#e2e8f0] rounded-[10px] focus:outline-none focus:border-[#1877f2]"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold border rounded-[10px] text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold bg-[#1877f2] text-white rounded-[10px] hover:bg-[#166fe5]"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
