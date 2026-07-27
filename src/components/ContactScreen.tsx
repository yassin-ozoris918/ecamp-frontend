import { Phone, MessageCircle, Laptop, BookOpen, HelpCircle, Facebook, Youtube, Linkedin, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ContactScreen() {
  const { t } = useTranslation();

  const supportChannels = [
    {
      id: 'tech',
      icon: <Laptop className="w-6 h-6 text-accent-500" />,
      title: t('contact.techSupport'),
      description: t('contact.techSupportDesc'),
      phone: '+20 100 000 0001',
      whatsapp: '+20 100 000 0001',
      bgClass: 'bg-accent-500/10 border-accent-500/20'
    },
    {
      id: 'academic',
      icon: <BookOpen className="w-6 h-6 text-secondary-500" />,
      title: t('contact.academicSupport'),
      description: t('contact.academicSupportDesc'),
      phone: '+20 100 000 0002',
      whatsapp: '+20 100 000 0002',
      bgClass: 'bg-secondary-500/10 border-secondary-500/20'
    },
    {
      id: 'inquiries',
      icon: <HelpCircle className="w-6 h-6 text-gold-500" />,
      title: t('contact.inquiries'),
      description: t('contact.inquiriesDesc'),
      phone: '+20 100 000 0003',
      whatsapp: '+20 100 000 0003',
      bgClass: 'bg-gold-500/10 border-gold-500/20'
    }
  ];

  const socialLinks = [
    { name: 'Facebook', icon: <Facebook className="w-6 h-6" />, href: '#', color: 'text-blue-500', bg: 'bg-blue-500/10 hover:bg-blue-500/20' },
    { name: 'YouTube', icon: <Youtube className="w-6 h-6" />, href: '#', color: 'text-red-500', bg: 'bg-red-500/10 hover:bg-red-500/20' },
    { name: 'LinkedIn', icon: <Linkedin className="w-6 h-6" />, href: '#', color: 'text-sky-600', bg: 'bg-sky-600/10 hover:bg-sky-600/20' },
    { name: 'Telegram', icon: <Send className="w-6 h-6" />, href: '#', color: 'text-cyan-500', bg: 'bg-cyan-500/10 hover:bg-cyan-500/20' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-up">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-display font-bold text-theme-text mb-4">
          {t('contact.title')}
        </h1>
        <p className="text-lg text-theme-muted">
          {t('contact.subtitle')}
        </p>
      </div>

      {/* Support Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {supportChannels.map((channel) => (
          <div key={channel.id} className={`glass rounded-2xl p-6 border ${channel.bgClass} flex flex-col items-center text-center transition-all hover:scale-[1.02]`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-theme-bg shadow-sm`}>
              {channel.icon}
            </div>
            <h3 className="text-xl font-bold text-theme-text mb-2">{channel.title}</h3>
            <p className="text-sm text-theme-muted mb-6 flex-1">
              {channel.description}
            </p>
            
            <div className="w-full space-y-3">
              <a 
                href={`https://wa.me/${channel.whatsapp.replace(/[^0-9]/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full btn bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
              >
                <MessageCircle className="w-4 h-4" />
                {t('contact.chatWhatsApp')}
              </a>
              <a 
                href={`tel:${channel.phone.replace(/[^0-9+]/g, '')}`} 
                className="w-full btn bg-theme-bg text-theme-text border border-theme-border hover:bg-theme-secondary"
              >
                <Phone className="w-4 h-4 text-theme-muted" />
                {t('contact.callNow')}
              </a>
              <div className="text-xs font-mono text-theme-muted mt-2">
                {channel.phone}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Social Media Section */}
      <div className="pt-8 border-t border-theme-border">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-theme-text mb-2">
            {t('contact.socialMedia')}
          </h2>
          <p className="text-theme-muted">
            {t('contact.socialMediaDesc')}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-semibold transition-all ${social.color} ${social.bg} border border-transparent hover:border-current/10`}
            >
              {social.icon}
              {social.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
