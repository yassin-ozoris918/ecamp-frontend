import { useState, useEffect } from 'react';
import { PlayCircle, HelpCircle, LifeBuoy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Skeleton } from './ui';
import { useTranslation } from 'react-i18next';

interface HelpCategory {
  id: string;
  titleAr: string;
  titleEn: string;
}

interface HelpVideo {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sourceType: 'CLOUDFLARE' | 'EXTERNAL';
  cloudflareId: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  categoryId: string;
  category: HelpCategory;
}

export function HelpCenter() {
  const { t, i18n } = useTranslation();
  const [tutorials, setTutorials] = useState<HelpVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTutorials();
  }, []);

  async function loadTutorials() {
    setLoading(true);
    try {
      const { data } = await api.get('/tutorials');
      setTutorials(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Group by category
  const categorized = tutorials.reduce((acc, curr) => {
    const catId = curr.categoryId;
    if (!acc[catId]) {
      acc[catId] = {
        category: curr.category,
        videos: [],
      };
    }
    acc[catId].videos.push(curr);
    return acc;
  }, {} as Record<string, { category: HelpCategory; videos: HelpVideo[] }>);

  const isAr = i18n.language === 'ar';

  const parseDescriptionTimestamps = (desc: string | null, onSeek: (sec: number) => void) => {
    if (!desc) return null;
    const regex = /(?:([0-5]?\d):)?([0-5]?\d):([0-5]\d)/g;
    const regexShort = /([0-5]?\d):([0-5]\d)/g;

    let parts = [];
    let lastIndex = 0;
    
    // Simple replacement strategy: split by newlines, then find timestamps
    const lines = desc.split('\n');
    return lines.map((line, idx) => {
      const segments: React.ReactNode[] = [];
      let match;
      let lastSegIndex = 0;
      
      const timeRegex = /((?:[0-5]?\d:)?[0-5]?\d:[0-5]\d)/g;
      
      while ((match = timeRegex.exec(line)) !== null) {
        segments.push(<span key={`text-${lastSegIndex}`}>{line.substring(lastSegIndex, match.index)}</span>);
        
        const timeStr = match[0];
        const timeParts = timeStr.split(':').map(Number);
        let seconds = 0;
        if (timeParts.length === 3) {
          seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
        } else {
          seconds = timeParts[0] * 60 + timeParts[1];
        }

        segments.push(
          <button
            key={`time-${match.index}`}
            onClick={() => onSeek(seconds)}
            className="text-accent-600 dark:text-accent-400 font-mono font-medium hover:underline bg-accent-500/10 px-1 rounded mx-1"
          >
            {timeStr}
          </button>
        );
        lastSegIndex = timeRegex.lastIndex;
      }
      segments.push(<span key={`text-end`}>{line.substring(lastSegIndex)}</span>);
      
      return <div key={idx} className="mb-1">{segments}</div>;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (tutorials.length === 0) {
    return (
      <div className="text-center py-20 glass rounded-2xl">
        <HelpCircle className="w-12 h-12 text-theme-muted mx-auto mb-4" />
        <h3 className="text-xl font-bold text-theme-text">{t('help.noTutorials', 'No tutorials available')}</h3>
        <p className="text-theme-muted mt-2">{t('help.noTutorialsDesc', 'Check back later for guides and help videos.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {Object.values(categorized).map(({ category, videos }) => (
        <div key={category.id} className="space-y-4">
          <h2 className="text-xl font-display font-bold text-theme-text border-b border-theme-border pb-2">
            {isAr ? category.titleAr : category.titleEn}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map(video => {
              const isExpanded = expandedVideoId === video.id;
              const title = isAr ? video.titleAr : video.titleEn;
              const desc = isAr ? video.descriptionAr : video.descriptionEn;
              
              return (
                <div key={video.id} className="glass rounded-xl overflow-hidden border border-theme-border transition-all">
                  <div 
                    className="p-4 cursor-pointer flex justify-between items-start hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedVideoId(isExpanded ? null : video.id)}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 shrink-0">
                        <PlayCircle className="w-6 h-6 text-accent-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-theme-text text-lg">{title}</h3>
                        {video.sourceType === 'EXTERNAL' && (
                          <Badge variant="outline" className="mt-1 text-xs">{t('help.externalVideo', 'External Video')}</Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-theme-muted" /> : <ChevronDown className="w-5 h-5 text-theme-muted" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-theme-border/50 animate-fade-down">
                      {/* Video Player */}
                      <div className="mt-4 aspect-video bg-black rounded-lg overflow-hidden relative">
                        {video.sourceType === 'EXTERNAL' ? (
                          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-theme-secondary/20">
                            <ExternalLink className="w-10 h-10 text-theme-muted mb-3" />
                            <p className="text-theme-text mb-4">{t('help.watchExternal', 'This video is hosted externally.')}</p>
                            <a 
                              href={video.externalUrl!} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-primary"
                            >
                              {t('help.openVideo', 'Open Video')}
                            </a>
                          </div>
                        ) : video.cloudflareId ? (
                          <video 
                            id={`video-${video.id}`}
                            className="w-full h-full" 
                            controls 
                            controlsList="nodownload"
                            poster={video.thumbnailUrl || undefined}
                            src={video.cloudflareId.includes('cloudflarestream.com') ? undefined : video.cloudflareId} // If R2 url, it's direct src. If cloudflare stream, maybe we need iframe?
                          >
                            {/* If it was Cloudflare stream, we'd use iframe, but since upload is R2, cloudflareId is actually R2 assetUrl */}
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <div className="flex items-center justify-center h-full text-theme-muted">
                            {t('help.videoUnavailable', 'Video unavailable')}
                          </div>
                        )}
                      </div>

                      {/* Description with clickable timestamps */}
                      {desc && (
                        <div className="mt-4 text-sm text-theme-muted whitespace-pre-line leading-relaxed p-3 bg-theme-bg/50 rounded-lg">
                          {parseDescriptionTimestamps(desc, (sec) => {
                            const vidElement = document.getElementById(`video-${video.id}`) as HTMLVideoElement;
                            if (vidElement) {
                              vidElement.currentTime = sec;
                              vidElement.play().catch(() => {});
                            }
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Support CTA */}
      <div className="mt-12 p-6 glass rounded-2xl border-t-4 border-t-accent-500 text-center flex flex-col items-center">
        <LifeBuoy className="w-12 h-12 text-accent-500 mb-3" />
        <h3 className="text-xl font-bold text-theme-text">{t('help.stillNeedHelp', 'Still Need Help?')}</h3>
        <p className="text-theme-muted mt-2 max-w-md">
          {t('help.supportDesc', 'If you couldn\'t find the answer to your question, our support team is here to help.')}
        </p>
        <a 
          href="/contact" 
          className="mt-5 btn-primary"
        >
          {t('help.contactSupport', 'Contact Support')}
        </a>
      </div>
    </div>
  );
}
