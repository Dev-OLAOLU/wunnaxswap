# Netlify stuck on “Post processing”

## Why

Drag-and-drop deploys often hang forever in **Post processing** (HTML/forms/asset pass).  
Your site is tiny (~400 KB) — this is a **Netlify drag-drop bug/limitation**, not your files.

Stuck deploys **> 10 minutes almost never finish**. Cancel them.

## Fix that actually works: stop using drag-and-drop

### Option A — Link GitHub (recommended)

1. Netlify → **wunnaxswap** site  
2. **Site configuration → Build & deploy → Continuous deployment → Link repository**  
3. Choose **Dev-OLAOLU/wunnaxswap**, branch **main**  
4. Build command: leave empty or `exit 0`  
5. Publish directory: `.`  
6. Under **Post processing**, turn **OFF** asset optimization / pretty URLs  
7. **Deploys → Trigger deploy**  

After that, every `git push` updates the site. No drag-drop.

### Option B — GitHub Actions + Netlify token

See `.github/workflows/netlify-deploy.yml`  
Add secrets `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID`, then push.

### Option C — Cancel stuck deploy and wait

Cancel all “In progress” deploys. Production stays on the **last successful** deploy  
(https://wunnaxswap.netlify.app may still work).

## Do not

- Wait hours on one stuck deploy  
- Drag the whole `One Piece 1` folder  
- Start a new drop while another is “Post processing”
