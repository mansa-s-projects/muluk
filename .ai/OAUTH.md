We are implementing social platform connections.

Requirements:
- OAuth for YouTube, TikTok, Instagram, X
- Real data ingestion (followers, engagement, DM signals)
- Clean redirect back to onboarding
- Store connection state

Current status:
- YouTube OAuth fully configured: routes exist and `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` are set in `.env.local`