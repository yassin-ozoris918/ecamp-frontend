import { Linkedin, Twitter, ExternalLink, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function InstructorsScreen() {
  const { t } = useTranslation();

  const INSTRUCTORS = [
    {
      id: 'inst_1',
      name: 'Dr. Ahmed Youssef',
      title: 'Senior Structural Engineer',
      bio: 'Ph.D. in Civil Engineering. Over 15 years of experience designing high-rise commercial buildings across the MENA region. Passionate about teaching modern SAP2000 techniques.',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=400',
      social: {
        linkedin: '#',
        twitter: '#'
      }
    },
    {
      id: 'inst_2',
      name: 'Eng. Sarah Mahmoud',
      title: 'MEP Systems Consultant',
      bio: 'Leading expert in Mechanical, Electrical, and Plumbing engineering. Has certified over 2,000 students in advanced Revit MEP and sustainable energy system design.',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=400',
      social: {
        linkedin: '#'
      }
    },
    {
      id: 'inst_3',
      name: 'Dr. Tarek Hassan',
      title: 'Architectural Director',
      bio: 'Award-winning architect focusing on parametric design and smart cities. Brings a unique blend of creative vision and technical precision to his AutoCAD and 3ds Max masterclasses.',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=400',
      social: {
        linkedin: '#',
        twitter: '#'
      }
    },
    {
      id: 'inst_4',
      name: 'Eng. Omar Farouk',
      title: 'Geotechnical Specialist',
      bio: 'Specializes in foundation design and soil mechanics. Former lead consultant at mega-projects in the New Capital. Known for his hands-on, practical teaching style.',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400',
      social: {
        linkedin: '#'
      }
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-up">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-500/10 text-accent-500 mb-6">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-display font-bold text-theme-text mb-4">
          {t('instructors.title')}
        </h1>
        <p className="text-lg text-theme-muted">
          {t('instructors.subtitle')}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {INSTRUCTORS.map((instructor) => (
          <div key={instructor.id} className="glass rounded-3xl overflow-hidden flex flex-col group border border-theme-border hover:border-accent-500/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-accent-500/5">
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-theme-secondary">
              <img 
                src={instructor.image} 
                alt={instructor.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60" />
              
              {/* Social Overlay */}
              <div className="absolute bottom-4 start-4 flex items-center gap-2">
                {instructor.social.linkedin && (
                  <a href={instructor.social.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-blue-500 transition-colors">
                    <Linkedin className="w-4 h-4 fill-current" />
                  </a>
                )}
                {instructor.social.twitter && (
                  <a href={instructor.social.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-sky-400 transition-colors">
                    <Twitter className="w-4 h-4 fill-current" />
                  </a>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-xl font-bold text-theme-text">{instructor.name}</h3>
              <p className="text-accent-600 dark:text-accent-400 font-medium text-sm mt-1 mb-4">{instructor.title}</p>
              <p className="text-sm text-theme-muted leading-relaxed flex-1">
                {instructor.bio}
              </p>
              
              {/* Optional CTA */}
              <button className="mt-6 w-full btn bg-theme-bg text-theme-text border border-theme-border hover:bg-theme-secondary hover:text-accent-500 group/btn">
                <span>{t('instructors.viewCourses')}</span>
                <ExternalLink className="w-4 h-4 text-theme-muted group-hover/btn:text-accent-500 transition-colors" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
