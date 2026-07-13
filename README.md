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
- Protected Push Notification admin page

## Install on iPhone

1. Open the live app in Safari.
2. Tap the Share button.
3. Choose **Add to Home Screen**.
4. Tap **Add**.
5. Open NGC from the Home Screen and tap the bell to enable notifications.

Web Push on iPhone requires iOS 16.4 or later and the installed Home Screen app. Notification permission is requested only after the user taps the bell.

## Push Notification Admin

The sender is available at `https://ngc-super-app.vercel.app/push-admin.html` and requires the private admin key. The VAPID private key and subscription records are stored only in the protected Supabase backend; they are not included in this public repository.

## Campaign Configuration

Edit `campaign-config.json` to change the campaign name, link, badge, schedule, or visibility without changing the app layout.

## Notice

Calculator results are estimates. Actual eligibility and commission may vary according to the latest applicable rules and transaction terms.

Copyright © 2026 NGC. All rights reserved.
