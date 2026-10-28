import type { FBAccount, IdlePageItem, AutomationItem, ScheduledJob, MediaItem, MediaFolder, YouTubeAutomation, YouTubeChannel, YouTubeUploadJob } from './types.ts';

export const INITIAL_IDLE_PAGES: IdlePageItem[] = [
  { id: 'idle-1', pageId: 101, fbPageId: '10001001', name: 'Tech Daily Bites', owner: 'Content Creator' },
  { id: 'idle-2', pageId: 102, fbPageId: '10001002', name: 'Viral Trends Pulse', owner: 'Content Creator' },
  { id: 'idle-3', pageId: 103, fbPageId: '10001003', name: 'Life Hacks & Tips', owner: 'Media Manager' },
  { id: 'idle-4', pageId: 104, fbPageId: '10001004', name: 'Daily Shorts Hub', owner: 'Media Manager' },
  { id: 'idle-5', pageId: 105, fbPageId: '10001005', name: 'Fitness & Health Clips', owner: 'Studio Admin' },
  { id: 'idle-6', pageId: 106, fbPageId: '10001006', name: 'Gaming Highlights 24/7', owner: 'Studio Admin' },
  { id: 'idle-7', pageId: 107, fbPageId: '10001007', name: 'Motivation & Quotes', owner: 'Creator Pro' },
  { id: 'idle-8', pageId: 108, fbPageId: '10001008', name: 'Podcast Highlights', owner: 'Creator Pro' },
];

export const INITIAL_ACCOUNTS: FBAccount[] = [
  {
    id: 1,
    name: 'Primary Studio Account',
    fb_user_id: '100092817401',
    page_count: 2,
    status: 'active',
    connected_at: '2026-03-12',
    pages: [
      { id: 200, page_id: '1315097008356686', name: 'Cute Souls', owner: 'Primary Studio Account' },
      { id: 101, page_id: '10001001', name: 'Tech Daily Bites', owner: 'Primary Studio Account' },
      { id: 102, page_id: '10001002', name: 'Viral Trends Pulse', owner: 'Primary Studio Account' }
    ]
  },
  {
    id: 2,
    name: 'Secondary Media Account',
    fb_user_id: '100092817402',
    page_count: 2,
    status: 'active',
    connected_at: '2026-03-14',
    pages: [
      { id: 103, page_id: '10001003', name: 'Life Hacks & Tips', owner: 'Secondary Media Account' },
      { id: 104, page_id: '10001004', name: 'Daily Shorts Hub', owner: 'Secondary Media Account' }
    ]
  },
  {
    id: 3,
    name: 'Operations Account',
    fb_user_id: '100092817403',
    page_count: 2,
    status: 'active',
    connected_at: '2026-03-16',
    pages: [
      { id: 105, page_id: '10001005', name: 'Fitness & Health Clips', owner: 'Operations Account' },
      { id: 106, page_id: '10001006', name: 'Gaming Highlights 24/7', owner: 'Operations Account' }
    ]
  }
];

export const INITIAL_AUTOMATIONS: AutomationItem[] = [
  {
    id: 'auto-cute-souls',
    pageId: 200,
    fbPageId: '1315097008356686',
    pageName: 'Cute Souls',
    owner: 'Primary Studio Account',
    platform: 'tiktok',
    source: 'https://tiktok.com/@skytherapyx',
    status: 'active',
    r2Ready: true,
    bufferDays: 5,
    bufferVideosCount: 20,
    targetBufferVideos: 20,
    postedCount: 0,
    queuedCount: 20,
    failedCount: 0,
    followers: 15420,
    followersChange: 140,
    postsPerDay: 4,
    times: ['12:00', '15:00', '18:00', '21:00'],
    lastPosted: 'Not yet started',
    nextPostTime: 'Today at 15:00'
  },
  {
    id: 'auto-1',
    pageId: 201,
    fbPageId: '10001001',
    pageName: 'Tech Daily Bites',
    owner: 'Primary Studio Account',
    platform: 'youtube',
    source: 'https://www.youtube.com/@techtrends',
    status: 'active',
    r2Ready: true,
    bufferDays: 5,
    bufferVideosCount: 22,
    targetBufferVideos: 20, // 4 posts/day * 5 days = 20
    postedCount: 148,
    queuedCount: 20,
    failedCount: 0,
    followers: 124800,
    followersChange: 340,
    postsPerDay: 4,
    times: ['12:00', '15:00', '18:00', '21:00'],
    lastPosted: '2 hours ago',
    nextPostTime: 'Today at 18:00'
  },
  {
    id: 'auto-2',
    pageId: 202,
    fbPageId: '10001002',
    pageName: 'Viral Trends Pulse',
    owner: 'Primary Studio Account',
    platform: 'tiktok',
    source: 'https://www.tiktok.com/@trendingviral',
    status: 'active',
    r2Ready: true,
    bufferDays: 5,
    bufferVideosCount: 18,
    targetBufferVideos: 15,
    postedCount: 89,
    queuedCount: 15,
    failedCount: 0,
    followers: 78200,
    followersChange: 185,
    postsPerDay: 3,
    times: ['12:00', '16:00', '20:00'],
    lastPosted: '45 mins ago',
    nextPostTime: 'Today at 20:00'
  },
  {
    id: 'auto-3',
    pageId: 203,
    fbPageId: '10001003',
    pageName: 'Life Hacks & Tips',
    owner: 'Secondary Media Account',
    platform: 'youtube',
    source: 'https://www.youtube.com/@dailyhacks',
    status: 'active',
    r2Ready: true,
    bufferDays: 3,
    bufferVideosCount: 12,
    targetBufferVideos: 15,
    postedCount: 64,
    queuedCount: 12,
    failedCount: 1,
    followers: 43100,
    followersChange: 80,
    postsPerDay: 3,
    times: ['11:00', '15:00', '19:00'],
    lastPosted: '3 hours ago',
    nextPostTime: 'Today at 19:00'
  }
];

export const INITIAL_JOBS: ScheduledJob[] = [
  {
    id: 'job-1',
    pageName: 'Tech Daily Bites',
    pageId: '10001001',
    filename: 'tech_gadgets_review_01.mp4',
    mediaType: 'video',
    caption: 'Top new tech gear unveiled today! #TechNews #Gadgets #Innovation',
    status: 'pending',
    scheduledTime: 'Today at 18:00'
  },
  {
    id: 'job-2',
    pageName: 'Viral Trends Pulse',
    pageId: '10001002',
    filename: 'viral_challenge_clip.mp4',
    mediaType: 'video',
    caption: 'The most popular trending moment right now. #Trending #DailyViral',
    status: 'pending',
    scheduledTime: 'Today at 20:00'
  },
  {
    id: 'job-3',
    pageName: 'Life Hacks & Tips',
    pageId: '10001003',
    filename: 'productivity_hacks_reel.mp4',
    mediaType: 'video',
    caption: '3 productivity shortcuts to save 2 hours daily! #LifeHacks #Productivity',
    status: 'pending',
    scheduledTime: 'Today at 21:00'
  },
  {
    id: 'job-4',
    pageName: 'Tech Daily Bites',
    pageId: '10001001',
    filename: 'ai_tool_breakdown.mp4',
    mediaType: 'video',
    caption: 'Amazing AI tool you should know about. #AI #Tech #Shorts',
    status: 'posted',
    scheduledTime: 'Today at 12:00',
    postUrl: 'https://facebook.com/10001001/posts/991823'
  }
];

export const INITIAL_FOLDERS: MediaFolder[] = [
  { id: 'f-1', name: 'Shorts & Reels Queue', videoCount: 34, imageCount: 12 },
  { id: 'f-2', name: 'Trending Viral Clips', videoCount: 28, imageCount: 0 },
  { id: 'f-3', name: 'Daily Tutorials & Tips', videoCount: 42, imageCount: 5 },
  { id: 'f-4', name: 'Archived Downloads', videoCount: 120, imageCount: 22 }
];

export const INITIAL_MEDIA: MediaItem[] = [
  { id: 'm-1', name: 'gadgets_preview_hd.mp4', type: 'video', sizeMB: 34.2, folderId: 'f-1', createdAt: '2026-03-18', duration: '0:58' },
  { id: 'm-2', name: 'quick_tips_tutorial.mp4', type: 'video', sizeMB: 48.6, folderId: 'f-1', createdAt: '2026-03-18', duration: '1:12' },
  { id: 'm-3', name: 'viral_moment_clip.mp4', type: 'video', sizeMB: 19.4, folderId: 'f-2', createdAt: '2026-03-17', duration: '0:45' },
  { id: 'm-4', name: 'workflow_guide_panel.mp4', type: 'video', sizeMB: 62.1, folderId: 'f-3', createdAt: '2026-03-16', duration: '1:45' },
  { id: 'm-5', name: 'promo_thumbnail_banner.png', type: 'image', sizeMB: 2.4, folderId: 'f-1', createdAt: '2026-03-15' },
  { id: 'm-6', name: 'daily_cover_art.jpg', type: 'image', sizeMB: 1.8, folderId: 'f-3', createdAt: '2026-03-14' }
];

export const INITIAL_YOUTUBE_CHANNELS: YouTubeChannel[] = [
  {
    id: 'yt-ch-1',
    name: 'Daily Shorts Studio',
    handle: '@dailyshortsstudio',
    accountEmail: 'creator@studio.app',
    status: 'healthy',
    autoUpload: true,
    subscribers: '142K',
    videoCount: 89,
    playlists: [
      { id: 'pl-1', playlist_name: 'Viral Shorts 2026', video_count: 54 },
      { id: 'pl-2', playlist_name: 'Creator Tips & Clips', video_count: 35 }
    ]
  },
  {
    id: 'yt-ch-2',
    name: 'Creative Clips Hub',
    handle: '@creativeclips',
    accountEmail: 'creator@studio.app',
    status: 'healthy',
    autoUpload: false,
    subscribers: '88K',
    videoCount: 145,
    playlists: [
      { id: 'pl-3', playlist_name: 'Top Highlights', video_count: 90 },
      { id: 'pl-4', playlist_name: 'Quick Tutorials', video_count: 55 }
    ]
  }
];

export const INITIAL_YOUTUBE_AUTOMATIONS: YouTubeAutomation[] = [
  {
    id: 'yt-auto-1',
    channelId: 'yt-ch-1',
    channelName: 'Daily Shorts Studio',
    channelHandle: '@dailyshortsstudio',
    sourceType: 'tiktok',
    sourceTarget: '#trending',
    status: 'active',
    frequencyPerDay: 4,
    times: ['12:00', '15:00', '18:00', '21:00'],
    tags: ['#shorts', '#viral', '#trending'],
    titleTemplate: '{title} #shorts #viral',
    visibility: 'public',
    bufferCount: 18,
    postedCount: 89,
    failedCount: 0,
    lastRun: '10 mins ago',
    nextRun: 'Today at 18:00'
  },
  {
    id: 'yt-auto-2',
    channelId: 'yt-ch-2',
    channelName: 'Creative Clips Hub',
    channelHandle: '@creativeclips',
    sourceType: 'tiktok',
    sourceTarget: '#creators',
    status: 'active',
    frequencyPerDay: 3,
    times: ['11:00', '16:00', '20:30'],
    tags: ['#shorts', '#creators', '#viralshorts'],
    titleTemplate: '{title} 🔥 #shorts',
    visibility: 'public',
    bufferCount: 12,
    postedCount: 145,
    failedCount: 1,
    lastRun: '1 hour ago',
    nextRun: 'Today at 20:30'
  }
];

export const INITIAL_YOUTUBE_JOBS: YouTubeUploadJob[] = [
  {
    id: 'job-9842',
    automationId: 'yt-auto-1',
    channelName: 'Daily Shorts Studio',
    channelHandle: '@dailyshortsstudio',
    title: 'Top Creative Workflow Tips #shorts #creators',
    visibility: 'public',
    status: 'queued',
    scheduledTime: 'Today at 18:00'
  },
  {
    id: 'job-9843',
    automationId: 'yt-auto-2',
    channelName: 'Creative Clips Hub',
    channelHandle: '@creativeclips',
    title: 'Daily Viral Moments Reel #shorts',
    visibility: 'public',
    status: 'published',
    scheduledTime: 'Today at 11:00',
    publishedAt: 'Today at 11:01'
  }
];

