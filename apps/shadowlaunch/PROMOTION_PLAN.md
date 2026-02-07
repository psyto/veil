# ShadowLaunch Promotion Plan

## Pump.fun MVP Hackathon Application

**Timeline:** Now → Feb 18, 2026 (Winners Announced)
**Category:** MVP (1 → 10 Stage)
**Prize:** $250,000 investment

---

## Executive Summary

ShadowLaunch is a privacy-first token purchase tool for Pump.fun. We enable users to buy tokens without creating an on-chain link to their main wallet, protecting them from front-running, copy trading, and wallet tracking.

**Why MVP Category:**
- Working prototype with full purchase flow
- Real Pump.fun integration
- Demonstrates clear problem-solution fit
- Ready for product-market fit validation

---

## Week-by-Week Promotion Plan

### Week 1: Launch & Foundation (Days 1-7)

#### Day 1-2: Token Launch
- [ ] Launch $SHADOW token on Pump.fun
- [ ] Initial buy to seed liquidity
- [ ] Announce launch on Twitter with demo video
- [ ] Pin tweet with: Problem → Solution → Demo

**Token Narrative:**
```
$SHADOW - The privacy layer for Pump.fun

Every wallet you watch is watching you back.
Every trade you make leaves a trail.
Every alpha you find gets front-run.

ShadowLaunch breaks the chain.
Buy tokens. Leave no trace.

pump.fun/SHADOW
```

#### Day 3-4: Infrastructure & Partnerships
- [ ] Deploy app to Vercel (get live URL)
- [ ] DM QuickNode for RPC credits + partnership announcement
- [ ] Reach out to Light Protocol for ZK compression collaboration
- [ ] Set up Telegram group for $SHADOW holders

#### Day 5-7: Content Blitz
- [ ] Record 2-min demo video for application
- [ ] Create Twitter thread explaining the tech
- [ ] First Pump.fun stream: "Building ShadowLaunch Live"
- [ ] Submit hackathon application

---

### Week 2: Build in Public (Days 8-14)

#### Daily Streams/Updates
Stream schedule (pick consistent time):
- **Mon/Wed/Fri:** Live coding streams on Pump.fun (1-2 hours)
- **Tue/Thu:** Twitter Spaces or recorded updates
- **Sat/Sun:** Weekly recap + community Q&A

#### Content Calendar

| Day | Content Type | Topic |
|-----|--------------|-------|
| 8 | Twitter Thread | "Why wallet privacy matters on Pump.fun" |
| 9 | Live Stream | Implementing new feature X |
| 10 | Demo Video | Before/After: Tracked vs Shadow purchase |
| 11 | Twitter Thread | Technical deep-dive: Ephemeral wallets |
| 12 | Live Stream | Bug fixes + community feedback |
| 13 | Meme Content | "POV: You're a whale trying to hide" |
| 14 | Weekly Recap | Progress update + metrics |

#### Features to Ship Live
- [ ] Token holder dashboard
- [ ] Ephemeral wallet export (JSON/QR)
- [ ] Transaction history view
- [ ] Mobile responsive improvements

---

### Week 3: Growth & Traction (Days 15-21)

#### User Acquisition
- [ ] Launch referral program (share shadow purchases)
- [ ] Partner with alpha groups for private testing
- [ ] Create "Shadow Score" - privacy rating for wallets
- [ ] Integration with popular wallet trackers (show what you're hiding from)

#### Influencer Outreach
Target crypto privacy advocates:
- Privacy-focused traders
- Solana developers
- DeFi analysts who discuss front-running

**DM Template:**
```
Hey [name],

Building ShadowLaunch for the Pump.fun hackathon - privacy-first token purchases that break wallet tracking.

Your content on [specific topic] resonated with what we're solving. Would love your feedback on the product.

Demo: [URL]
Token: pump.fun/SHADOW

Happy to do a collab stream if interested.
```

#### Metrics to Track & Share
- Number of shadow purchases
- SOL volume through privacy pool
- Unique ephemeral wallets created
- $SHADOW market cap growth
- Telegram/Discord member count

---

### Week 4: Final Push (Days 22-28)

#### Polish & Ship
- [ ] Fix all reported bugs
- [ ] Performance optimization
- [ ] Security audit (even informal)
- [ ] Final demo video with all features

#### Community Events
- [ ] AMA with $SHADOW holders
- [ ] "Shadow Trading Competition" - most private trader wins
- [ ] Partnerships announcement stream
- [ ] Thank you video to community

#### Final Application Materials
- [ ] Updated demo video (3-5 min)
- [ ] Metrics dashboard screenshot
- [ ] Community testimonials
- [ ] Technical documentation

---

## Content Templates

### Twitter Thread: Launch Announcement
```
1/ Introducing ShadowLaunch 🥷

Privacy-first token purchases on @pumpdotfun

Buy tokens without leaving a trace. No wallet link. No front-running. No copy traders.

Thread 🧵

2/ The Problem:

Every Pump.fun purchase you make is PUBLIC.

Wallet trackers see your buys instantly.
Copy traders front-run your alpha.
Your trading patterns are exposed.

Your wallet is a glass house.

3/ The Solution:

ShadowLaunch uses ephemeral wallets + privacy pools to break the on-chain link.

Your main wallet → Privacy Pool → Fresh Wallet → Purchase

Result: Tokens in a wallet with ZERO connection to you.

4/ How it works:

1. Connect your wallet
2. Toggle "Shadow Mode"
3. SOL routes through privacy layer
4. Fresh keypair purchases token
5. Tokens arrive unlinked

Same speed. Complete privacy.

5/ Tech stack:

- @QuickNode for high-performance RPC
- @LightProtocol for ZK compression
- Ephemeral keypairs (no seed, no recovery, no trace)

Built for the @pumpdotfun Build In Public hackathon.

6/ Try it now:

🌐 App: [URL]
🪙 Token: pump.fun/SHADOW
💬 TG: t.me/shadowlaunch
📖 Docs: github.com/psyto/veil

Privacy shouldn't cost you alpha.

RT if you've ever been front-run. 🔄
```

### Twitter Thread: Technical Deep-Dive
```
1/ How ShadowLaunch breaks wallet tracking 🔐

A technical thread on privacy-preserving token purchases.

🧵

2/ Traditional Pump.fun purchase:

Your Wallet (known) → Pump.fun → Tokens

Anyone watching your wallet sees:
- What you bought
- When you bought
- How much you spent

3/ Shadow purchase flow:

Your Wallet → Privacy Pool → Ephemeral Wallet → Pump.fun → Tokens

The ephemeral wallet:
- Generated fresh (Keypair.generate())
- No seed phrase
- No transaction history
- Zero link to you

4/ The privacy pool:

We use shielded transfers to break the chain.

Your SOL enters the pool.
"Someone's" SOL exits to a fresh address.

On-chain, there's no way to link input to output.

5/ Why this matters:

- No more copy traders
- No more front-running
- No more wallet doxxing
- Trade with confidence

Your alpha stays yours.

6/ Trade-offs:

- Slightly higher fees (~0.003 SOL vs 0.000005)
- Ephemeral wallet management
- Can't easily consolidate to main wallet

Privacy has a cost. We think it's worth it.

7/ What's next:

- Batch purchases
- Multi-token privacy
- Mobile app
- Cross-chain support

Follow for updates. Building in public for @pumpdotfun hackathon.

github.com/psyto/veil
```

### Pump.fun Stream Script
```
INTRO (2 min)
- "Hey everyone, welcome to the ShadowLaunch dev stream"
- Quick recap: what is ShadowLaunch
- Today's goals: [specific features]

BUILDING (45-60 min)
- Screen share VS Code
- Explain what you're building as you code
- Read and respond to chat
- Celebrate small wins ("nice, that worked!")

DEMO (10 min)
- Show the feature working
- Walk through the flow
- Explain the privacy benefit

Q&A (10 min)
- Answer questions from chat
- Take feature requests
- Discuss roadmap

OUTRO (3 min)
- Recap what was built
- Tease next stream
- CTA: "Buy $SHADOW, join TG, follow for updates"
```

---

## Partnership Outreach

### QuickNode
**Status:** They followed you on Twitter ✅
**Action:** DM + Tweet

```
DM:
Hi QuickNode team!

Thanks for the follow! Building ShadowLaunch for the Pump.fun $3M hackathon - privacy-first token purchases on Solana.

Already integrated QuickNode as our primary RPC (it's in our docs + README).

Would love to:
1. Get hackathon RPC credits if available
2. Discuss a partnership mention
3. Share a case study on privacy + RPC reliability

Happy to demo anytime.

App: [URL]
Repo: github.com/psyto/veil
```

### Light Protocol
**Why:** ZK compression technology
**Action:** Twitter DM + Email

```
Building privacy infrastructure for Pump.fun using ZK compression concepts. Would love to integrate Light Protocol for production shielded transfers.

Currently in Pump.fun hackathon (MVP stage). Could this be a good collaboration?
```

### Helius
**Why:** Enhanced Solana APIs, already in our stack
**Action:** Twitter engagement + DM

---

## Metrics Dashboard (Track Daily)

| Metric | Day 1 | Day 7 | Day 14 | Day 21 | Day 28 |
|--------|-------|-------|--------|--------|--------|
| $SHADOW Market Cap | | | | | |
| $SHADOW Holders | | | | | |
| App Users (unique) | | | | | |
| Shadow Purchases | | | | | |
| SOL Volume | | | | | |
| Twitter Followers | | | | | |
| Telegram Members | | | | | |
| GitHub Stars | | | | | |
| Stream Viewers (avg) | | | | | |

---

## Risk Mitigation

### If token dumps early:
- Keep building, show dedication
- "We're here for the product, not the price"
- Double down on shipping features

### If low engagement:
- Pivot content strategy
- Try different streaming times
- Collaborate with other hackathon participants

### If technical issues:
- Be transparent about bugs
- Stream the debugging process
- "Building in public means showing the hard parts too"

---

## Application Checklist

### Required Materials
- [ ] Pump.fun token launched ($SHADOW)
- [ ] Short introductory video (2-3 min)
- [ ] Working product demo
- [ ] Application form submitted

### Supporting Materials
- [ ] Live app URL
- [ ] GitHub repository
- [ ] Technical documentation
- [ ] Team/founder info
- [ ] Roadmap

### Proof of Building in Public
- [ ] Twitter activity log
- [ ] Stream recordings
- [ ] Community engagement metrics
- [ ] Partnership announcements

---

## Daily Routine

**Morning:**
- Check $SHADOW price/activity
- Review overnight community messages
- Plan content for the day
- Ship one small feature or fix

**Afternoon:**
- Tweet update or thread
- Engage with community
- Outreach to 2-3 potential partners/influencers

**Evening:**
- Stream (if scheduled)
- Respond to all DMs/mentions
- Update metrics dashboard
- Prep for next day

---

## Success Criteria

**Minimum Viable Success:**
- Application submitted
- Token launched with some traction
- Consistent build-in-public activity
- Working product demo

**Target Success:**
- Top 12 finalist
- $250k investment
- 1000+ $SHADOW holders
- Active community

**Stretch Success:**
- Winner of MVP category
- Partnership announcements
- Viral content moment
- Ongoing platform relationship

---

## Resources

- **App:** [Vercel URL TBD]
- **Token:** pump.fun/SHADOW [TBD]
- **GitHub:** github.com/psyto/veil
- **Telegram:** t.me/shadowlaunch [TBD]
- **Twitter:** @[your_handle]

---

*Last updated: Jan 29, 2026*
