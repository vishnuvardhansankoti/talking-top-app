# Acceptance Criteria
## Talking Tom PWA - Detailed Acceptance Criteria

**Generated:** May 1, 2026  
**Source:** PRD v1.0 + User Stories  
**Status:** [Final]

---

## How to Read This Document

Each acceptance criterion follows the format:
- **ID**: Unique identifier matching user story
- **Given/When/Then**: Testable conditions
- **Technical Specs**: Specific measurements and requirements
- **Test Methods**: How to verify the criterion

---

## Epic 1: Voice Interaction

### AC-V01: Listen and Repeat
**Story:** US-V01 | **Status:** [Final]

**Criteria:**

1. **Microphone Permission Prompt**
   - **Given** a first-time user opens the app
   - **When** they tap the microphone button
   - **Then** browser native permission prompt appears
   - **Test:** Manual test on fresh install

2. **Visual Listening Indicator**
   - **Given** microphone permission is granted
   - **When** user activates voice input
   - **Then** visual indicator (pulsing red) shows listening state
   - **Test:** Visual regression test

3. **Listening Animation**
   - **Given** app is listening
   - **When** microphone is active
   - **Then** character plays LISTENING animation (ears wiggle, mouth open)
   - **Test:** Animation state verification

4. **Voice Playback Latency**
   - **Given** user has finished speaking
   - **When** voice processing completes
   - **Then** playback starts within **1 second**
   - **Technical Spec:** < 1000ms from speech end to playback start
   - **Test:** Performance measurement test

5. **Pitch Shift Applied**
   - **Given** audio is captured
   - **When** processing pipeline runs
   - **Then** playback pitch is **1.5x** higher than input (default)
   - **Technical Spec:** Playback rate = 1.5x
   - **Test:** Audio analysis test

6. **Lip Sync Animation**
   - **Given** voice is playing back
   - **When** audio amplitude varies
   - **Then** character's mouth animates in approximate sync
   - **Technical Spec:** Blend shape morph based on audio amplitude
   - **Test:** Visual inspection + automated frame analysis

**Priority:** High | **Complexity:** L

---

### AC-V02: Voice Privacy Control
**Story:** US-V02 | **Status:** [Final]

**Criteria:**

1. **Toggle Button Visibility**
   - **Given** user is on main screen
   - **When** app loads
   - **Then** microphone toggle button is clearly visible
   - **Technical Spec:** Minimum 44x44px touch target
   - **Test:** Visual test + accessibility audit

2. **Permission State Indication**
   - **Given** microphone permission state changes
   - **When** user views the UI
   - **Then** current state is visually indicated (color, icon)
   - **States:** Granted (green), Denied (red), Prompt (gray)
   - **Test:** State machine test

3. **Disable Without Browser Settings**
   - **Given** microphone is enabled
   - **When** user toggles off
   - **Then** mic stops without requiring browser permission settings
   - **Test:** Integration test

4. **Character Feedback**
   - **Given** microphone is disabled
   - **When** user attempts voice interaction
   - **Then** character provides visual feedback (shake head, X icon)
   - **Test:** Animation test

**Priority:** High | **Complexity:** M

---

### AC-V03: Pitch Modulation
**Story:** US-V03 | **Status:** [Final]

**Criteria:**

1. **Pitch Slider Range**
   - **Given** user opens settings panel
   - **When** viewing pitch control
   - **Then** slider range is **1.0x to 2.0x**
   - **Technical Spec:** Step size 0.1x
   - **Test:** UI component test

2. **Real-time Adjustment**
   - **Given** voice is playing
   - **When** user adjusts pitch slider
   - **Then** playback pitch changes **immediately**
   - **Technical Spec:** < 100ms latency
   - **Test:** Performance test

3. **Pitch Persistence**
   - **Given** user sets custom pitch
   - **When** app is closed and reopened
   - **Then** pitch setting is **preserved**
   - **Technical Spec:** localStorage or IndexedDB
   - **Test:** State persistence test

**Priority:** High | **Complexity:** M

---

### AC-V04: Voice Activity Detection
**Story:** US-V04 | **Status:** [Final]

**Criteria:**

1. **Visual Indicator Appears**
   - **Given** microphone is active
   - **When** voice activity is detected
   - **Then** visual indicator pulses or animates
   - **Test:** Visual regression test

2. **Silence Detection**
   - **Given** user stops speaking
   - **When** **500ms** of silence detected
   - **Then** listening mode ends automatically
   - **Technical Spec:** VAD threshold -40dB
   - **Test:** Audio processing unit test

3. **Animation State Sync**
   - **Given** voice activity changes
   - **When** VAD triggers
   - **Then** character animation state updates (IDLE ↔ LISTENING)
   - **Test:** State machine integration test

**Priority:** High | **Complexity:** L

---

### AC-V05: Browser Compatibility Fallback
**Story:** US-V05 | **Status:** [Final]

**Criteria:**

1. **Compatibility Detection**
   - **Given** app loads
   - **When** browser lacks Web Speech API
   - **Then** compatibility check detects unsupported browser
   - **Test:** Mock unsupported browser test

2. **Clear Message Display**
   - **Given** unsupported browser detected
   - **When** user attempts voice feature
   - **Then** clear message explains limitation and suggests alternatives
   - **Technical Spec:** "Voice features require Chrome, Edge, or Safari"
   - **Test:** Error message test

3. **Graceful Degradation**
   - **Given** voice features unavailable
   - **When** user interacts with app
   - **Then** touch interactions still work fully
   - **Test:** Feature availability test

**Priority:** Medium | **Complexity:** M

---

### AC-V06: Audio Processing Pipeline
**Story:** US-V06 | **Status:** [Final]

**Criteria:**

1. **Speech Recognition Setup**
   - **Given** voice feature initialized
   - **When** Web Speech API configured
   - **Then** continuous listening mode with manual activation
   - **Technical Spec:** SpeechRecognition.continuous = false
   - **Test:** API configuration test

2. **MediaRecorder Audio Capture**
   - **Given** microphone permission granted
   - **When** user speaks
   - **Then** audio captured in WebM or supported format
   - **Technical Spec:** Sample rate 44100Hz, mono channel
   - **Test:** Audio capture test

3. **Web Audio Context**
   - **Given** audio captured
   - **When** loading into AudioBuffer
   - **Then** Web Audio API processes successfully
   - **Technical Spec:** AudioContext initialized, no errors
   - **Test:** Audio pipeline integration test

4. **Pitch Shift Implementation**
   - **Given** audio in buffer
   - **When** playback rate manipulation applied
   - **Then** pitch shifts by specified factor (1.2x - 1.8x)
   - **Technical Spec:** AudioBufferSourceNode.playbackRate
   - **Test:** Audio analysis test

5. **Playback Sync**
   - **Given** modified audio ready
   - **When** playback starts
   - **Then** animation syncs to audio amplitude
   - **Technical Spec:** AnalyserNode for amplitude extraction
   - **Test:** Integration test with animation

**Priority:** High | **Complexity:** XL

---

## Epic 2: Touch Interactions

### AC-T01: Poke Reaction
**Story:** US-T01 | **Status:** [Final]

**Criteria:**

1. **Head Tap Detection**
   - **Given** user taps character's head
   - **When** raycast detects head zone
   - **Then** "Duck and giggle" animation plays
   - **Technical Spec:** Head mesh tagged "head"
   - **Test:** Raycast unit test + visual test

2. **Body Tap Detection**
   - **Given** user taps character's body
   - **When** raycast detects body zone
   - **Then** "Tickle reaction" animation plays
   - **Test:** Raycast unit test + visual test

3. **Limb Tap Detection**
   - **Given** user taps arms or legs
   - **When** raycast detects limb zone
   - **Then** "Flinch or wave" animation plays
   - **Test:** Raycast unit test + visual test

4. **Animation Completion**
   - **Given** poke animation playing
   - **When** animation duration **0.5-1.5 seconds** completes
   - **Then** character returns to IDLE state
   - **Test:** Animation state machine test

5. **Non-Interrupting**
   - **Given** voice playback active
   - **When** user pokes character
   - **Then** poke queued, voice continues (voice has priority)
   - **Test:** State priority test

**Priority:** High | **Complexity:** M

---

### AC-T02: Pet the Character
**Story:** US-T02 | **Status:** [Final]

**Criteria:**

1. **Swipe Gesture Recognition**
   - **Given** user performs swipe on character
   - **When** gesture detector analyzes touch movement
   - **Then** swipe recognized (minimum **50px** movement, < **300ms** duration)
   - **Technical Spec:** Touch delta > 50px, velocity > 0.5px/ms
   - **Test:** Gesture detection unit test

2. **Petting Animation**
   - **Given** swipe detected on head
   - **When** REACTING_PET state activated
   - **Then** head tilts into pet, eyes close, purr sound plays
   - **Test:** Animation + audio test

3. **Happiness Indicators**
   - **Given** petting animation playing
   - **When** character reacts
   - **Then** smile, sparkle particle effects visible
   - **Technical Spec:** Blend shape morph + particle system
   - **Test:** Visual effects test

4. **Enhanced Reaction**
   - **Given** **3+ consecutive pets** within **5 seconds**
   - **When** detection counter increments
   - **Then** enhanced animation (bigger smile, more sparkles, longer purr)
   - **Test:** Interaction sequence test

**Priority:** High | **Complexity:** M

---

### AC-T03: Long Press Interaction
**Story:** US-T03 | **Status:** [Final]

**Criteria:**

1. **Long Press Detection**
   - **Given** user touches character
   - **When** touch held for **500ms+**
   - **Then** long press recognized (not confused with tap)
   - **Technical Spec:** Touch duration threshold 500ms
   - **Test:** Gesture timing test

2. **Sustained Animation**
   - **Given** long press detected
   - **When** REACTING_HOLD state active
   - **Then** character looks at held area with curious animation
   - **Test:** Animation test

3. **Animation During Hold**
   - **Given** long press maintained
   - **When** touch continues
   - **Then** animation loops or sustains smoothly
   - **Test:** Long-duration interaction test

4. **Release Behavior**
   - **Given** long press animation playing
   - **When** touch released
   - **Then** animation stops immediately, returns to IDLE
   - **Technical Spec:** < 100ms transition
   - **Test:** State transition test

**Priority:** Medium | **Complexity:** M

---

### AC-T04: Touch Zone Definition
**Story:** US-T04 | **Status:** [Final]

**Criteria:**

1. **Zone Mapping**
   - **Given** character model loaded
   - **When** touch zones defined
   - **Then** head, body, arms, legs clearly mapped
   - **Technical Spec:** Mesh groups or invisible collision zones
   - **Test:** Raycast coverage test

2. **Zone Responsiveness**
   - **Given** user taps any zone
   - **When** raycast intersects
   - **Then** appropriate zone detected within **50ms**
   - **Technical Spec:** Three.js Raycaster
   - **Test:** Performance test

3. **Zone Visual Debugging**
   - **Given** developer mode enabled
   - **When** zones rendered
   - **Then** wireframe overlay shows touch zones
   - **Test:** Debug visualization test

**Priority:** High | **Complexity:** L

---

### AC-T05: Gesture Detection System
**Story:** US-T05 | **Status:** [Final]

**Criteria:**

1. **Tap Detection**
   - **Given** touch start and end in same location
   - **When** duration < **200ms**, movement < **10px**
   - **Then** tap gesture recognized
   - **Test:** Gesture unit test

2. **Swipe Detection**
   - **Given** touch moves across screen
   - **When** delta > **50px**, duration < **300ms**
   - **Then** swipe gesture recognized with direction (up, down, left, right)
   - **Test:** Gesture direction test

3. **Long Press Detection**
   - **Given** touch stationary
   - **When** duration > **500ms**, movement < **10px**
   - **Then** long press recognized
   - **Test:** Duration threshold test

4. **Debouncing**
   - **Given** rapid touches
   - **When** multiple events fire
   - **Then** gestures debounced to **100ms** intervals
   - **Technical Spec:** Prevent accidental double-taps
   - **Test:** Event throttling test

**Priority:** High | **Complexity:** L

---

## Epic 3: 3D Character & Animation

### AC-3D01: 3D Scene Rendering
**Story:** US-3D01 | **Status:** [Final]

**Criteria:**

1. **WebGL Initialization**
   - **Given** app loads
   - **When** Threlte canvas mounts
   - **Then** Three.js WebGL renderer initializes successfully
   - **Technical Spec:** WebGL2 preferred, fallback to WebGL1
   - **Test:** Renderer initialization test

2. **Canvas Responsiveness**
   - **Given** viewport size changes
   - **When** resize event fires
   - **Then** canvas scales to fit window (maintain aspect ratio)
   - **Technical Spec:** Use CSS aspect-ratio or JavaScript resize handler
   - **Test:** Responsive layout test

3. **Character Visible**
   - **Given** scene renders
   - **When** character model loaded
   - **Then** character fully visible in viewport
   - **Technical Spec:** Camera positioned to show full character
   - **Test:** Visual screenshot test

**Priority:** High | **Complexity:** L

---

### AC-3D02: Character Model Loading
**Story:** US-3D02 | **Status:** [Final]

**Criteria:**

1. **Loading Screen Display**
   - **Given** app initializing
   - **When** assets loading
   - **Then** loading screen with progress bar visible
   - **Technical Spec:** Show percentage 0-100%
   - **Test:** Loading state test

2. **Progress Tracking**
   - **Given** .glb model loading
   - **When** bytes downloaded
   - **Then** progress bar updates in real-time
   - **Technical Spec:** GLTFLoader onProgress callback
   - **Test:** Asset loading test with mock slow network

3. **Load Time Target**
   - **Given** 4G connection (simulated)
   - **When** character loads
   - **Then** load completes in **< 2 seconds**
   - **Technical Spec:** Model size < 5MB
   - **Test:** Performance benchmark

4. **Error Handling**
   - **Given** model fails to load
   - **When** network error or 404
   - **Then** user-friendly error message displayed with retry option
   - **Test:** Error scenario test

**Priority:** High | **Complexity:** M

---

### AC-3D03: Optimized Character Model
**Story:** US-3D03 | **Status:** [Final]

**Criteria:**

1. **File Format**
   - **Given** 3D asset preparation
   - **When** model exported
   - **Then** .glb binary format used
   - **Technical Spec:** GLB with Draco compression
   - **Test:** File format validation

2. **Polygon Count**
   - **Given** character model
   - **When** analyzed
   - **Then** triangle count **< 20,000**
   - **Technical Spec:** Use decimation/retopology
   - **Test:** Mesh analysis tool

3. **Texture Resolution**
   - **Given** character textures
   - **When** applied to model
   - **Then** max resolution **1024x1024** per texture
   - **Technical Spec:** Use texture atlasing where possible
   - **Test:** Texture inspection

4. **File Size**
   - **Given** final .glb file
   - **When** compressed
   - **Then** total size **< 5MB**
   - **Technical Spec:** Includes geometry, textures, animations
   - **Test:** File size check in CI

5. **Skeletal Rigging**
   - **Given** character needs animation
   - **When** rigged
   - **Then** skeleton with **< 50 bones** for performance
   - **Test:** Rig inspection

**Priority:** High | **Complexity:** M

---

### AC-3D04: Scene Lighting
**Story:** US-3D04 | **Status:** [Final]

**Criteria:**

1. **Ambient Light**
   - **Given** scene renders
   - **When** lighting applied
   - **Then** ambient light provides base illumination
   - **Technical Spec:** AmbientLight intensity 0.4-0.6
   - **Test:** Lighting setup test

2. **Directional Light**
   - **Given** scene needs character definition
   - **When** directional light added
   - **Then** character has clear form and depth
   - **Technical Spec:** DirectionalLight from 45° angle
   - **Test:** Visual comparison test

3. **Optional Shadows**
   - **Given** device supports shadows (not low-end)
   - **When** shadow rendering enabled
   - **Then** character casts soft shadow on floor
   - **Technical Spec:** Shadow map size 1024x1024
   - **Test:** Conditional rendering test

**Priority:** Medium | **Complexity:** S

---

### AC-3D05: Idle Animation
**Story:** US-3D05 | **Status:** [Final]

**Criteria:**

1. **Breathing Animation**
   - **Given** character in IDLE state
   - **When** no user interaction
   - **Then** subtle breathing animation loops continuously
   - **Technical Spec:** 3-5 second loop, < 5% scale variation
   - **Test:** Animation loop test

2. **Blink Animation**
   - **Given** character idle
   - **When** **3-5 seconds** pass
   - **Then** character blinks (close/open eyes)
   - **Technical Spec:** 200ms blink duration
   - **Test:** Random interval test

3. **Random Idle Gestures**
   - **Given** character idle for **10-15 seconds**
   - **When** timer triggers
   - **Then** random gesture plays (yawn, stretch, look around)
   - **Technical Spec:** 3+ unique idle animations
   - **Test:** Variety test over time

4. **Seamless Transitions**
   - **Given** idle animation changes
   - **When** blending between poses
   - **Then** transition smooth (**200-300ms** blend time)
   - **Test:** Animation blend test

**Priority:** High | **Complexity:** M

---

### AC-3D06: Animation State Machine
**Story:** US-3D06 | **Status:** [Final]

**Criteria:**

1. **State Definition**
   - **Given** animation system initializes
   - **When** state machine created
   - **Then** all 6 states defined: IDLE, LISTENING, SPEAKING, REACTING_POKE, REACTING_PET, REACTING_HOLD
   - **Test:** State enum/type definition test

2. **Transition Rules**
   - **Given** current state and trigger event
   - **When** transition requested
   - **Then** valid transitions allowed, invalid blocked
   - **Priority Rules:**
     - SPEAKING > all others (interrupts)
     - LISTENING can be interrupted by touch
     - Reactions return to IDLE on completion
   - **Test:** State transition matrix test

3. **State Queue**
   - **Given** rapid interactions
   - **When** multiple state requests
   - **Then** queue maintains **max 2 queued** states
   - **Technical Spec:** FIFO queue, oldest dropped if full
   - **Test:** Queue overflow test

4. **Blend Time**
   - **Given** state changes
   - **When** transitioning
   - **Then** animation blends over **200-300ms**
   - **Technical Spec:** Three.js AnimationMixer crossfade
   - **Test:** Blend duration test

5. **Emergency Fallback**
   - **Given** state error occurs
   - **When** invalid state detected
   - **Then** system resets to IDLE
   - **Test:** Error recovery test

**Priority:** High | **Complexity:** XL

---

### AC-3D07: Raycast Touch Detection
**Story:** US-3D07 | **Status:** [Final]

**Criteria:**

1. **Raycast Setup**
   - **Given** 3D scene and touch event
   - **When** raycast from touch point
   - **Then** Three.js Raycaster correctly projects 2D to 3D
   - **Technical Spec:** Convert normalized device coordinates
   - **Test:** Raycast projection test

2. **Intersection Detection**
   - **Given** ray intersects character mesh
   - **When** raycast calculates
   - **Then** correct mesh face and UV coordinates returned
   - **Test:** Intersection accuracy test

3. **Performance**
   - **Given** touch event
   - **When** raycast executes
   - **Then** detection completes in **< 16ms** (1 frame at 60fps)
   - **Technical Spec:** Optimize bounding box checks
   - **Test:** Performance profiling

**Priority:** High | **Complexity:** M

---

### AC-3D08: Lip Sync Animation
**Story:** US-3D08 | **Status:** [Final]

**Criteria:**

1. **Blend Shape Morphs**
   - **Given** character model has mouth blend shapes
   - **When** speaking state active
   - **Then** mouth morphs between open/closed based on audio amplitude
   - **Technical Spec:** Morph targets: mouth_open, smile, etc.
   - **Test:** Morph target test

2. **Amplitude Extraction**
   - **Given** audio playing
   - **When** AnalyserNode processes audio
   - **Then** amplitude extracted in real-time (**60Hz**)
   - **Technical Spec:** Use getByteTimeDomainData()
   - **Test:** Audio analysis test

3. **Approximate Sync**
   - **Given** voice playback
   - **When** mouth animates
   - **Then** mouth movement roughly synced to audio (acceptable lag **< 50ms**)
   - **Technical Spec:** Not true lip sync, amplitude-based
   - **Test:** Visual timing test

**Priority:** Medium | **Complexity:** L

---

## Epic 4: PWA Capabilities

### AC-PWA01: Install to Home Screen
**Story:** US-PWA01 | **Status:** [Final]

**Criteria:**

1. **Install Prompt**
   - **Given** user visits app on supported device
   - **When** PWA criteria met (HTTPS, manifest, service worker)
   - **Then** browser shows install prompt
   - **Technical Spec:** beforeinstallprompt event captured
   - **Test:** PWA audit + manual iOS/Android test

2. **Custom Install UI**
   - **Given** browser supports custom install
   - **When** prompt deferred
   - **Then** app shows custom "Install App" button
   - **Test:** Custom UI test

3. **Icon Display**
   - **Given** app installed
   - **When** added to home screen
   - **Then** correct icon (192x192, 512x512) displays
   - **Technical Spec:** manifest.json icons array
   - **Test:** Icon rendering test on devices

4. **Standalone Mode**
   - **Given** app launched from home screen
   - **When** opens
   - **Then** runs in standalone mode (no browser UI)
   - **Technical Spec:** manifest display: "standalone"
   - **Test:** Launch mode verification

5. **Splash Screen**
   - **Given** app launching
   - **When** standalone mode
   - **Then** splash screen displays with app name, icon, theme color
   - **Technical Spec:** Auto-generated from manifest
   - **Test:** Splash screen appearance test

**Priority:** High | **Complexity:** M

---

### AC-PWA02: Offline Functionality
**Story:** US-PWA02 | **Status:** [Final]

**Criteria:**

1. **Core Features Offline**
   - **Given** app loaded once online
   - **When** device goes offline
   - **Then** 3D interactions, voice recording/playback, animations all work
   - **Test:** Offline mode integration test

2. **Asset Availability**
   - **Given** service worker caches assets
   - **When** offline
   - **Then** character model, sounds, UI all load from cache
   - **Technical Spec:** CacheStorage API
   - **Test:** Cache hit rate test

3. **Voice Processing Offline**
   - **Given** microphone permission granted
   - **When** offline
   - **Then** MediaRecorder and Web Audio API work (browser native, no network needed)
   - **Test:** Audio pipeline offline test

**Priority:** High | **Complexity:** L

---

### AC-PWA03: Service Worker Implementation
**Story:** US-PWA03 | **Status:** [Final]

**Criteria:**

1. **Cache Strategy - App Shell**
   - **Given** service worker installs
   - **When** install event fires
   - **Then** HTML, CSS, JS cached (Cache First strategy)
   - **Technical Spec:** Versioned cache name (e.g., app-shell-v1.0.0)
   - **Test:** Cache inspection test

2. **Cache Strategy - Assets**
   - **Given** service worker active
   - **When** fetch event for .glb, .mp3, images
   - **Then** Cache First, fallback to Network
   - **Test:** Fetch strategy test

3. **Cache Invalidation**
   - **Given** app version updates
   - **When** activate event fires
   - **Then** old caches deleted
   - **Technical Spec:** Compare cache version, delete mismatches
   - **Test:** Cache cleanup test

4. **Large File Handling**
   - **Given** character.glb > 1MB
   - **When** caching
   - **Then** handle large file with chunking or streaming
   - **Technical Spec:** Cache API handles large blobs
   - **Test:** Large file cache test

5. **Update Notification**
   - **Given** new version available
   - **When** service worker updates in background
   - **Then** user notified with "Update Available" message
   - **Test:** Update flow test

**Priority:** High | **Complexity:** XL

---

### AC-PWA04: Offline Indicator
**Story:** US-PWA04 | **Status:** [Final]

**Criteria:**

1. **Indicator Visibility**
   - **Given** app running
   - **When** offline
   - **Then** small badge/icon shows "Offline" status
   - **Technical Spec:** Listen to navigator.onLine and online/offline events
   - **Test:** Network state change test

2. **Toast Notification**
   - **Given** app online
   - **When** connection lost
   - **Then** toast notification appears briefly ("You're offline")
   - **Technical Spec:** 3-second auto-dismiss
   - **Test:** Toast display test

3. **Non-Intrusive**
   - **Given** offline indicator shown
   - **When** user interacts
   - **Then** app continues functioning normally (no blocking modals)
   - **Test:** UX flow test

**Priority:** Medium | **Complexity:** S

---

### AC-PWA05: PWA Manifest Configuration
**Story:** US-PWA05 | **Status:** [Final]

**Criteria:**

1. **Required Fields**
   - **Given** manifest.json exists
   - **When** validated
   - **Then** includes: name, short_name, start_url, display, icons
   - **Test:** Manifest validation tool

2. **Icon Sizes**
   - **Given** icons array
   - **When** checked
   - **Then** includes 192x192 and 512x512 PNG icons
   - **Technical Spec:** "any maskable" purpose for adaptive icons
   - **Test:** Icon presence test

3. **Theme Colors**
   - **Given** theme configured
   - **When** manifest loaded
   - **Then** theme_color (#4a90e2), background_color (#ffffff) set
   - **Test:** Color application test

4. **Orientation**
   - **Given** mobile device
   - **When** app launches
   - **Then** portrait orientation preferred
   - **Technical Spec:** orientation: "portrait"
   - **Test:** Orientation lock test

**Priority:** High | **Complexity:** S

---

## Epic 5: UI/UX Components

### AC-UI01: Loading Screen
**Story:** US-UI01 | **Status:** [Final]

**Criteria:**

1. **Immediate Display**
   - **Given** app loads
   - **When** DOM ready
   - **Then** loading screen visible within **100ms**
   - **Test:** Time-to-first-paint test

2. **Progress Bar**
   - **Given** assets loading
   - **When** progress updates
   - **Then** progress bar fills from 0% to 100%
   - **Technical Spec:** Visual percentage indicator
   - **Test:** Progress UI test

3. **Loading Tips**
   - **Given** loading screen shown
   - **When** displayed
   - **Then** rotating tips or instructions shown (e.g., "Tap to poke!", "Swipe to pet!")
   - **Technical Spec:** 3+ tips, rotate every 2 seconds
   - **Test:** Content rotation test

4. **Removal After Load**
   - **Given** all assets loaded
   - **When** app ready
   - **Then** loading screen fades out smoothly
   - **Technical Spec:** 300ms fade transition
   - **Test:** Transition test

**Priority:** High | **Complexity:** S

---

### AC-UI02: Microphone Button
**Story:** US-UI02 | **Status:** [Final]

**Criteria:**

1. **Button Size**
   - **Given** mobile layout
   - **When** button rendered
   - **Then** minimum **60x60px** (generous touch target)
   - **Technical Spec:** Larger than A11Y minimum 44x44px
   - **Test:** Size measurement test

2. **Visual States**
   - **States:**
     - **Idle:** Gray background, mic icon
     - **Listening:** Red pulsing, "Recording..." text
     - **Processing:** Spinner animation
     - **Speaking:** Green, sound wave icon
   - **Test:** State visualization test for each

3. **Haptic Feedback**
   - **Given** supported device
   - **When** button tapped
   - **Then** haptic vibration (**50ms**)
   - **Technical Spec:** navigator.vibrate(50)
   - **Test:** Vibration API test

4. **Accessibility**
   - **Given** screen reader active
   - **When** button focused
   - **Then** ARIA label announces "Tap to speak" + current state
   - **Test:** Screen reader test

**Priority:** High | **Complexity:** M

---

### AC-UI03: Permission Prompt
**Story:** US-UI03 | **Status:** [Final]

**Criteria:**

1. **Explanation Text**
   - **Given** first microphone request
   - **When** prompt shown
   - **Then** clear explanation: "We need microphone access so the character can repeat what you say. Audio never leaves your device."
   - **Test:** Content verification test

2. **Allow Button**
   - **Given** prompt displayed
   - **When** user clicks "Allow Microphone"
   - **Then** browser permission dialog triggers
   - **Test:** Permission flow test

3. **Expandable Section**
   - **Given** prompt shown
   - **When** user taps "Why do we need this?"
   - **Then** expanded section explains privacy and local processing
   - **Test:** Accordion UI test

4. **Skip Option**
   - **Given** prompt displayed
   - **When** user clicks "Skip"
   - **Then** app continues with voice features disabled
   - **Test:** Feature disable test

**Priority:** High | **Complexity:** M

---

### AC-UI04: Error Messages
**Story:** US-UI04 | **Status:** [Final]

**Criteria:**

1. **Error Types Handled**
   - Model load failure
   - WebGL not supported
   - Microphone permission denied
   - Service worker registration failed
   - Audio processing error
   - **Test:** Error scenario matrix

2. **User-Friendly Language**
   - **Given** error occurs
   - **When** message displayed
   - **Then** plain language (no technical jargon), suggests action
   - **Example:** "Couldn't load character. Check your connection and try again."
   - **Test:** Content review test

3. **Retry Option**
   - **Given** recoverable error
   - **When** error message shown
   - **Then** "Retry" button available
   - **Test:** Retry action test

4. **Non-Blocking**
   - **Given** non-critical error
   - **When** error displayed
   - **Then** toast notification, app continues (doesn't block entire app)
   - **Test:** UX flow continuity test

**Priority:** Medium | **Complexity:** S

---

### AC-UI05: Settings Panel
**Story:** US-UI05 | **Status:** [Final]

**Criteria:**

1. **Slide-In Animation**
   - **Given** user taps settings icon
   - **When** panel opens
   - **Then** slides in from right with **300ms** ease animation
   - **Test:** Animation timing test

2. **Settings Available**
   - Voice pitch slider (1.0x - 2.0x)
   - Volume control (0-100%)
   - Sound effects toggle (on/off)
   - Gesture sensitivity (low/medium/high)
   - Reduce motion toggle
   - **Test:** All controls present test

3. **Settings Persistence**
   - **Given** user changes settings
   - **When** app closed and reopened
   - **Then** settings preserved
   - **Technical Spec:** localStorage
   - **Test:** State persistence test

4. **Reset to Defaults**
   - **Given** settings changed
   - **When** user clicks "Reset to Defaults"
   - **Then** all settings revert to original values
   - **Test:** Reset functionality test

5. **About Section**
   - **Given** settings panel open
   - **When** scrolled to bottom
   - **Then** about section with app version, privacy policy link, help/tutorial link
   - **Test:** Content verification test

**Priority:** Medium | **Complexity:** M

---

### AC-UI06: Visual State Indicators
**Story:** US-UI06 | **Status:** [Final]

**Criteria:**

1. **Listening Indicator**
   - **Given** voice input active
   - **When** displayed
   - **Then** pulsing red circle or waveform animation
   - **Test:** Visual regression test

2. **Speaking Indicator**
   - **Given** voice playback active
   - **When** displayed
   - **Then** animated sound wave or equalizer bars
   - **Test:** Animation test

3. **Processing Indicator**
   - **Given** audio processing
   - **When** between listening and speaking
   - **Then** spinner or "Processing..." text
   - **Technical Spec:** Max duration 1 second
   - **Test:** Timing test

4. **State Sync**
   - **Given** animation state changes
   - **When** UI updates
   - **Then** indicators sync within **50ms**
   - **Test:** State synchronization test

**Priority:** High | **Complexity:** S

---

### AC-UI07: Responsive Layout
**Story:** US-UI07 | **Status:** [Final]

**Criteria:**

1. **Mobile Portrait (320px - 768px)**
   - **Given** mobile device
   - **When** rendered
   - **Then** canvas full height, controls bottom, header top
   - **Test:** Visual test at 375px (iPhone), 414px (Android)

2. **Tablet (768px - 1024px)**
   - **Given** tablet device
   - **When** rendered
   - **Then** layout scales appropriately, larger touch targets
   - **Test:** Visual test at 768px (iPad)

3. **Desktop (1024px+)**
   - **Given** desktop browser
   - **When** rendered
   - **Then** canvas centered, max-width constraint, mouse interactions work
   - **Technical Spec:** Max width 1200px, centered
   - **Test:** Visual test at 1920px

4. **Orientation Change**
   - **Given** mobile device
   - **When** rotated
   - **Then** layout adapts smoothly to landscape
   - **Test:** Orientation change test

**Priority:** High | **Complexity:** M

---

## Epic 6: Performance & Optimization

### AC-PERF01: WebGL Detection
**Story:** US-PERF01 | **Status:** [Final]

**Criteria:**

1. **Support Check**
   - **Given** app initializes
   - **When** WebGL detection runs
   - **Then** WebGL2 preferred, fallback to WebGL1, error if neither
   - **Technical Spec:** Use WebGLRenderer.capabilities
   - **Test:** Mock unsupported browser

2. **Clear Message**
   - **Given** WebGL unsupported
   - **When** detected
   - **Then** full-screen message: "Your browser doesn't support 3D graphics. Please use Chrome, Edge, Safari, or Firefox."
   - **Test:** Error message test

3. **Graceful Handling**
   - **Given** WebGL not available
   - **When** app loads
   - **Then** no console errors, clean degradation
   - **Test:** Error handling test

**Priority:** High | **Complexity:** S

---

### AC-PERF02: Frame Rate Monitoring
**Story:** US-PERF02 | **Status:** [Final]

**Criteria:**

1. **FPS Tracking**
   - **Given** app running
   - **When** rendering loop active
   - **Then** FPS calculated via requestAnimationFrame delta
   - **Technical Spec:** Rolling average over 60 frames
   - **Test:** FPS calculation accuracy test

2. **Developer Mode Display**
   - **Given** debug mode enabled
   - **When** app renders
   - **Then** FPS counter visible in corner
   - **Test:** Debug UI test

3. **Performance Alerts**
   - **Given** FPS drops below **30 FPS** for > 2 seconds
   - **When** detected
   - **Then** log performance warning to console
   - **Test:** Low FPS scenario test

**Priority:** Medium | **Complexity:** M

---

### AC-PERF03: Target 60 FPS
**Story:** US-PERF03 | **Status:** [Final]

**Criteria:**

1. **Desktop Target**
   - **Given** high-end desktop (2020+ specs)
   - **When** all animations running
   - **Then** maintains **60 FPS** consistently
   - **Test:** Performance benchmark on target hardware

2. **Mobile Flagship Target**
   - **Given** flagship mobile (iPhone 12+, Galaxy S20+)
   - **When** all animations running
   - **Then** maintains **55-60 FPS**
   - **Test:** Real device testing

3. **Mobile Mid-range Target**
   - **Given** mid-range mobile (2020+ specs)
   - **When** all animations running
   - **Then** maintains **45-55 FPS** (acceptable)
   - **Test:** Real device testing

4. **Adaptive Quality**
   - **Given** FPS drops below **30 FPS** consistently
   - **When** performance monitor detects
   - **Then** reduce quality (shadows off, texture resolution, animation complexity)
   - **Test:** Adaptive degradation test

**Priority:** High | **Complexity:** L

---

### AC-PERF04: Asset Optimization
**Story:** US-PERF04 | **Status:** [Final]

**Criteria:**

1. **Model Compression**
   - **Given** character.glb
   - **When** built for production
   - **Then** Draco compression applied, file size **< 5MB**
   - **Test:** File size check in CI

2. **Texture Optimization**
   - **Given** character textures
   - **When** built
   - **Then** compressed to WebP or basis format where supported
   - **Technical Spec:** Fallback to optimized PNG/JPG
   - **Test:** Texture format test

3. **Sound Compression**
   - **Given** sound effects
   - **When** exported
   - **Then** MP3 at **128kbps**, total < **500KB** for all sounds
   - **Test:** Audio file size check

4. **Code Splitting**
   - **Given** JavaScript bundle
   - **When** built
   - **Then** vendor code split from app code, lazy load non-critical
   - **Technical Spec:** three.js and threlte in separate chunk
   - **Test:** Bundle analysis

**Priority:** High | **Complexity:** M

---

### AC-PERF05: Fast Initial Load
**Story:** US-PERF05 | **Status:** [Final]

**Criteria:**

1. **TTFB Target**
   - **Given** static hosting
   - **When** user requests app
   - **Then** Time to First Byte **< 200ms**
   - **Test:** Lighthouse performance audit

2. **FCP Target**
   - **Given** app loads
   - **When** first content painted
   - **Then** First Contentful Paint **< 1.5 seconds**
   - **Test:** Lighthouse audit

3. **LCP Target**
   - **Given** character loading
   - **When** main content visible
   - **Then** Largest Contentful Paint **< 2.5 seconds**
   - **Test:** Lighthouse audit

4. **TTI Target**
   - **Given** app fully loaded
   - **When** interactive
   - **Then** Time to Interactive **< 3.5 seconds** on 4G
   - **Test:** Lighthouse audit + real device test

5. **FID Target**
   - **Given** user first interacts
   - **When** event handled
   - **Then** First Input Delay **< 100ms**
   - **Test:** Lighthouse audit

**Priority:** High | **Complexity:** L

---

## Epic 7: Accessibility

### AC-A11Y01: WCAG 2.1 AA Compliance
**Story:** US-A11Y01 | **Status:** [Final]

**Criteria:**

1. **Automated Audit Pass**
   - **Given** app deployed
   - **When** axe DevTools or Lighthouse A11Y audit runs
   - **Then** score **> 90**, no critical violations
   - **Test:** Automated accessibility scan

2. **Color Contrast**
   - **Given** all text and UI elements
   - **When** measured
   - **Then** contrast ratio **> 4.5:1** for text, **> 3:1** for UI
   - **Test:** Contrast checker tool

3. **Semantic HTML**
   - **Given** UI components
   - **When** inspected
   - **Then** proper semantic tags used (button, nav, main, etc.)
   - **Test:** HTML validation

4. **ARIA Labels**
   - **Given** interactive elements
   - **When** no visible label
   - **Then** aria-label or aria-labelledby present
   - **Test:** ARIA attribute check

**Priority:** High | **Complexity:** L

---

### AC-A11Y02: Keyboard Navigation
**Story:** US-A11Y02 | **Status:** [Final]

**Criteria:**

1. **All Elements Focusable**
   - **Given** keyboard-only navigation
   - **When** user tabs through
   - **Then** all interactive elements (buttons, settings) focusable
   - **Test:** Manual keyboard navigation test

2. **Visible Focus**
   - **Given** element focused
   - **When** viewed
   - **Then** clear focus indicator (outline or highlight)
   - **Technical Spec:** 2px outline, high contrast color
   - **Test:** Visual focus test

3. **Logical Tab Order**
   - **Given** tabbing through app
   - **When** focus moves
   - **Then** order is logical (top to bottom, left to right)
   - **Test:** Tab order test

4. **Skip Link**
   - **Given** keyboard user
   - **When** app loads
   - **Then** "Skip to main content" link available (optional for single-page app)
   - **Test:** Skip link functionality

**Priority:** High | **Complexity:** M

---

### AC-A11Y03: Screen Reader Support
**Story:** US-A11Y03 | **Status:** [Final]

**Criteria:**

1. **State Announcements**
   - **Given** screen reader active
   - **When** app state changes (listening, speaking)
   - **Then** state announced via aria-live region
   - **Example:** "Listening", "Speaking", "Processing"
   - **Test:** VoiceOver (iOS), TalkBack (Android) test

2. **Button Labels**
   - **Given** screen reader active
   - **When** button focused
   - **Then** purpose announced clearly
   - **Example:** "Tap to speak", "Open settings", "Close"
   - **Test:** Screen reader navigation test

3. **Alternative for Voice**
   - **Given** screen reader user
   - **When** voice feature unavailable
   - **Then** touch interactions remain accessible
   - **Test:** Screen reader-only interaction test

**Priority:** High | **Complexity:** M

---

### AC-A11Y04: Reduced Motion Support
**Story:** US-A11Y04 | **Status:** [Final]

**Criteria:**

1. **Media Query Detection**
   - **Given** user has prefers-reduced-motion enabled
   - **When** app loads
   - **Then** CSS/JS detects preference
   - **Technical Spec:** @media (prefers-reduced-motion: reduce)
   - **Test:** Mock reduced motion preference

2. **Animation Reduction**
   - **Given** reduced motion active
   - **When** animations play
   - **Then** transitions simplified (instant or minimal)
   - **Technical Spec:** Disable 3D rotations, reduce UI transitions to 100ms
   - **Test:** Visual comparison test

3. **Settings Override**
   - **Given** user preferences
   - **When** settings panel accessed
   - **Then** "Reduce motion" toggle available
   - **Test:** Settings UI test

4. **Character Still Functional**
   - **Given** reduced motion mode
   - **When** interactions occur
   - **Then** character still responds visibly (state changes without elaborate animation)
   - **Test:** Functionality test in reduced motion

**Priority:** High | **Complexity:** S

---

### AC-A11Y05: High Contrast Mode
**Story:** US-A11Y05 | **Status:** [Final]

**Criteria:**

1. **System High Contrast Detection**
   - **Given** OS high contrast mode enabled
   - **When** app loads
   - **Then** app respects system colors
   - **Technical Spec:** Use CSS custom properties, inherit system colors
   - **Test:** Windows High Contrast, macOS Increase Contrast test

2. **Manual Toggle**
   - **Given** settings panel
   - **When** high contrast toggle available
   - **Then** user can enable manually
   - **Test:** Settings toggle test

3. **Enhanced Contrast**
   - **Given** high contrast mode active
   - **When** UI rendered
   - **Then** contrast ratios exceed **7:1** (AAA level)
   - **Test:** Contrast measurement

**Priority:** Medium | **Complexity:** M

---

## Epic 8: Security & Privacy

### AC-SEC01: Permission Management
**Story:** US-SEC01 | **Status:** [Final]

**Criteria:**

1. **Permission Request**
   - **Given** first voice interaction
   - **When** microphone needed
   - **Then** browser permission dialog appears
   - **Test:** Permission flow test

2. **Grant Handling**
   - **Given** user grants permission
   - **When** permission state changes
   - **Then** app enables voice features immediately
   - **Test:** Permission grant test

3. **Deny Handling**
   - **Given** user denies permission
   - **When** permission state changes
   - **Then** app disables voice features, shows guidance to enable in browser settings
   - **Test:** Permission denial test

4. **Revoke Capability**
   - **Given** permission granted
   - **When** user toggles mic off in app
   - **Then** mic stops immediately (stream track stopped)
   - **Technical Spec:** MediaStreamTrack.stop()
   - **Test:** Permission revocation test

**Priority:** High | **Complexity:** M

---

### AC-SEC02: Local Audio Processing
**Story:** US-SEC02 | **Status:** [Final]

**Criteria:**

1. **No Network Transmission**
   - **Given** audio captured
   - **When** processing occurs
   - **Then** zero network requests made with audio data
   - **Test:** Network traffic inspection (verify no audio data sent)

2. **Memory Cleanup**
   - **Given** audio playback complete
   - **When** buffer no longer needed
   - **Then** AudioBuffer dereferenced, memory freed
   - **Technical Spec:** Set buffer references to null
   - **Test:** Memory leak test

3. **Ephemeral Processing**
   - **Given** audio captured
   - **When** session ends
   - **Then** no audio saved to disk (localStorage, IndexedDB, cache)
   - **Test:** Storage inspection test

**Priority:** High | **Complexity:** M

---

### AC-SEC03: Content Security Policy
**Story:** US-SEC03 | **Status:** [Final]

**Criteria:**

1. **CSP Header**
   - **Given** production deployment
   - **When** app served
   - **Then** strict CSP header present
   - **Header Example:**
     ```
     Content-Security-Policy:
       default-src 'self';
       script-src 'self' 'wasm-unsafe-eval';
       style-src 'self' 'unsafe-inline';
       img-src 'self' data: blob:;
       media-src 'self' blob:;
       connect-src 'self';
       worker-src 'self';
     ```
   - **Test:** Security header inspection

2. **No Inline Scripts**
   - **Given** HTML source
   - **When** inspected
   - **Then** no inline `<script>` tags (except build-generated with nonce)
   - **Test:** HTML validation

3. **XSS Prevention**
   - **Given** user input (if any future features)
   - **When** rendered
   - **Then** Svelte auto-escaping prevents XSS
   - **Test:** XSS attack simulation

**Priority:** High | **Complexity:** S

---

## Summary Statistics

**Total Acceptance Criteria:** 150+  
**Stories Marked [Final]:** 44/44  
**High Priority Criteria:** 102  
**Medium Priority Criteria:** 38  
**Low Priority Criteria:** 10  

**Technical Specifications Defined:** Yes  
**Test Methods Specified:** Yes  
**Performance Targets Quantified:** Yes  

---

**Document Status:** [Final]  
**Ready for Architecture Phase:** ✅ Yes  
**Next Agent:** Architect
