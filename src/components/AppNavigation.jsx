import React, { useMemo, useState } from 'react';
import { TRACKS, getTrackSections, getPracticeSections, getStatusSections, getTrack, trackPath } from './navigation/navItems.js';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './ui/navigation-menu.jsx';

function pathInfo(pathname) {
  const topicMatch = pathname.match(/^\/tracks\/([^/]+)\/topics\/([^/]+)/);
  if (topicMatch) return { trackId: topicMatch[1], section: 'topics', topicSlug: topicMatch[2] };
  const match = pathname.match(/^\/tracks\/([^/]+)(?:\/([^/]+))?/);
  if (match) return { trackId: match[1], section: match[2] || 'overview' };
  return { trackId: null, section: null };
}

function SectionLink({ trackId, section, currentTrackId, currentSection }) {
  const active = currentTrackId === trackId && currentSection === section.id;
  return (
    <NavigationMenuLink href={trackPath(trackId, section.id)} active={active}>
      <span>{section.label}</span>
      <small>{section.description}</small>
    </NavigationMenuLink>
  );
}

function TrackCard({ track, currentTrackId, currentSection }) {
  const trackSections = getTrackSections(track.id);
  return (
    <article className={`nav-track-card ${track.id}`}>
      <div>
        <p className="eyebrow">{track.code}</p>
        <h3>{track.name}</h3>
        <p>{track.description}</p>
      </div>
      <div className="nav-section-grid">
        {trackSections.map((section) => <SectionLink key={section.id} trackId={track.id} section={section} currentTrackId={currentTrackId} currentSection={currentSection} />)}
      </div>
    </article>
  );
}

function MobileTrackGroup({ track, currentTrackId, currentSection }) {
  const trackSections = getTrackSections(track.id);
  return (
    <details className="mobile-nav__group" open={track.id === currentTrackId}>
      <summary>{track.code} · {track.name}</summary>
      <div>
        {trackSections.map((section) => <a key={section.id} href={trackPath(track.id, section.id)} aria-current={currentTrackId === track.id && currentSection === section.id ? 'page' : undefined}>{section.label}</a>)}
      </div>
    </details>
  );
}

export function AppNavigation({ pathname }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { trackId, section } = useMemo(() => pathInfo(pathname), [pathname]);
  const currentTrack = getTrack(trackId);
  const defaultPracticeTrack = trackId || TRACKS[0].id;
  const currentTrackSections = useMemo(() => trackId ? getTrackSections(trackId) : [], [trackId]);
  const currentPracticeSections = useMemo(() => getPracticeSections(defaultPracticeTrack), [defaultPracticeTrack]);
  const currentStatusSections = useMemo(() => getStatusSections(defaultPracticeTrack), [defaultPracticeTrack]);
  const isUploads = pathname.startsWith('/uploads') || section === 'uploads';
  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="app-nav-shell">
      <div className="app-nav cinematic-surface">
        <a className="app-nav__brand" href="/" aria-current={pathname === '/' ? 'page' : undefined}>
          <span className="app-nav__brand-mark">VL</span>
          <span><strong>Vion Learning</strong><small>private AWS trainer</small></span>
        </a>

        <NavigationMenu className="app-nav__desktop" aria-label="Primary navigation">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink href="/" active={pathname === '/'}>Home<small>Track choice and freshness</small></NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Tracks</NavigationMenuTrigger>
              <NavigationMenuContent className="navigation-menu__content--wide">
                <div className="nav-track-grid">
                  {TRACKS.map((track) => <TrackCard key={track.id} track={track} currentTrackId={trackId} currentSection={section} />)}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Practice</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="nav-action-grid">
                  {currentPracticeSections.map((item) => <SectionLink key={item.id} trackId={defaultPracticeTrack} section={item} currentTrackId={trackId} currentSection={section} />)}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Progress & Sources</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="nav-action-grid nav-action-grid--compact">
                  {currentStatusSections.map((item) => <SectionLink key={item.id} trackId={defaultPracticeTrack} section={item} currentTrackId={trackId} currentSection={section} />)}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href={trackId ? `/uploads?trackId=${trackId}` : '/uploads'} active={isUploads}>Uploads<small>Verify and ingest sources</small></NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="app-nav__utility">
          {currentTrack && <a className="app-nav__chip" href={trackPath(currentTrack.id, section || 'overview')}>{currentTrack.code}</a>}
          <a className="button button-ghost app-nav__export" href="/api/admin/export">Export progress</a>
          <button className="app-nav__mobile-toggle" type="button" aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen((open) => !open)}>Menu</button>
        </div>
      </div>

      {mobileOpen && <nav className="mobile-nav cinematic-surface" id="mobile-navigation" aria-label="Mobile navigation">
        <a onClick={closeMobile} href="/" aria-current={pathname === '/' ? 'page' : undefined}>Home</a>
        <a onClick={closeMobile} href={trackId ? `/uploads?trackId=${trackId}` : '/uploads'} aria-current={isUploads ? 'page' : undefined}>Uploads</a>
        {currentTrack && <div className="mobile-nav__quick-links">
          <p className="eyebrow">Current track</p>
          {currentTrackSections.map((item) => <a key={item.id} onClick={closeMobile} href={trackPath(currentTrack.id, item.id)} aria-current={section === item.id ? 'page' : undefined}>{item.label}</a>)}
        </div>}
        {TRACKS.map((track) => <MobileTrackGroup key={track.id} track={track} currentTrackId={trackId} currentSection={section} />)}
        <a onClick={closeMobile} href="/api/admin/export">Export progress</a>
      </nav>}
    </header>
  );
}
