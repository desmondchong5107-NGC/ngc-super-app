# NGC Super App

An iOS-first Progressive Web App containing NGC's everyday tools in one place.

## Live App

https://ngc-super-app.vercel.app

## Included Tools

- EPF eligibility calculator
- Commission calculator
- Dynamic campaign shortcut
- Native iOS result sharing
- Add to Home Screen support
- Offline calculator access through a service worker
- iPhone Web Push notification opt-in
- iOS-style Notification Inbox with unread status
- All / Unread / Campaign / General filters
- New and Earlier notification grouping
- Full notification details, campaign metrics and sharing
- Refresh, Mark Unread and Mark All Read controls
- Automatic HERO 88 weekly-summary generation
- Protected Campaign Update publisher
- General Info publisher for announcements, reminders, events and training
- One-tap WhatsApp sharing

## Install on iPhone

1. Open the live app in Safari.
2. Tap the Share button.
3. Choose **Add to Home Screen**.
4. Tap **Add**.
5. Open NGC from the Home Screen, tap the bell, then choose **Turn On**.

Web Push on iPhone requires iOS 16.4 or later and the installed Home Screen app. Notification permission is requested only after the user taps the bell.

## Campaign Update Admin

The publisher is available at `https://ngc-super-app.vercel.app/push-admin.html` and requires the private admin key.

- **Campaign Update** loads the previous completed week from the HERO 88 tracker, lets the admin confirm submission/referral counts, and generates the full weekly summary.
- **General Info** publishes announcements, reminders, events, training details or other team information.

Both modes publish to the in-app Notification Centre, send a short push alert, and support the iOS share sheet for WhatsApp.

The VAPID private key, admin key, database credentials, and subscription records are stored only in the protected Supabase backend; they are not included in this public repository.

## Campaign Configuration

Edit `campaign-config.json` to change the campaign name, link, badge, schedule, or visibility without changing the app layout.

## Notice

Calculator results are estimates. Actual eligibility and commission may vary according to the latest applicable rules and transaction terms.

Copyright © 2026 NGC. All rights reserved.
