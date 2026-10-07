# Photobooth Web App – Full Project Plan

## 1. Project Overview

This project is a **web-based photobooth application** designed mainly for an iPad mounted inside a custom wooden photobooth kiosk with wheels.

The application will be deployed on **Vercel** and will work as a **frontend-only web app**.

The system will not use:

- Laravel
- MySQL
- Firebase
- Supabase
- Online database
- User accounts
- Cloud photo storage

Photos will remain on the device or inside the browser's local storage.

The main goal is to create a photobooth system that is:

- Easy to operate
- Touch-friendly
- Fast
- Elegant
- Offline-capable
- Suitable for weddings, birthdays, corporate events, and other occasions
- Easy to customize for different events

---

# 2. Main Concept

The physical setup will consist of:

- iPad
- Wooden photobooth enclosure
- Wheels for mobility
- Ring light or LED light
- Optional photo printer
- Optional portable power station
- Optional external accessories

The software will run in fullscreen mode on the iPad.

Typical user flow:

```text
Welcome
   ↓
Choose Layout
   ↓
Choose Frame
   ↓
Camera
   ↓
Countdown
   ↓
Capture Photos
   ↓
Preview
   ↓
Optional Edit
   ↓
Generate Final Photo
   ↓
Save / Share / Print
   ↓
Take Another Photo
```

---

# 3. Recommended Technology Stack

## Frontend

- React
- Vite
- JavaScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- Motion

## Browser / Device Features

- MediaDevices API
- Canvas API
- IndexedDB
- Web Share API
- File/Blob API
- PWA
- Service Worker

## Optional Libraries

### Local Storage

Recommended:

```text
Dexie.js
```

Purpose:

- Easier IndexedDB management
- Store captured images
- Store generated photo strips
- Store event sessions locally

### PWA

Recommended:

```text
vite-plugin-pwa
```

Purpose:

- Installable web application
- Offline support
- Cache application assets

### Image Processing

Use native:

```text
HTML Canvas API
```

Possible optional library:

```text
html2canvas
```

Canvas API is still recommended for generating the final photobooth image.

---

# 4. Deployment

The web application will be deployed using:

```text
Vercel
```

Example:

```text
https://your-photobooth.vercel.app
```

The application can then be opened on the iPad.

For business usage, the web app should also support:

```text
Add to Home Screen
```

This makes the website behave more like an installed iPad application.

---

# 5. Database Strategy

## No Online Database

The system will intentionally avoid an online database.

Instead, local browser/device storage will be used.

### localStorage

Use for lightweight settings:

- Event name
- Event date
- Default photo layout
- Selected frame
- Countdown duration
- Sound settings
- Theme
- Camera preference
- Printer preference

Example:

```text
eventName = "Company Christmas Party"
layout = "photo-strip-3"
frame = "floral-01"
countdown = 3
```

---

## IndexedDB

Use IndexedDB for larger files.

Stored locally:

- Original captured photos
- Generated photo strips
- Session thumbnails
- Temporary images

Recommended library:

```text
Dexie.js
```

Example structure:

```text
PhotoboothDB

photos
├── id
├── eventId
├── capturedAt
├── blob
├── thumbnail
└── type

sessions
├── id
├── eventName
├── createdAt
└── finalPhoto
```

This database exists only inside the browser on the iPad.

It is not an online database.

---

# 6. Important iPad Limitation

Because this is a web application, Safari cannot silently save files into any arbitrary folder on the iPad.

The web app can:

- Generate the photo
- Store it inside IndexedDB
- Download it
- Open the iOS Share Sheet
- Allow Save to Photos
- Allow AirDrop
- Allow printing

The application should therefore provide a clear:

```text
Save to Device
```

button after the photo is generated.

---

# 7. Final UI Design System

## Main Style

Theme:

```text
Elegant Botanical / Warm Modern
```

The design should match the wooden photobooth hardware.

The UI should feel:

- Warm
- Premium
- Clean
- Friendly
- Elegant
- Touch-friendly

---

# 8. Color Palette

## Main Colors

### Cream Background

```text
#F8F5EF
```

Usage:

- Main background
- Screens
- Cards

### Sage Green

```text
#6F8062
```

Usage:

- Primary buttons
- Selected cards
- Active states

### Dark Green

```text
#3F5140
```

Usage:

- Navigation
- Dark text accents
- Admin/sidebar areas

### Warm Beige

```text
#EADFCF
```

Usage:

- Secondary cards
- Borders
- Background sections

### Gold Brown

```text
#B98D57
```

Usage:

- Highlights
- Decorative details
- Premium accents

### Charcoal

```text
#2F2F2F
```

Usage:

- Main text

### White

```text
#FFFFFF
```

Usage:

- Cards
- Camera controls
- Modals

---

# 9. Typography

Recommended font combination:

## Titles

```text
Playfair Display
```

Use for:

- Event titles
- Welcome screen
- Elegant headings

## UI Text

```text
Inter
```

Use for:

- Buttons
- Labels
- Instructions
- Settings
- Navigation

Alternative:

```text
DM Sans
```

---

# 10. UI Component Style

Recommended:

```text
Border Radius: 18px–24px
Button Height: 56px–72px
Card Radius: 20px
Soft Shadows
Large Touch Targets
Minimal Text
Large Icons
```

Avoid:

- Small buttons
- Dense tables
- Too many options
- Desktop-style menus during booth mode

---

# 11. Screen 1 – Welcome Screen

Purpose:

Main guest entry screen.

Layout:

```text
┌─────────────────────────────┐
│                             │
│            LOGO             │
│                             │
│          PHOTOBOOTH         │
│                             │
│    Capture the Good         │
│        Moments              │
│                             │
│      [ START PHOTO ]        │
│                             │
│         Tap to begin        │
│                             │
└─────────────────────────────┘
```

Elements:

- Event logo
- Event name
- Decorative leaves
- Main Start Photo button
- Optional event date
- Fullscreen mode

---

# 12. Screen 2 – Choose Photo Layout

Available layouts:

## Single Photo

```text
┌─────────┐
│         │
│  PHOTO  │
│         │
└─────────┘
```

## Two Photos

```text
┌────┬────┐
│    │    │
│    │    │
└────┴────┘
```

## 3 Photo Strip

```text
┌────────┐
│ PHOTO  │
├────────┤
│ PHOTO  │
├────────┤
│ PHOTO  │
└────────┘
```

## 4 Grid

```text
┌────┬────┐
│    │    │
├────┼────┤
│    │    │
└────┴────┘
```

UI:

```text
Choose Your Layout

[ Single ]   [ 2 Photos ]

[ 3 Strip ]  [ 4 Grid ]

          [ NEXT ]
```

Selected layout:

- Green border
- Check icon
- Slight scale animation

---

# 13. Screen 3 – Choose Frame

Users can select a frame before the photo session.

Example frame categories:

- Classic
- Minimal
- Floral
- Wedding
- Birthday
- Corporate
- Christmas
- Fun
- Custom Event

Example:

```text
Choose Frame

[ Classic ] [ Minimal ] [ Floral ]

[ Gold ]    [ Elegant ] [ Fun ]

[ BACK ]                [ NEXT ]
```

---

# 14. Frame Files

Frames can be stored inside:

```text
/public/frames/
```

Example:

```text
/public/frames/
    floral-01.png
    floral-02.png
    wedding-gold.png
    birthday-blue.png
    corporate-simple.png
```

PNG files should contain transparent sections where photos will be placed.

---

# 15. Screen 4 – Camera

This will be one of the most important screens.

Layout:

```text
┌─────────────────────────────┐
│ Home                 Settings│
│                             │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │      LIVE CAMERA        │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│          Ready?             │
│                             │
│             ●               │
│                             │
│        TAKE PHOTO           │
│                             │
└─────────────────────────────┘
```

Features:

- Live camera preview
- Front camera default
- Camera switch
- Flash option if supported
- Capture button
- Session indicator
- Remaining photo counter

---

# 16. Camera API

Use:

```javascript
navigator.mediaDevices.getUserMedia()
```

Example target:

```javascript
{
  video: {
    facingMode: "user"
  },
  audio: false
}
```

The app must request camera permission on first use.

---

# 17. Screen 5 – Countdown

After clicking the capture button:

```text
3
```

then:

```text
2
```

then:

```text
1
```

then capture.

Animations:

- Scale animation
- Fade animation
- Optional countdown sound

Example:

```text
3
2
1
SMILE!
```

---

# 18. Multi-Shot Session

Example for 3-photo strip:

```text
Photo 1 of 3
```

After first capture:

```text
Nice!
Get ready for the next shot.
```

Then automatically:

```text
3
2
1
```

Capture photo #2.

Repeat until complete.

---

# 19. Screen 6 – Preview

After all photos are captured:

```text
        PREVIEW

┌───────────────────┐
│                   │
│    PHOTO STRIP    │
│                   │
└───────────────────┘

[ RETAKE ]    [ USE PHOTO ]
```

Functions:

### Retake

Deletes the current session and restarts camera capture.

### Use Photo

Continues to customization or final result.

---

# 20. Screen 7 – Optional Customize Screen

This feature can be delayed until later versions.

Possible options:

- Filters
- Stickers
- Text
- Brightness
- Black & White
- Warm filter
- Vintage filter

Recommended first version:

```text
Filters only
```

Example:

```text
Original
Warm
Bright
Vintage
B&W
```

---

# 21. Final Image Generation

Use:

```text
Canvas API
```

Process:

```text
Captured Photos
      ↓
Resize / Crop
      ↓
Place Into Layout
      ↓
Apply Frame PNG
      ↓
Add Event Name
      ↓
Add Event Date
      ↓
Generate Canvas
      ↓
Export PNG/JPEG
```

Example:

```javascript
canvas.toBlob()
```

or:

```javascript
canvas.toDataURL()
```

Recommended output:

```text
JPEG
Quality: 0.90–0.95
```

---

# 22. Screen 8 – Final Result

Final screen:

```text
        ✓

Your Photo is Ready!

┌───────────────────────┐
│                       │
│     FINAL PHOTO       │
│                       │
└───────────────────────┘

[ SAVE TO DEVICE ]

[ SHARE PHOTO ]

[ PRINT PHOTO ]

[ TAKE ANOTHER ]
```

---

# 23. Save to Device

The final photo can be generated as:

```text
Blob
```

Then create a downloadable file.

Example filename:

```text
Photobooth_2026-10-07_10-25-31.jpg
```

---

# 24. Sharing

Use:

```javascript
navigator.share()
```

Possible iPad options:

- AirDrop
- Messages
- Messenger
- Save to Files
- Other supported applications

Feature should only be displayed if the browser supports Web Share.

---

# 25. QR Code Feature

Important note:

If photos are purely local, another phone cannot directly download the image through a normal QR code unless the image is available somewhere that the phone can access.

Therefore there are two possible versions.

## Version 1 – No QR Sharing

Use:

- Save to Device
- AirDrop
- Share Sheet

This is the easiest and most private setup.

## Future Version – QR Sharing

Add temporary online upload.

Possible architecture:

```text
Photo
 ↓
Temporary Upload
 ↓
Generate Temporary URL
 ↓
Generate QR Code
 ↓
Guest Scans
 ↓
Download Photo
```

This feature would require temporary cloud storage.

It is optional and should not be part of the first release if the goal is zero backend.

---

# 26. Screen 9 – Local Gallery

The application should include a gallery of photos taken on the current device.

Example:

```text
LOCAL GALLERY

[ Photo ] [ Photo ] [ Photo ]

[ Photo ] [ Photo ] [ Photo ]

[ Photo ] [ Photo ] [ Photo ]
```

Each item shows:

- Thumbnail
- Capture time
- Event date

Tap photo:

```text
Preview
Save
Share
Delete
Print
```

Photos will be loaded from IndexedDB.

---

# 27. Gallery Filtering

Possible filters:

```text
Today
This Event
All Photos
```

Future:

```text
By Event
By Date
```

---

# 28. Screen 10 – Event Setup

This is the operator screen.

Example:

```text
EVENT SETUP

Event Name
[ ABC Company Christmas Party ]

Event Date
[ October 7, 2026 ]

Default Layout
[ 3 Photos – Photo Strip ]

Default Frame
[ Floral 01 ]

Countdown
[ 3 Seconds ]

Photo Quality
[ High ]

[ START PHOTOBOOTH ]
```

Settings are stored in localStorage.

---

# 29. Event Setup Options

Include:

### Event Name

Example:

```text
Erwin & Maria Wedding
```

### Event Date

### Event Logo

Allow local image upload.

### Default Layout

Options:

- Single
- Double
- 3 Strip
- 4 Grid

### Frame

### Countdown

Options:

```text
3 seconds
5 seconds
10 seconds
```

### Photo Quality

Options:

```text
Standard
High
```

---

# 30. Screen 11 – Settings

Settings categories:

```text
General
Camera
Photo Quality
Storage
Theme
Sounds
About
```

---

# 31. General Settings

Options:

```text
Fullscreen Mode
Show Event Title
Auto Start New Session
Enable Animations
```

---

# 32. Camera Settings

Options:

```text
Default Camera
Mirror Front Camera
Camera Resolution
Preview Mode
```

---

# 33. Sound Settings

Possible:

```text
Countdown Sound
Capture Sound
Success Sound
Button Sound
```

All sounds should have an on/off switch.

---

# 34. Storage Settings

Display:

```text
Photos Stored: 438
Storage Used: 285 MB
```

Buttons:

```text
Export Photos
Clear Current Event
Clear All Local Photos
```

Destructive actions must use confirmation dialogs.

---

# 35. Hidden Operator Access

Guests should not easily enter the Event Setup or Settings screen.

Recommended method:

```text
Press and hold logo for 3 seconds
```

Then:

```text
Operator Menu
```

Optional PIN:

```text
Enter Operator PIN
[ • • • • ]
```

PIN can be stored locally.

---

# 36. Guest Mode

When Guest Mode is active:

Hide:

- Browser-like controls
- Settings
- Event setup
- Gallery management
- Delete buttons

Guest only sees:

```text
Start
Layout
Frame
Camera
Preview
Save / Share
```

---

# 37. Operator Mode

Operator can access:

- Event setup
- Local gallery
- Settings
- Storage management
- Camera test
- Printer setup
- Theme selection

---

# 38. Navigation Structure

Recommended:

```text
Guest Mode

Welcome
   ↓
Layout
   ↓
Frame
   ↓
Camera
   ↓
Preview
   ↓
Final
```

Operator:

```text
Operator Home
├── Event Setup
├── Gallery
├── Settings
├── Storage
└── Start Booth
```

---

# 39. Suggested React Folder Structure

```text
src/
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── sounds/
│
├── components/
│   ├── camera/
│   │   ├── CameraPreview.jsx
│   │   ├── CaptureButton.jsx
│   │   └── Countdown.jsx
│   │
│   ├── booth/
│   │   ├── PhotoLayout.jsx
│   │   ├── FrameSelector.jsx
│   │   └── PhotoPreview.jsx
│   │
│   ├── gallery/
│   │   ├── GalleryGrid.jsx
│   │   └── GalleryItem.jsx
│   │
│   └── ui/
│
├── pages/
│   ├── Welcome.jsx
│   ├── Layout.jsx
│   ├── Frame.jsx
│   ├── Camera.jsx
│   ├── Preview.jsx
│   ├── Customize.jsx
│   ├── Result.jsx
│   ├── Gallery.jsx
│   ├── EventSetup.jsx
│   └── Settings.jsx
│
├── hooks/
│   ├── useCamera.js
│   ├── useCountdown.js
│   └── useLocalStorage.js
│
├── services/
│   ├── db.js
│   ├── imageProcessor.js
│   ├── storage.js
│   └── share.js
│
├── data/
│   ├── layouts.js
│   └── frames.js
│
├── utils/
│   ├── imageUtils.js
│   ├── dateUtils.js
│   └── fileUtils.js
│
├── App.jsx
└── main.jsx
```

---

# 40. Public Folder

```text
public/
│
├── frames/
│   ├── floral-01.png
│   ├── floral-02.png
│   ├── wedding-gold.png
│   └── corporate.png
│
├── sounds/
│   ├── countdown.mp3
│   ├── capture.mp3
│   └── success.mp3
│
├── icons/
│
└── manifest/
```

---

# 41. Application State

Recommended state categories:

## Event State

```text
Event Name
Event Date
Logo
Selected Theme
Default Frame
Default Layout
```

## Session State

```text
Current Photos
Current Layout
Selected Frame
Session Step
Final Image
```

## Device State

```text
Camera Permission
Camera Device
Orientation
Online / Offline Status
```

---

# 42. Responsive Design

Primary target:

```text
iPad Portrait
```

Secondary target:

```text
iPad Landscape
Desktop
Android Tablet
```

Do not prioritize phones for the main kiosk UI.

---

# 43. Portrait Mode

Recommended because the wooden booth design uses a vertically mounted iPad.

Example target:

```text
768 × 1024
820 × 1180
834 × 1194
```

UI should still use relative units rather than fixed dimensions.

---

# 44. Touch-Friendly Rules

Minimum touch target:

```text
48px
```

Recommended main button:

```text
60–72px
```

Use:

- Large buttons
- Large spacing
- Large icons
- No hover-only functions

---

# 45. PWA Support

The project should be turned into a PWA.

Benefits:

- Install to iPad Home Screen
- More app-like behavior
- Cached application
- Better event reliability
- Reduced dependency on venue internet

Recommended:

```text
vite-plugin-pwa
```

---

# 46. Offline Mode

Target behavior:

```text
Internet available
      ↓
Open App
      ↓
Assets Cached
      ↓
Internet Lost
      ↓
Photobooth Still Works
```

Offline features:

- Camera
- Frames
- Layouts
- Countdown
- Photo generation
- Local gallery
- Local save
- Settings

Features requiring internet would be disabled.

---

# 47. Offline Indicator

Small operator-only indicator:

```text
● Offline Mode
```

or:

```text
● Online
```

Guests do not need to see technical status unless necessary.

---

# 48. Photo Session Logic

Example 3-photo session:

```text
Start Session
      ↓
Initialize Session ID
      ↓
Photo #1 Countdown
      ↓
Capture
      ↓
Photo #2 Countdown
      ↓
Capture
      ↓
Photo #3 Countdown
      ↓
Capture
      ↓
Generate Final Strip
      ↓
Preview
      ↓
Save
```

---

# 49. Session IDs

Even without a server/database, generate local IDs.

Example:

```text
SESSION-20261007-102530
```

Useful for:

- File names
- Gallery organization
- Debugging
- Printing

---

# 50. File Naming

Final photos:

```text
photobooth_20261007_102530.jpg
```

Possible extended format:

```text
company-party_20261007_102530.jpg
```

Avoid guest names to keep sessions fast.

---

# 51. Image Quality

Recommended camera capture:

```text
1280 × 960
```

or higher if supported.

Final exported photo:

```text
1500–2500px
```

depending on layout.

Avoid storing excessively large raw camera frames because storage will fill quickly.

---

# 52. Thumbnail Generation

For the gallery:

Do not load full-size images for every card.

Create smaller thumbnails.

Example:

```text
300px width
```

Store:

```text
original Blob
thumbnail Blob
```

This makes the gallery faster.

---

# 53. Storage Management

Because the application is local-only, storage management is important.

Display warning:

```text
Storage is almost full.
Please export or delete older photos.
```

Recommended thresholds:

```text
70% – warning
85% – critical warning
```

Browser storage limits vary by device, so the application should avoid assuming unlimited space.

---

# 54. Export Event

Future useful feature:

```text
Export Current Event
```

Possible process:

```text
Select All Event Photos
      ↓
Create ZIP
      ↓
Download
```

Recommended library:

```text
JSZip
```

This allows the booth operator to back up all event photos.

---

# 55. Printing

Printing should be optional.

Initial version:

Use browser printing.

```javascript
window.print()
```

Possible future support:

- Dedicated photo printer
- Wireless AirPrint
- Local print bridge

Printer support depends heavily on the actual printer model.

---

# 56. Animation

Use Motion for subtle animations.

Recommended:

### Welcome

- Fade in
- Leaf decoration motion
- Button scale

### Countdown

- Large number scale

### Capture

- White flash overlay

### Final Result

- Confetti
- Check animation

Avoid excessive animations because the app should feel responsive.

---

# 57. Sounds

Suggested sounds:

```text
Start
Countdown beep
Camera shutter
Success
```

Always provide:

```text
Sound On / Off
```

Events can sometimes require quiet operation.

---

# 58. Error Handling

Camera permission denied:

```text
Camera Access Required

Please allow camera access in Safari Settings.

[ TRY AGAIN ]
```

---

## Camera Not Found

```text
Camera Not Available

Please check the device camera and reload the app.
```

---

## Storage Failure

```text
Unable to save photo locally.

Please free some storage and try again.
```

---

# 59. Privacy

Because this application handles guest photos, privacy should be simple and clear.

Recommended statement:

```text
Photos are stored locally on this photobooth device.
They are not automatically uploaded to the internet.
```

This is a good selling point for the business.

---

# 60. Vercel Hosting Architecture

```text
                 ┌─────────────┐
                 │   Vercel    │
                 │ React + PWA │
                 └──────┬──────┘
                        │
              Downloads App Files
                        │
                        ▼
                 ┌─────────────┐
                 │    iPad     │
                 └──────┬──────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
     Camera         IndexedDB       localStorage
        │               │               │
        ▼               ▼               ▼
     Photos        Local Gallery     Settings
```

No server photo database is required.

---

# 61. Recommended Pages

Final page list:

```text
/
Welcome

/layout
Choose Layout

/frame
Choose Frame

/camera
Camera

/preview
Preview

/customize
Optional Editing

/result
Final Result

/gallery
Local Gallery

/setup
Event Setup

/settings
Settings
```

React Router can be used.

---

# 62. MVP Features

The first version should contain only the features needed to run an event.

## Required

- Welcome screen
- Event setup
- Camera access
- Countdown
- Single photo
- 3-photo strip
- Frame selection
- Preview
- Retake
- Final image generation
- Save to device
- Local gallery
- IndexedDB storage
- Fullscreen UI
- Offline PWA
- Vercel deployment

---

# 63. Features to Delay

Do not initially prioritize:

- Login
- User registration
- Cloud database
- Payments
- AI filters
- Facial recognition
- Online accounts
- Analytics server
- Complicated editor
- Remote administration

These can make the first version unnecessarily complex.

---

# 64. Phase 1 – Project Setup

Tasks:

- Create Vite React project
- Install Tailwind CSS
- Install shadcn/ui
- Install Motion
- Install Lucide React
- Install React Router
- Install Dexie.js
- Configure PWA
- Configure Vercel

Goal:

```text
Basic application running on iPad.
```

---

# 65. Phase 2 – UI Foundation

Build:

- Theme
- Typography
- Buttons
- Cards
- Navigation
- Dialogs
- Touch interaction styles

Pages:

- Welcome
- Layout
- Frame
- Event Setup
- Settings

---

# 66. Phase 3 – Camera

Build:

- Camera permission
- Camera preview
- Front camera
- Camera switch
- Capture function
- Countdown

Test on actual iPad early.

---

# 67. Phase 4 – Photo Session

Build:

- Session state
- Single photo
- Multi-photo session
- Retake
- Remaining photo indicator
- Capture animation

---

# 68. Phase 5 – Image Composer

Build:

- Canvas
- Image crop
- Photo positioning
- Frame overlay
- Event name
- Event date
- Export image

---

# 69. Phase 6 – Local Storage

Build:

- IndexedDB schema
- Save captured photos
- Save final images
- Generate thumbnails
- Local gallery
- Delete photos

---

# 70. Phase 7 – Sharing

Build:

- Save image
- Web Share
- AirDrop through Share Sheet
- Download fallback

---

# 71. Phase 8 – PWA

Build:

- Web app manifest
- App icon
- Service worker
- Cache assets
- Offline loading
- Add to Home Screen testing

---

# 72. Phase 9 – Operator Features

Build:

- Hidden operator access
- Event configuration
- Storage monitor
- Clear event data
- Export photos
- Camera testing

---

# 73. Phase 10 – Printing

After confirming the actual printer model:

- Test AirPrint
- Print layout
- Print sizing
- Print button
- Printer fallback instructions

---

# 74. Phase 11 – Business Polish

Add:

- Multiple themes
- More frames
- Branded loading screen
- Custom logos
- Better animations
- Sounds
- Custom event templates

---

# 75. Recommended MVP UI Flow

```text
WELCOME
   │
   ▼
CHOOSE LAYOUT
   │
   ▼
CHOOSE FRAME
   │
   ▼
CAMERA
   │
   ▼
COUNTDOWN
   │
   ▼
CAPTURE
   │
   ▼
PREVIEW
   │
   ├── Retake ───────────────┐
   │                         │
   ▼                         │
USE PHOTO                    │
   │                         │
   ▼                         │
GENERATE FINAL IMAGE         │
   │                         │
   ▼                         │
RESULT                       │
   │                         │
   ├── Save                  │
   ├── Share                 │
   ├── Print                 │
   │                         │
   └── Take Another ─────────┘
```

---

# 76. Recommended First Release

For Version 1, build:

```text
1. Welcome
2. Event Setup
3. Choose Layout
4. Choose Frame
5. Camera
6. Countdown
7. Multi-shot capture
8. Preview
9. Final image generation
10. Save to Device
11. Local Gallery
12. Offline PWA
```

This is already enough for a real photobooth business.

---

# 77. Version 2 Ideas

After Version 1 is stable:

- GIF booth
- Boomerang
- Video booth
- Filters
- Stickers
- Drawing
- Custom messages
- More templates
- Event-specific branding
- Export ZIP
- Print queue
- QR sharing
- Temporary cloud gallery

---

# 78. Version 3 Ideas

Possible business expansion:

```text
Photobooth Software as a Service
```

Instead of only using the application yourself, eventually offer it to other photobooth operators.

Possible future features:

- Operator accounts
- Subscription
- Event dashboard
- Cloud template library
- Remote settings
- Cloud gallery
- Custom business branding

This should only be considered once the local photobooth business is proven.

---

# 79. Business Advantage

The concept has several advantages:

- Compact physical setup
- Easy transport
- Lower hardware cost
- No expensive photobooth computer
- No monthly database cost
- Minimal internet dependency
- Fast event setup
- Private local photo storage
- Custom software branding
- Easy to create different event packages

---

# 80. Suggested Product Positioning

Possible message:

```text
A modern mobile photobooth experience built for
weddings, birthdays, corporate events, and celebrations.
```

Possible tagline:

```text
Capture the Good Moments.
```

Other options:

```text
Good People. Better Memories.
```

```text
Capture. Smile. Keep the Memory.
```

---

# 81. Final Recommended Architecture

```text
Hardware
────────────────────────
iPad
Wooden Booth
Ring Light
Optional Printer
Portable Power

            │
            ▼

Software
────────────────────────
React
Vite
Tailwind
shadcn/ui
Motion
Dexie
Canvas API
PWA

            │
            ▼

Storage
────────────────────────
localStorage
     +
IndexedDB
     +
Manual Save to Device

            │
            ▼

Hosting
────────────────────────
Vercel

NO Laravel
NO MySQL
NO Firebase
NO Cloud Photo Database
```

---

# 82. Final Development Priority

The most important rule for this project:

```text
Build the photobooth experience first.
Build extra features later.
```

Prioritize:

1. Camera reliability
2. Touch-friendly UI
3. Good image quality
4. Fast photo processing
5. Local storage reliability
6. Offline support
7. Simple event configuration
8. Stable iPad experience

Once these are working properly, the system can be safely used as the software foundation of the physical photobooth business.
