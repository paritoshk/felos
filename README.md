# felos ⚡

**AI-powered marketing agent with x402 micropayments**

Built with **Thesys C1** (Generative UI) + **Coinbase x402** + **MongoDB Atlas** + **Fireworks AI**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Thesys C1 Chat Interface                    │
│         (Generative UI with rich components)            │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  Next.js API Route                       │
│            /api/chat (tool calling)                     │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌──────────┐
    │Firecrawl│    │ Fireworks│    │ Fireworks│
    │ $0.01   │    │ LLM $0.02│    │FLUX $0.06│
    └────┬────┘    └────┬─────┘    └────┬─────┘
         │              │               │
         └──────────────┼───────────────┘
                        ▼
               x402 Micropayments
                        │
                        ▼
                  MongoDB Atlas
```

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.local.example .env.local
# Add your API keys

# Run
npm run dev
```

## API Keys Needed

| Service | Where | Credits |
|---------|-------|---------|
| **Thesys C1** | thesys.dev | Sponsor - free |
| **MongoDB** | mongodb.com/atlas | Hackathon sandbox |
| **Fireworks** | fireworks.ai | Code `AGENT26` = $50 |
| **Firecrawl** | firecrawl.dev | Free tier |

## File Structure

```
app/
├── page.tsx              # Thesys C1 Thread chat
├── api/chat/route.ts     # Tool calling endpoint
lib/
├── db.ts                 # MongoDB + pricing
├── tools.ts              # Agent tools (scrape, generate, etc.)
├── systemPrompt.ts       # Agent personality
```

## Agent Tools

| Tool | Cost | Description |
|------|------|-------------|
| `scrapeProduct` | $0.01 | Extract product info from URL |
| `generateAdCopy` | $0.02 | Create 3 ad variations |
| `generateAdImage` | $0.06 | FLUX.1 image generation |
| `getSpendingReport` | Free | Show savings vs subscriptions |

## The Money Story 💰

**Without felos (DIY subscriptions):**
- Firecrawl Pro: $99/mo
- Fireworks: $50/mo
- Image Gen: $20/mo
- Copy AI: $30/mo
- **Total: $199/month**

**With felos (x402):**
- Complete ad: **$0.09**
- **Savings: 99.95%**

## Demo Script (2 min)

| Time | Action | Script |
|------|--------|--------|
| 0:00 | Show chat | "This is felos — an AI agent that pays for its own tools via x402" |
| 0:15 | Type URL | "Let's create ads for this product..." |
| 0:25 | Watch scrape | "1 cent to Firecrawl via x402" |
| 0:35 | See ad copy | "2 cents to Fireworks for 3 variations" |
| 0:50 | Ask for images | "Generate images for these ads" |
| 1:00 | See images | "6 cents each via FLUX.1" |
| 1:15 | "Show spending" | Display savings report |
| 1:30 | Savings popup | "**$0.21 total vs $199/month**" |
| 1:45 | Explain x402 | "Agent discovers and pays for services autonomously" |
| 2:00 | Close | "**Stop subscribing. Start creating.**" |

## Key Demo Commands

Try these in the chat:

1. **"Create ads for https://amazon.com/dp/B08N5WRWNW"**
2. **"Generate a playful ad for a coffee subscription called BeanBox"**
3. **"Show me my spending report"**
4. **"How much would this cost with subscriptions?"**

## Judging Criteria ✅

- [x] **Thesys C1** — Generative UI chat interface
- [x] **MongoDB** — Transaction logging + session state
- [x] **x402** — Real micropayments per tool call
- [x] **Agentic** — Autonomous tool selection
- [x] **Business Value** — 99.95% cost savings

## Tagline

> **"Stop subscribing. Start creating."**
> 
> $199/month in tools → $0.09 per ad

---

Built for MongoDB Agentic Orchestration Hackathon • Jan 2026
