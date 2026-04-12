# Bodee Books on Next.js

This repository is the first pass at moving `bodeebooks.com` off a traditional shared host and onto a GitHub -> Vercel workflow.

## What is included

- A Next.js App Router site with a redesigned editorial homepage
- Dedicated pages for `Audiobooks`, `Books`, and `Games`
- Automatic YouTube ingest for the Bodee Books channel
- A JSON endpoint at `/api/audiobooks` so the feed can be reused elsewhere later

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel deployment

1. Create a GitHub repository for this site.
2. Push this code to the default branch.
3. Import the repository into Vercel.
4. Vercel will detect Next.js automatically.
5. Every push to the production branch will trigger a new deployment.

## Environment variables

These are optional. The defaults already target the current site and YouTube handle.

```bash
NEXT_PUBLIC_SITE_URL=https://bodeebooks.com
YOUTUBE_CHANNEL_HANDLE=@bodeebooks
```

The current implementation resolves the YouTube channel ID from the public handle page and then reads the public RSS feed, which means no API key is required for automatic audiobook updates.
