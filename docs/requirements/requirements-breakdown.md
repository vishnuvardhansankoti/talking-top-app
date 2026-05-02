# Requirements Breakdown
## Talking Tom PWA - Technical Requirements & Constraints

**Generated:** May 1, 2026  
**Source:** PRD v1.0 Sections 8-12  
**Status:** [Final]

---

## 1. Performance Requirements

### 1.1 Initial Load Performance

| Metric | Target | Maximum | Measurement Method |
|--------|--------|---------|-------------------|
| **TTFB** (Time to First Byte) | < 200ms | 300ms | Lighthouse, WebPageTest |
| **FCP** (First Contentful Paint) | < 1.5s | 2.0s | Lighthouse Performance |
| **LCP** (Largest Contentful Paint) | < 2.5s | 3.0s | Core Web Vitals |
| **TTI** (Time to Interactive) | < 3.5s | 4.0s | Lighthouse Performance |
| **FID** (First Input Delay) | < 100ms | 150ms | Core Web Vitals |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.25 | Core Web Vitals |

**Network Conditions:**
- Target: 4G (4 Mbps down, 1 Mbps up, 50ms RTT)
- Test: Throttled 3G for edge case validation

---

### 1.2 Runtime Performance

#### Frame Rate Targets

| Device Class | Target FPS | Minimum FPS | Test Devices |
|--------------|-----------|-------------|--------------|
| **Desktop (High-end)** | 60 FPS | 55 FPS | MacBook Pro 2020+, Windows Desktop with GTX 1060+ |
| **Mobile (Flagship)** | 60 FPS | 55 FPS | iPhone 13+, Galaxy S21+, Pixel 6+ |
| **Mobile (Mid-range)** | 55 FPS | 45 FPS | iPhone 11/12, Galaxy A52, Pixel 4a |
| **Tablet** | 60 FPS | 50 FPS | iPad Air 2020+, Galaxy Tab S7+ |

**Performance Monitoring:**
- Use `requestAnimationFrame` delta to calculate FPS
- Log to console when FPS drops below minimum for > 2 seconds
- Trigger adaptive quality reduction if sustained low FPS

---

### 1.3 Memory Budget

| Category | Target | Maximum | Action on Exceed |
|----------|--------|---------|------------------|
| **WebGL Context** | < 150 MB | 200 MB | Reduce texture resolution, disable shadows |
| **JavaScript Heap** | < 50 MB | 75 MB | Clear animation queues, reduce cache |
| **Audio Buffers** | < 10 MB | 20 MB | Limit cached audio clips |
| **Total Memory** | < 200 MB | 300 MB | Trigger garbage collection, reduce quality |

**Memory Monitoring:**
- Use `performance.memory` (Chrome only) for development
- Test with Chrome DevTools Memory Profiler
- Run memory leak tests (capture audio 100x, check for leaks)

---

### 1.4 Asset Size Limits

| Asset Type | Max Size | Compression | Format |
|------------|----------|-------------|--------|
| **Character Model (.glb)** | 5 MB | Draco | Binary GLTF |
| **Sound Effects (all)** | 500 KB | MP3 128kbps | MP3 |
| **Icons (all sizes)** | 200 KB | PNG/WebP | PNG with transparency |
| **JavaScript Bundle** | 300 KB | Minify + Gzip | ESM chunks |
| **CSS Bundle** | 50 KB | Minify + Gzip | PostCSS |
| **HTML** | 10 KB | Minify | HTML5 |
| **Total App Size** | < 10 MB | All assets | Cached for offline |

---

## 2. Technical Architecture Constraints

### 2.1 Technology Stack (Fixed)

| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| **Framework** | SvelteKit | 2.x | SSG support, small bundle, fast |
| **3D Engine** | Three.js | 0.160+ | Industry standard, WebGL |
| **3D Framework** | Threlte | 7.x | Svelte + Three.js integration |
| **Build Tool** | Vite | 5.x | Fast HMR, modern bundler |
| **PWA Plugin** | Vite PWA Plugin | 0.19+ | Workbox integration |
| **Language** | TypeScript | 5.x | Type safety, better DX |
| **Testing (Unit)** | Vitest | 1.x | Fast, Vite-native |
| **Testing (E2E)** | Playwright | 1.40+ | Cross-browser, reliable |
| **CSS** | Tailwind CSS | 3.x | Utility-first, small bundle |

**Why These Technologies:**
- **SvelteKit SSG:** Static export for PWA, no server needed
- **Threlte:** Declarative 3D in Svelte, cleaner than raw Three.js
- **Vite:** Fast dev server, efficient code splitting
- **TypeScript:** Catch errors early, better refactoring
- **Vitest:** Faster than Jest, same API, Vite integration
- **Playwright:** More reliable than Puppeteer, better wait conditions

---

### 2.2 Browser Compatibility

#### Minimum Browser Versions

| Browser | Minimum Version | Market Share | Support Level |
|---------|----------------|--------------|---------------|
| **Chrome** | 90+ | 65% | Full support |
| **Safari** | 14+ (iOS 14+) | 20% | Full support |
| **Edge** | 90+ | 5% | Full support |
| **Firefox** | 88+ | 3% | Full support |
| **Samsung Internet** | 14+ | 2% | Full support |

**Not Supported:**
- Internet Explorer (any version)
- Opera Mini (no WebGL)
- UC Browser < 13 (poor WebGL)

**Feature Detection & Fallbacks:**
- WebGL: Required, show error if not available
- Web Speech API: Optional, show message if unavailable
- Service Worker: Required for PWA (HTTPS only)
- MediaRecorder API: Required for voice capture
- Web Audio API: Required for audio processing

---

### 2.3 Device Targets

#### Primary Devices (Must Work Perfectly)

| Device | OS | Screen | Notes |
|--------|----|---------| ------|
| **iPhone 13** | iOS 16+ | 390x844 | Primary mobile target |
| **iPhone SE (2nd gen)** | iOS 15+ | 375x667 | Small screen test |
| **Samsung Galaxy S21** | Android 12+ | 360x800 | Primary Android target |
| **iPad Air** | iPadOS 16+ | 820x1180 | Tablet landscape/portrait |
| **Pixel 6** | Android 13+ | 412x915 | Google reference device |

#### Secondary Devices (Should Work Well)

| Device | OS | Expected Performance |
|--------|----| ---------------------|
| iPhone 11/12 | iOS 15+ | 55+ FPS |
| Galaxy A52 | Android 11+ | 45-55 FPS |
| iPad 8th gen | iPadOS 14+ | 50+ FPS |
| Pixel 4a | Android 11+ | 45-55 FPS |

**Desktop:**
- Windows 10/11 with Chrome/Edge
- macOS 12+ with Safari/Chrome
- Linux (bonus, not primary target)

---

## 3. API & Web Platform Requirements

### 3.1 Web APIs Used

| API | Purpose | Fallback Strategy |
|-----|---------|-------------------|
| **WebGL 2.0 / WebGL 1.0** | 3D rendering | Error message if unavailable |
| **Web Speech API** | Voice recognition (optional) | Disable voice if unavailable, show message |
| **Web Audio API** | Audio processing | Critical, show error if unavailable |
| **MediaRecorder API** | Audio capture | Critical for voice, show error if unavailable |
| **Service Worker API** | Offline caching | Critical for PWA, warn if unavailable |
| **Cache API** | Asset storage | Use with Service Worker |
| **IndexedDB** | Settings persistence | Fallback to localStorage |
| **localStorage** | Simple key-value storage | Fallback for IndexedDB |
| **Intersection Observer** | Performance optimization | Fallback to scroll events |
| **ResizeObserver** | Responsive canvas | Fallback to resize events |
| **Vibration API** | Haptic feedback | Optional, silent fail |
| **Permissions API** | Microphone permission | Use navigator.mediaDevices.getUserMedia |
| **Network Information API** | Connection status | Optional, use navigator.onLine |

---

### 3.2 Security Requirements

#### Content Security Policy (CSP)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  media-src 'self' blob:;
  connect-src 'self';
  worker-src 'self';
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

**CSP Justifications:**
- `'wasm-unsafe-eval'`: Required for WebAssembly (Draco compression)
- `'unsafe-inline'` (styles): Svelte generates scoped inline styles
- `data:` / `blob:`: For canvas-generated images and audio blobs

---

#### HTTPS Requirement

**Mandatory HTTPS:**
- Service Worker requires secure context
- MediaDevices (microphone) requires HTTPS
- PWA installation requires HTTPS

**Local Development:**
- `localhost` exempt from HTTPS requirement
- Use `mkcert` for local HTTPS testing if needed

---

#### Dependency Security

**Audit Frequency:** Weekly (CI/CD pipeline)

**Audit Command:**
```bash
npm audit --audit-level=moderate
```

**Automatic Fixes:**
```bash
npm audit fix
```

**Critical Vulnerability Response:**
- Fix within 24 hours
- Deploy patch immediately
- Notify users if installed PWA needs update

---

### 3.3 Privacy Requirements

**Zero Data Collection:**
- No cookies (except essential for PWA)
- No analytics (unless privacy-preserving like Plausible)
- No user accounts
- No telemetry

**Audio Privacy:**
- Audio processed 100% locally (Web Audio API)
- No network transmission of audio data
- No saving audio to disk (ephemeral only)
- MediaStream tracks stopped immediately after use

**Permission Transparency:**
- Clear explanation before requesting microphone
- Visual indicator when microphone active
- Easy revoke mechanism

**Privacy Policy:**
- Must exist, even if short
- State: "No data collected"
- Explain local-only processing

---

## 4. Accessibility Requirements (WCAG 2.1 AA)

### 4.1 Keyboard Accessibility

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| **All interactive elements focusable** | WCAG 2.1.1 | tabindex="0" or native elements |
| **Visible focus indicators** | WCAG 2.4.7 | 2px outline, high contrast |
| **Logical tab order** | WCAG 2.4.3 | DOM order matches visual order |
| **No keyboard traps** | WCAG 2.1.2 | All modals escapable with Esc |
| **Skip navigation link** | WCAG 2.4.1 | Optional for single-page app |

---

### 4.2 Screen Reader Support

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| **ARIA labels** | WCAG 4.1.2 | aria-label on icon buttons |
| **Live region announcements** | WCAG 4.1.3 | aria-live="polite" for state changes |
| **Semantic HTML** | WCAG 1.3.1 | `<button>`, `<main>`, `<nav>`, `<header>` |
| **Alt text** | WCAG 1.1.1 | All images (icons have aria-label) |
| **Heading hierarchy** | WCAG 1.3.1 | h1 → h2 → h3 logical order |

---

### 4.3 Visual Accessibility

| Requirement | Standard | Target | Test Method |
|-------------|----------|--------|-------------|
| **Color contrast (text)** | WCAG 1.4.3 | ≥ 4.5:1 | WebAIM Contrast Checker |
| **Color contrast (UI)** | WCAG 1.4.11 | ≥ 3:1 | axe DevTools |
| **No color-only information** | WCAG 1.4.1 | Use icons + text | Manual review |
| **Text resize (200%)** | WCAG 1.4.4 | No horizontal scroll | Browser zoom test |
| **Reflow** | WCAG 1.4.10 | No loss of content | Responsive test |

---

### 4.4 Motion & Animation

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| **prefers-reduced-motion** | WCAG 2.3.3 | CSS media query + JS detection |
| **Pause/stop animations** | WCAG 2.2.2 | Settings toggle |
| **No auto-play audio** | WCAG 1.4.2 | User-initiated only |
| **No flashing content** | WCAG 2.3.1 | No flashes > 3/sec |

---

### 4.5 Touch Targets

| Element | Minimum Size | Standard | Notes |
|---------|-------------|----------|-------|
| **Primary buttons** | 60x60px | WCAG 2.5.5 (AAA) | Generous for ease |
| **Secondary buttons** | 44x44px | WCAG 2.5.5 (AA) | Minimum standard |
| **Touch spacing** | 8px gap | Best practice | Reduce mis-taps |

---

## 5. Testing Requirements

### 5.1 Unit Testing

**Coverage Target:** 70% minimum

**Frameworks:**
- Vitest for unit tests
- Testing Library (Svelte) for component tests

**Test Categories:**
- Audio utilities (pitch shift, VAD)
- Gesture detection logic
- Animation state machine
- Vector math utilities
- Storage helpers (localStorage, IndexedDB)

**Test Execution:**
```bash
npm run test:unit
npm run test:unit:watch  # Development
npm run test:unit:coverage  # Coverage report
```

---

### 5.2 Integration Testing

**Test Scenarios:**
1. Voice input → Processing → Playback (full pipeline)
2. Touch gesture → Raycast → Animation trigger
3. Asset loading → Caching → Offline access
4. Settings change → Persistence → Reload verification
5. State transitions (IDLE → LISTENING → SPEAKING)

**Tools:**
- Vitest for integration tests
- Mock Web APIs (MediaRecorder, SpeechRecognition)

---

### 5.3 End-to-End Testing

**Test Journeys:**
1. **First-time user:**
   - Open app → Grant mic permission → Speak → Hear playback
2. **Voice interaction:**
   - Tap mic → Speak → Playback with pitch shift
3. **Touch interactions:**
   - Tap head → See poke reaction
   - Swipe → See pet reaction
4. **Offline functionality:**
   - Load online → Go offline → Continue using
5. **Settings persistence:**
   - Change pitch → Close app → Reopen → Verify pitch saved

**Tools:**
- Playwright for E2E tests
- Real browsers (Chrome, Safari, Firefox)
- Mobile emulation + real device testing

**Execution:**
```bash
npm run test:e2e
npm run test:e2e:headed  # Visual debugging
npm run test:e2e:mobile  # Mobile emulation
```

---

### 5.4 Performance Testing

**Lighthouse CI:**
- Run on every build
- Enforce minimums:
  - Performance: ≥ 90
  - Accessibility: ≥ 90
  - Best Practices: ≥ 90
  - SEO: ≥ 90
  - PWA: ≥ 90

**Bundle Size Tracking:**
- Use `rollup-plugin-visualizer` or `webpack-bundle-analyzer`
- Alert if bundle grows > 10% without justification

**FPS Monitoring:**
- Manual testing with Stats.js or browser DevTools
- Capture 60-second sessions on target devices
- Log frame drops

---

### 5.5 Accessibility Testing

**Automated:**
- axe DevTools in CI
- Lighthouse accessibility audit
- Pa11y CI

**Manual:**
- VoiceOver (iOS) test scenarios
- TalkBack (Android) test scenarios
- Keyboard-only navigation
- Color blindness simulation (Chrome DevTools)
- Screen magnification (200% zoom)

---

### 5.6 Device Testing Matrix

| Device | Browser | Test Type | Frequency |
|--------|---------|-----------|-----------|
| iPhone 13 | Safari | E2E + Manual | Every release |
| Samsung S21 | Chrome | E2E + Manual | Every release |
| iPad Air | Safari | E2E + Manual | Weekly |
| Pixel 6 | Chrome | E2E + Manual | Weekly |
| Desktop | Chrome | Automated | Every commit |
| Desktop | Safari | Automated | Every commit |
| Desktop | Firefox | Automated | Every commit |

---

## 6. Deployment Requirements

### 6.1 Static Hosting

**Requirements:**
- HTTPS enforced (PWA + microphone require secure context)
- Global CDN (low latency worldwide)
- Automatic asset compression (Gzip, Brotli)
- HTTP/2 or HTTP/3 support

**Recommended Hosts:**
1. **Vercel** (primary)
   - Auto HTTPS
   - Global edge network
   - Zero config for SvelteKit
   - Free tier sufficient

2. **Netlify** (alternative)
   - Similar features to Vercel
   - Drag-and-drop deploy
   - Instant rollbacks

3. **Azure Static Web Apps** (enterprise)
   - Integrated with Azure services
   - Custom domains
   - API support (if needed later)

4. **GitHub Pages** (open-source)
   - Free for public repos
   - Custom domain support
   - Simple deployment

---

### 6.2 Build Process

**Production Build Command:**
```bash
npm run build
```

**Build Output:**
- `/build` directory (SvelteKit adapter-static)
- All files static (HTML, CSS, JS, assets)
- Service worker generated by Vite PWA Plugin
- Manifest.json included

**Build Optimizations:**
- Minification (JS, CSS, HTML)
- Tree shaking (remove unused code)
- Code splitting (vendor, app chunks)
- Asset compression (images, sounds)
- Draco compression for .glb models
- Source maps (development only)

---

### 6.3 Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Lighthouse score > 90 (all categories)
- [ ] Bundle size within budget
- [ ] No console errors or warnings
- [ ] Service worker tested offline
- [ ] Cross-browser testing complete
- [ ] Security headers configured
- [ ] Manifest.json validated
- [ ] Icons in all required sizes (192, 512)
- [ ] Privacy policy page added
- [ ] README updated with deployment info

**Post-Deployment:**
- [ ] Test live URL in Chrome, Safari, Firefox
- [ ] Install PWA on iOS device (Add to Home Screen)
- [ ] Install PWA on Android device (Install App)
- [ ] Verify offline functionality
- [ ] Check console for errors
- [ ] Test microphone permission flow
- [ ] Verify voice interaction works
- [ ] Test touch interactions
- [ ] Check performance on real devices
- [ ] Validate service worker updates correctly

---

### 6.4 Environment Configuration

**Environment Variables:**
```
# .env.example
PUBLIC_APP_VERSION=1.0.0
PUBLIC_API_URL=  # Not used in MVP (no backend)
```

**Build-time Constants:**
- App version (from package.json)
- Build timestamp
- Environment (development, staging, production)

---

## 7. Quality Gates

### 7.1 Definition of Done (DoD)

**For Each User Story:**
- [ ] Code written and reviewed
- [ ] Unit tests written (70%+ coverage for that module)
- [ ] Integration tests written (if applicable)
- [ ] E2E test written (for user-facing features)
- [ ] Manual testing on target devices
- [ ] Accessibility audit passed (no critical issues)
- [ ] Performance benchmarks met (FPS, load time)
- [ ] Documentation updated (code comments, README)
- [ ] No console errors or warnings
- [ ] Merged to main branch

---

### 7.2 Phase Gate Criteria

**Discovery Phase → Design Phase:**
- [ ] PRD approved
- [ ] User stories documented
- [ ] Acceptance criteria [Final]
- [ ] Requirements breakdown complete
- [ ] Feature dependencies mapped

**Design Phase → Development Phase:**
- [ ] Architecture Decision Record (ADR) approved
- [ ] Database schema defined (if needed - not for MVP)
- [ ] Component hierarchy designed
- [ ] API contracts defined (not for MVP)
- [ ] Design review complete

**Development Phase → Testing Phase:**
- [ ] All user stories implemented
- [ ] Code review complete
- [ ] Unit test coverage ≥ 70%
- [ ] Integration tests complete
- [ ] No critical bugs
- [ ] Performance targets met

**Testing Phase → Release:**
- [ ] E2E tests complete
- [ ] Accessibility audit passed
- [ ] Performance audit passed (Lighthouse > 90)
- [ ] Security audit passed
- [ ] Device matrix testing complete
- [ ] UAT (User Acceptance Testing) passed
- [ ] Documentation complete
- [ ] Deployment checklist verified

---

## 8. Known Limitations & Constraints

### 8.1 Technical Limitations

**Browser APIs:**
- Web Speech API not available on Firefox (voice features disabled)
- Safari requires user gesture to play audio (Web Audio API)
- iOS Safari limits audio playback without user interaction

**3D Performance:**
- Low-end devices (<2018) may struggle with 60 FPS
- WebGL not available on very old browsers (IE11, Opera Mini)
- Mobile GPU memory limits (reduce textures if OOM errors)

**Offline Limitations:**
- Cache storage quota varies by browser (50MB-500MB)
- Service worker updates require page reload or user action
- IndexedDB not available in private browsing (fallback to memory)

---

### 8.2 Scope Exclusions (Not in MVP)

**Out of Scope:**
- User accounts / authentication
- Backend API / server communication
- Social features (leaderboards, sharing beyond static image)
- In-app purchases / monetization
- Multiple character models
- Character customization (colors, accessories)
- Mini-games
- AI chatbot responses
- Cloud sync of settings

**Future Enhancements:**
- Advanced voice effects (robot, alien voices)
- Emotion detection in voice
- More complex animations (facial expressions beyond basics)
- AR mode (camera + character overlay)
- Multiplayer interactions

---

## 9. Risk Management

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Performance on low-end devices** | High | High | Implement adaptive quality, LOD system |
| **Browser compatibility issues** | Medium | Medium | Feature detection, graceful degradation |
| **Asset size exceeds budget** | Medium | High | Aggressive optimization, Draco compression |
| **Audio processing latency** | Low | Medium | Optimize audio pipeline, reduce buffer size |
| **Service worker bugs** | Medium | High | Extensive offline testing, fallback to network |

---

### 9.2 UX Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **User doesn't grant mic permission** | High | Medium | Emphasize touch interactions still work |
| **User confused by interface** | Medium | High | User testing, clear onboarding, tooltips |
| **Motion sickness from 3D** | Low | Medium | Reduce camera movement, prefers-reduced-motion |
| **Long load time frustrates users** | Medium | High | Progressive loading, skeleton screens |

---

## 10. Success Metrics

### 10.1 Technical KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Lighthouse Performance** | ≥ 90 | Lighthouse CI |
| **Lighthouse Accessibility** | ≥ 90 | Lighthouse CI |
| **Average FPS (mobile)** | ≥ 55 | Real device testing |
| **Initial Load Time (4G)** | < 3.5s | WebPageTest |
| **PWA Install Rate** | ≥ 30% | Analytics (if added) |
| **Error Rate** | < 0.5% | Error tracking (if added) |
| **Offline Success Rate** | ≥ 99% | E2E tests |

---

### 10.2 User Metrics (If Analytics Added)

| Metric | Target | Notes |
|--------|--------|-------|
| **Daily Active Users** | 1,000+ after 3 months | Growth target |
| **Average Session Duration** | 3-5 minutes | Engagement |
| **Return Rate (7 days)** | ≥ 40% | Retention |
| **Voice Feature Usage** | ≥ 70% | Core feature |
| **Touch Interaction Usage** | ≥ 90% | Core feature |

---

**Document Status:** [Final]  
**Technical Constraints Defined:** ✅ Yes  
**Performance Targets Quantified:** ✅ Yes  
**Browser/Device Matrix Complete:** ✅ Yes  
**Testing Strategy Documented:** ✅ Yes  
**Quality Gates Established:** ✅ Yes  
**Ready for Architecture Phase:** ✅ Yes
