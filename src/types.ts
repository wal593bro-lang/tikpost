export type NavigationPage = 
  | 'dashboard'
  | 'auto-upload'
  | 'accounts'
  | 'connect-app'
  | 'manual-upload'
  | 'manual-upload-compose'
  | 'manual-upload-queue'
  | 'manual-upload-history'
  | 'manual-upload-logs'
  | 'media-library'
  | 'library-sources'
  | 'schedule'
  | 'download-post';

export type AutomationStatus = 
  | 'active'
  | 'inactive'
  | 'paused'
  | 'verification-req'
  | 'rate-limited'
  | 'page-not-accessible'
  | 'invalid-token'
  | 'invalid-username'
  | 'creator-suspended'
  | 'completed'
  | '2fa-req-on-bm'
  | 'check-dev-app'
  | 'account-suspended';

export interface YouTubeAutomation {
  id: string;
  channelId: string;
  channelName: string;
  channelHandle: string;
  sourceType: 'tiktok' | 'instagram' | 'youtube' | 'drive';
  sourceTarget: string;
  status: 'active' | 'paused' | 'error';
  frequencyPerDay: number;
  times: string[];
  tags: string[];
  titleTemplate: string;
  visibility: 'public' | 'unlisted' | 'private';
  bufferCount: number;
  postedCount: number;
  failedCount: number;
  lastRun?: string;
  nextRun?: string;
}

export interface YouTubeUploadJob {
  id: string;
  automationId?: string;
  channelName: string;
  channelHandle: string;
  title: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  visibility: 'public' | 'unlisted' | 'private';
  status: 'queued' | 'uploading' | 'published' | 'failed';
  scheduledTime: string;
  publishedAt?: string;
  errorMessage?: string;
}

export interface YouTubeChannel {
  id: string;
  name: string;
  handle: string;
  accountEmail: string;
  status: 'healthy' | 'warning' | 'action_required';
  autoUpload: boolean;
  subscribers: string;
  videoCount: number;
  playlists: {
    id: string;
    playlist_name: string;
    video_count: number;
  }[];
}

export interface GoogleAccountChannel {
  id: string;
  title: string;
  status: 'active' | 'warning' | 'action_required';
  subscribers?: string;
}

export interface GoogleAccount {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
  status: 'active' | 'needs_reconnect' | 'disconnected';
  connectedAt: string;
  channels: GoogleAccountChannel[];
}

export interface FBPage {
  id: number;
  page_id: string;
  name: string;
  owner?: string;
  needsReconnect?: boolean;
}

export interface FBAccount {
  id: number;
  name: string;
  fb_user_id: string;
  page_count: number;
  status: 'active' | 'invalid-token' | 'needs-reconnect';
  connected_at: string;
  pages: FBPage[];
}

export interface AutomationItem {
  id: string;
  pageId: number;
  fbPageId: string;
  pageName: string;
  owner: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook';
  source: string;
  status: AutomationStatus;
  r2Ready: boolean;
  bufferDays: number; // e.g. 5 days strict buffer
  bufferVideosCount: number;
  targetBufferVideos: number;
  postedCount: number;
  queuedCount: number;
  failedCount: number;
  followers: number;
  followersChange: number; // e.g. +142
  postsPerDay: number;
  times: string[]; // e.g. ["12:03", "15:05", "18:04", "21:03"]
  lastPosted?: string;
  nextPostTime?: string;
}

export interface IdlePageItem {
  id: string;
  pageId: number;
  fbPageId: string;
  name: string;
  owner: string;
}

export interface ScheduledJob {
  id: string;
  pageName: string;
  pageId: string;
  filename: string;
  mediaType: 'video' | 'image';
  caption: string;
  status: 'pending' | 'publishing' | 'posted' | 'failed' | 'draft';
  scheduledTime: string;
  error?: string;
  postUrl?: string;
}

export interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'image';
  sizeMB: number;
  folderId?: string;
  createdAt: string;
  duration?: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  videoCount: number;
  imageCount: number;
}
