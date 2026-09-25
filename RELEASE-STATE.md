# Mirrorly prelaunch page — 2026-09-25

The complete previous website is preserved in the remote Git tag `mirrorly-before-coming-soon-2026-09-25`, commit `802f31309e671e19db662fce879f5bd6faa96abe`.

The root landing page now presents Coming soon, with the owner's exact 20-second hero video. There is no download button, App Store smart banner, price or Offer schema on this page. Existing guide, translation and privacy routes are preserved. The new studio Learn more link navigates directly to /TheMirrorly/; no redirect hop is needed.

To prepare launch, restore the previous homepage into a review branch using `git restore --source=mirrorly-before-coming-soon-2026-09-25 -- index.html`. Its CSS and other assets remain in place. Before publishing that restored version, migrate its old bashubb.github.io canonical, social and hreflang URLs to bashubb.com, verify live App Store availability and pricing, and reconcile translated pages and sitemap URLs. Do not restore the entire repository over unrelated later work.

Hero asset copied unchanged from /Users/hubert/Desktop/Apps/PromoVideos/Mirrorly/mirrorly/movie_onboarding/la_linea_promo/v11_storm_emotion/exports/mirrorly_storm_superhero_v11_20s.mp4. H.264/AAC, 1080×1920, 20 seconds. Muted playback with native controls; reduced motion disables automatic playback.
