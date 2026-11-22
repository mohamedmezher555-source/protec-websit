import { useCallback, useEffect, useState } from 'react';
import { AboutSection } from './components/AboutSection';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginPage } from './components/admin/AdminLoginPage';
import { ContactFooter } from './components/ContactFooter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { OffersSection } from './components/OffersSection';
import { ProjectsSection } from './components/ProjectsSection';
import { QuoteSection } from './components/QuoteSection';
import { ServicesSection } from './components/ServicesSection';
import { TestimonialSection } from './components/TestimonialSection';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import {
  DEFAULT_OFFERS,
  DEFAULT_PROJECTS,
  DEFAULT_SERVICES,
  DEFAULT_SITE_CONTENT,
  DEFAULT_TESTIMONIALS,
} from './data/protecDefaults';
import { fetchServerPublicCatalog } from './lib/adminApi';
import {
  fetchOffers,
  fetchProjects,
  fetchServices,
  fetchSiteContent,
} from './lib/firestoreService';
import {
  Language,
  OfferItem,
  ProjectItem,
  ServiceItem,
  SiteContent,
} from './types';
import {
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  ThemeMode,
  toggleThemeValue,
} from './utils/theme';

function MainApp() {
  const { isFullyAuthenticatedAdmin } = useAdminAuth();
  const [lang, setLang] = useState<Language>('ar');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      const prefersDark =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      return resolveInitialTheme(stored, prefersDark);
    } catch {
      return 'light';
    }
  });
  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    return (
      window.location.pathname === '/admin' ||
      window.location.hash === '#admin'
    );
  });

  useEffect(() => {
    const syncAdminRoute = () => {
      setIsAdminView(
        window.location.pathname === '/admin' || window.location.hash === '#admin'
      );
    };
    window.addEventListener('hashchange', syncAdminRoute);
    window.addEventListener('popstate', syncAdminRoute);
    return () => {
      window.removeEventListener('hashchange', syncAdminRoute);
      window.removeEventListener('popstate', syncAdminRoute);
    };
  }, []);

  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [projects, setProjects] = useState<ProjectItem[]>(DEFAULT_PROJECTS);
  const [offers, setOffers] = useState<OfferItem[]>(DEFAULT_OFFERS);

  const [selectedServiceSlug, setSelectedServiceSlug] = useState<string | undefined>(undefined);
  const [selectedOffer, setSelectedOffer] = useState<OfferItem | null>(null);

  const loadPublicData = useCallback(async () => {
    const [firestoreResults, serverRes] = await Promise.all([
      Promise.allSettled([
        fetchSiteContent(),
        fetchServices(),
        fetchProjects(),
        fetchOffers(),
      ]),
      fetchServerPublicCatalog().catch(() => null),
    ]);

    const [contentRes, servicesRes, projectsRes, offersRes] = firestoreResults;

    if (serverRes?.siteContent) {
      setSiteContent(serverRes.siteContent);
    } else if (contentRes.status === 'fulfilled') {
      setSiteContent(contentRes.value);
    }

    if (serverRes?.services) {
      setServices(serverRes.services);
    } else if (servicesRes.status === 'fulfilled') {
      setServices(servicesRes.value);
    }

    if (serverRes?.projects) {
      setProjects(serverRes.projects);
    } else if (projectsRes.status === 'fulfilled') {
      setProjects(projectsRes.value);
    }

    if (serverRes?.offers) {
      setOffers(serverRes.offers);
    } else if (offersRes.status === 'fulfilled') {
      setOffers(offersRes.value);
    }
  }, []);

  useEffect(() => {
    void loadPublicData();
  }, [loadPublicData]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors in restricted iframes
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title =
      lang === 'ar'
        ? 'Protec | بروتك — وقاية النبات واللاندسكيب وتنسيق الحدائق'
        : 'Protec — Plant Protection, Pest Control & Architectural Landscaping';
  }, [lang]);

  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectServiceForQuote = (slug: string) => {
    setSelectedServiceSlug(slug);
    setSelectedOffer(null);
    scrollToSection('quote');
  };

  const handleClaimOffer = (offer: OfferItem) => {
    setSelectedOffer(offer);
    setSelectedServiceSlug(offer.serviceType);
    scrollToSection('quote');
  };

  const openAdminPortal = () => {
    setIsAdminView(true);
    window.history.replaceState(null, '', '#admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const exitAdminPortal = () => {
    setIsAdminView(false);
    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', '#top');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09110C] text-[#102116] dark:text-[#ECF4EE] transition-colors duration-200">
      <Navbar
        lang={lang}
        theme={theme}
        onToggleLang={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
        onToggleTheme={() => setTheme((prev) => toggleThemeValue(prev))}
        onNavigate={scrollToSection}
        isAdminView={isAdminView}
        onExitAdmin={exitAdminPortal}
      />

      {isAdminView ? (
        <main className="flex-1">
          {isFullyAuthenticatedAdmin ? (
            <AdminDashboard
              lang={lang}
              siteContent={siteContent}
              services={services}
              projects={projects}
              offers={offers}
              onRefreshPublicData={loadPublicData}
              onBackToSite={exitAdminPortal}
            />
          ) : (
            <AdminLoginPage lang={lang} onBackToSite={exitAdminPortal} />
          )}
        </main>
      ) : (
        <main className="flex-1">
          <HeroSection
            lang={lang}
            content={siteContent}
            servicesCount={services.filter((s) => s.active).length}
            onRequestQuote={() => scrollToSection('quote')}
            onExploreServices={() => scrollToSection('services')}
          />

          <AboutSection lang={lang} content={siteContent} />

          <ServicesSection
            lang={lang}
            services={services}
            onSelectServiceForQuote={handleSelectServiceForQuote}
          />

          <ProjectsSection lang={lang} projects={projects} />

          <TestimonialSection lang={lang} testimonials={DEFAULT_TESTIMONIALS} />

          <OffersSection
            lang={lang}
            offers={offers}
            whatsappNumber={siteContent.whatsappNumber}
            onClaimOffer={handleClaimOffer}
          />

          <QuoteSection
            lang={lang}
            services={services}
            preselectedServiceSlug={selectedServiceSlug}
            preselectedOffer={selectedOffer}
            onClearPreselectedOffer={() => setSelectedOffer(null)}
          />

          <ContactFooter
            lang={lang}
            content={siteContent}
            onOpenAdmin={openAdminPortal}
          />
        </main>
      )}

      <FloatingWhatsAppButton
        lang={lang}
        whatsappNumber={siteContent.whatsappNumber}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AdminAuthProvider>
        <MainApp />
      </AdminAuthProvider>
    </ErrorBoundary>
  );
}
