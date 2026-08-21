/* GrassRoots — Cannabis Community SPA */

const App = (() => {
  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    user: null,
    route: { page: 'home', params: {} },
    votes: {},
    joined: new Set(),
    sort: 'hot',
  };

  // ── Seed Data ──────────────────────────────────────────────────────────────
  const COMMUNITIES = [
    { id: 'cultivation', name: 'Cultivation', icon: '🌱', members: 142800, color: '#166534', description: 'Everything about growing your own. From seed to harvest.' },
    { id: 'strains',     name: 'Strains',     icon: '🍃', members: 98400,  color: '#15803d', description: 'Strain reviews, genetics, and recommendations.' },
    { id: 'edibles',     name: 'Edibles',     icon: '🍪', members: 76200,  color: '#92400e', description: 'Recipes, dosing, and all things edible.' },
    { id: 'extracts',    name: 'Extracts',    icon: '💎', members: 54100,  color: '#1e40af', description: 'Concentrates, dabs, rosin, and extraction techniques.' },
    { id: 'medical',     name: 'Medical',     icon: '🏥', members: 89300,  color: '#9f1239', description: 'Medical cannabis, conditions, and patient experiences.' },
    { id: 'news',        name: 'CannabisNews',icon: '📰', members: 210500, color: '#374151', description: 'Cannabis industry news, legislation, and culture.' },
    { id: 'memes',       name: 'WeedMemes',   icon: '😂', members: 321000, color: '#7c3aed', description: 'The dankest memes on the internet.' },
    { id: '420',         name: 'trees',       icon: '🌳', members: 1240000,color: '#065f46', description: 'The classic cannabis community. Welcome home.' },
  ];

  const POSTS = [
    {
      id: 1, community: '420', author: 'CoastalGrower', title: 'Finally harvested my outdoor White Widow after 6 months — absolutely worth the wait',
      body: `This was my first serious outdoor grow and I couldn't be happier with the results. Started from seed in April, trained her heavy with LST for the first two months, and let her go natural after that.\n\nEnded up with just over 4oz dry from a single plant. The terpene profile is incredible — super piney with hints of pepper and earth. Cure has been going for three weeks now and it just keeps getting better.\n\nTips for anyone doing outdoor for the first time:\n1. Start early so you catch the full season\n2. LST is your best friend — doubles your yield\n3. Don't harvest early no matter how tempting it is\n4. Invest in a good pH meter before anything else`,
      score: 4821, comments: 312, age: '6 hours ago', awards: ['🏆', '🌟'], flair: 'Harvest'
    },
    {
      id: 2, community: 'strains', author: 'TerpHunter420', title: 'Honest review: Gelato 41 from three different dispensaries — huge differences in quality',
      body: `Picked up Gelato 41 from three separate dispos this month to do a proper comparison. Same strain, wildly different results.\n\nDispo A (boutique, $65/8th): Dense, frosty nugs. Incredible nose — sweet cream, berries, gas. Burns smooth, great ash, long-lasting effect. Clearly grown with care.\n\nDispo B (chain, $45/8th): Decent bag appeal but the smell is weak. Feels like it was harvested a bit early. Effect is there but fades fast.\n\nDispo C (budget, $35/8th): Honestly? Avoid. Hay smell, harsh smoke, probably old stock. Not worth it even at the price.\n\nConclusion: With flower, you really do get what you pay for. The boutique stuff is worth the premium.`,
      score: 2193, comments: 187, age: '11 hours ago', awards: ['🌟'], flair: 'Review'
    },
    {
      id: 3, community: 'cultivation', author: 'BasementBuddhist', title: 'My 4x4 tent setup after 2 years of dialing it in — full breakdown with costs',
      body: `A lot of people ask what my setup looks like so here's the full rundown.\n\n**Tent:** AC Infinity 4x4 — worth every penny over cheap alternatives\n**Light:** HLG 350R — runs cool, incredible spectrum, 2+ years no issues\n**Ventilation:** AC Infinity T6 with controller — auto adjusts to temp/humidity\n**Pots:** 5gal fabric pots — roots love them\n**Medium:** Coco/perlite 70/30 mix\n**Nutes:** GH Flora trio + Calimagic\n\n**Total sunk cost: ~$1,400**\n\nAverage yield per run: 6-8oz over 10-12 weeks. At local prices that pays itself back in 3-4 harvests. Happy to answer any questions.`,
      score: 7432, comments: 521, age: '1 day ago', awards: ['🏆', '🌟', '💚'], flair: 'Setup'
    },
    {
      id: 4, community: 'edibles', author: 'CannaChef', title: 'Made cannabutter with 28g of trim and got WAY more potent results than expected — my method',
      body: `Used to throw my trim away. Never again.\n\n**Decarb:** 240°F for 40 minutes on a baking sheet covered with foil. Don't skip this step.\n\n**Infusion:** 2 cups unsalted butter + 2 cups water (the water helps purify) + your decarbed material. Low simmer for 4 hours stirring occasionally.\n\n**Strain:** Through cheesecloth, squeeze every drop.\n\n**Separate:** Refrigerate overnight. The butter solidifies on top, water stays below. Pop it off and discard the water.\n\nEnd result: 1.5 cups of deeply green, incredibly potent butter. Made brownies with half and had to cut them into 16 pieces — these things are serious.\n\nDose carefully. Start with 1/4 of whatever you think you need.`,
      score: 3881, comments: 244, age: '2 days ago', awards: ['🌟'], flair: 'Recipe'
    },
    {
      id: 5, community: 'news', author: 'GreenReporter', title: 'Germany reports 2 million registered cannabis club members in first year of legalization',
      body: `Germany's Cannabis Social Clubs have seen explosive growth since legalization took effect, with official figures showing over 2 million registered members across approximately 4,200 licensed clubs.\n\nThe model, which allows non-commercial cultivation and distribution among members, has largely avoided the issues predicted by critics. Youth usage has not significantly increased, and black market activity has reportedly decreased in major urban centers.\n\nHealth advocates are calling the first year a cautious success, though they note that regulations vary significantly by state and enforcement remains inconsistent.\n\nFull report from the Federal Health Ministry expected next month.`,
      score: 9104, comments: 876, age: '3 hours ago', awards: ['🏆', '🌟', '📰'], flair: 'International'
    },
    {
      id: 6, community: 'memes', author: 'DabDaddy69', title: 'When the dispensary says the edibles are "mild"',
      body: `[Image: man completely melted into couch with TV remote just out of reach, looking at it like it's on Mars]\n\nMild they said. You'll be fine they said.`,
      score: 15200, comments: 432, age: '5 hours ago', awards: ['😂', '🌟', '💀'], flair: 'Relatable'
    },
    {
      id: 7, community: 'medical', author: 'ChronicPainWarrior', title: 'After 8 years on opioids, cannabis has changed my life — my experience and what worked',
      body: `I was prescribed opioids for a chronic back condition after a workplace injury in 2016. By 2022, I was on a dose my doctor was uncomfortable with and I was barely functional.\n\nI live in a legal state and finally got my medical card in early 2023. What followed was 18 months of trial and error.\n\nWhat works for me: High-CBD tincture during the day (20:1 CBD:THC) — keeps pain manageable without impairment. Indica-dominant flower at night for sleep and deeper pain relief.\n\nI'm now completely off opioids. That's something I never thought I'd say.\n\nI'm not saying this works for everyone. Talk to your doctor. But if you're struggling and haven't explored cannabis seriously, please look into it.`,
      score: 18900, comments: 1203, age: '1 day ago', awards: ['🏆', '🌟', '💚', '❤️'], flair: 'Personal Story'
    },
    {
      id: 8, community: 'extracts', author: 'RosinRookie', title: 'First time pressing rosin — got 18% return on some decent input, pretty happy',
      body: `Finally pulled the trigger on a Sasquash Twist press after lurking here for months.\n\nInput: 7g of decent but not top-shelf flower (OG Kush, probably 2-3 weeks post-cure)\nTemp: 190°F\nPressure: Started low, ramped up over 3 minutes\nReturn: 1.26g of beautiful golden rosin\n\nThe flavor is incredible compared to BHO I've bought commercially. Terpenes are so much more present.\n\nOne mistake: I waited too long to collect — got a little more spread than I wanted. Next time I'm pulling the paper faster.\n\nAnyone have tips for getting returns above 20% on mid-grade input? Seen people claim 25%+ and I want to know their secrets.`,
      score: 1892, comments: 143, age: '8 hours ago', awards: ['🌟'], flair: 'First Timer'
    },
  ];

  const COMMENTS = {
    1: [
      { id: 101, author: 'SunriseGardener', body: 'Beautiful! White Widow outdoors is so underrated. What was your veg time like before you put her outside?', score: 342, age: '5h ago', replies: [
        { id: 1011, author: 'CoastalGrower', body: 'Started her indoors under a T5 for about 6 weeks then hardened off over 2 weeks before full sun. She was already pretty bushy by the time she went out.', score: 187, age: '5h ago', replies: [] },
      ]},
      { id: 102, author: 'TrichomeTech', body: 'What was your final dry weight after a full cure? And what did the trichomes look like when you pulled?', score: 218, age: '4h ago', replies: [] },
      { id: 103, author: 'GrowBro_99', body: 'That LST tip is real. I doubled my first outdoor yield just by bending and tying. Game changer for beginners.', score: 156, age: '3h ago', replies: [] },
    ],
    2: [
      { id: 201, author: 'FlavorChaser', body: 'This is exactly the kind of comparison content we need more of. The dispensary lottery is real — same strain, totally different experience.', score: 421, age: '10h ago', replies: [] },
      { id: 202, author: 'BudSommelier', body: 'Boutique > chain every time in my experience. The chains just move too much volume to maintain quality consistency.', score: 289, age: '9h ago', replies: [] },
    ],
    3: [
      { id: 301, author: 'FabricFan', body: 'HLG lights are worth the premium for sure. What PPFD are you hitting at canopy?', score: 512, age: '22h ago', replies: [
        { id: 3011, author: 'BasementBuddhist', body: 'Running around 800-900 during veg, bumping to 1000-1100 in flower with the dimmer maxed. CO2 would let me push higher but I\'m keeping it simple.', score: 234, age: '21h ago', replies: [] },
      ]},
      { id: 302, author: 'CocoKing', body: 'Coco/perlite convert here too. The difference in root health and growth rate compared to soil is just undeniable once you see it.', score: 398, age: '20h ago', replies: [] },
    ],
  };

  // ── Routing ────────────────────────────────────────────────────────────────
  function navigate(page, params = {}) {
    state.route = { page, params };
    window.scrollTo(0, 0);
    render();
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  function login(username) {
    state.user = { username, karma: Math.floor(Math.random() * 50000) + 1000, joined: 'January 2024' };
    closeModal();
    toast(`Welcome back, u/${username}!`);
    render();
  }

  function logout() {
    state.user = null;
    toast('Logged out.');
    render();
  }

  // ── Voting ─────────────────────────────────────────────────────────────────
  function vote(id, dir) {
    if (!state.user) { showModal('login'); return; }
    const cur = state.votes[id];
    state.votes[id] = cur === dir ? null : dir;
    render();
  }

  function getScore(post) {
    const v = state.votes[post.id];
    return post.score + (v === 'up' ? 1 : v === 'down' ? -1 : 0);
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  function showModal(type) {
    const backdrop = document.getElementById('modal-backdrop');
    const box = document.getElementById('modal-box');
    backdrop.classList.remove('hidden');

    if (type === 'login') {
      box.innerHTML = `
        <div class="modal-icon">🌿</div>
        <div class="modal-title">Welcome to GrassRoots</div>
        <div class="modal-sub">Join the uncensored cannabis community. Share, learn, and connect.</div>
        <div class="modal-form">
          <input id="modal-username" type="text" placeholder="Username" maxlength="20" />
          <input id="modal-password" type="password" placeholder="Password" />
          <button class="btn btn-primary" onclick="App.submitLogin()">Log In</button>
          <button class="btn btn-ghost" onclick="App.submitLogin()">Sign Up</button>
          <button class="btn btn-ghost btn-sm" style="font-size:12px;opacity:0.6" onclick="App.closeModal()">Cancel</button>
        </div>`;
    }

    setTimeout(() => {
      const inp = document.getElementById('modal-username');
      if (inp) inp.focus();
    }, 50);
  }

  function submitLogin() {
    const u = (document.getElementById('modal-username') || {}).value || '';
    if (u.trim().length < 2) { toast('Enter a username (min 2 chars)'); return; }
    login(u.trim());
  }

  function closeModal() {
    document.getElementById('modal-backdrop').classList.add('hidden');
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fmtNum(n) {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  }

  function getSortedPosts(communityId) {
    let posts = communityId ? POSTS.filter(p => p.community === communityId) : [...POSTS];
    if (state.sort === 'hot')  return posts.sort((a, b) => b.score - a.score);
    if (state.sort === 'new')  return posts.sort((a, b) => a.id - b.id).reverse();
    if (state.sort === 'top')  return posts.sort((a, b) => b.score - a.score);
    return posts;
  }

  // ── Components ─────────────────────────────────────────────────────────────
  function renderHeader() {
    const el = document.getElementById('site-header');
    el.innerHTML = `
      <div class="header-inner">
        <a class="logo" onclick="App.navigate('home')">
          <span class="logo-icon">🌿</span>
          <span class="logo-text">GrassRoots</span>
          <span class="logo-badge">18+</span>
        </a>
        <div class="header-search">
          <div class="search-wrap">
            <input type="text" placeholder="Search GrassRoots…" onkeydown="if(event.key==='Enter')App.toast('Search coming soon!')" />
          </div>
        </div>
        <div class="header-nav">
          ${state.user ? `
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('create')">+ Create Post</button>
            <div class="user-pill" onclick="App.navigate('profile')">
              <div class="user-avatar">${state.user.username[0].toUpperCase()}</div>
              u/${state.user.username}
            </div>
            <button class="btn btn-ghost btn-sm" onclick="App.logout()">Log Out</button>
          ` : `
            <button class="btn btn-ghost btn-sm" onclick="App.showModal('login')">Log In</button>
            <button class="btn btn-primary btn-sm" onclick="App.showModal('login')">Sign Up</button>
          `}
        </div>
      </div>`;
  }

  function renderSortBar(communityId) {
    return `
      <div class="sort-bar">
        ${['hot','new','top','rising'].map(s => `
          <button class="sort-btn ${state.sort === s ? 'active' : ''}"
            onclick="App.setSort('${s}','${communityId||''}')">
            ${{ hot:'🔥', new:'✨', top:'📈', rising:'🚀' }[s]} ${s.charAt(0).toUpperCase()+s.slice(1)}
          </button>`).join('')}
      </div>`;
  }

  function renderPostCard(post) {
    const v = state.votes[post.id];
    const score = getScore(post);
    const comm = COMMUNITIES.find(c => c.id === post.community);
    return `
      <div class="post-card" onclick="App.navigate('post',{id:${post.id}})">
        <div class="post-vote-col" onclick="event.stopPropagation()">
          <button class="vote-btn ${v==='up'?'upvoted':''}" onclick="App.vote(${post.id},'up')">▲</button>
          <span class="vote-count ${v==='up'?'upvoted':v==='down'?'downvoted':''}">${fmtNum(score)}</span>
          <button class="vote-btn ${v==='down'?'downvoted':''}" onclick="App.vote(${post.id},'down')">▼</button>
        </div>
        <div class="post-body">
          <div class="post-meta">
            <a class="post-community" onclick="event.stopPropagation();App.navigate('community',{id:'${post.community}'})">${comm ? comm.icon : '🌿'} g/${post.community}</a>
            <span>•</span>
            <span>Posted by <a class="post-author" onclick="event.stopPropagation()">u/${post.author}</a></span>
            <span>${post.age}</span>
            ${post.flair ? `<span style="background:var(--green-dark);color:var(--green-primary);padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700">${post.flair}</span>` : ''}
          </div>
          <div class="post-title">${post.title}${post.awards ? `<span class="post-awards">${post.awards.join('')}</span>` : ''}</div>
          ${post.body ? `<div class="post-preview">${post.body.replace(/\*\*([^*]+)\*\*/g,'$1')}</div>` : ''}
          <div class="post-actions">
            <button class="post-action-btn">💬 ${fmtNum(post.comments)} Comments</button>
            <button class="post-action-btn" onclick="event.stopPropagation();App.toast('Link copied!')">🔗 Share</button>
            <button class="post-action-btn" onclick="event.stopPropagation();App.toast('Post saved!')">🔖 Save</button>
          </div>
        </div>
      </div>`;
  }

  function renderSidebar(communityId) {
    const comm = communityId ? COMMUNITIES.find(c => c.id === communityId) : null;
    const joined = state.joined.has(communityId);

    const introCard = comm ? `
      <div class="sidebar-card sidebar-intro">
        <div class="sidebar-card-body">
          <div class="sidebar-intro-logo">${comm.icon}</div>
          <div class="sidebar-intro-title">g/${comm.id}</div>
          <div class="sidebar-intro-sub">${comm.description}</div>
          <div class="sidebar-stats">
            <div class="stat-item"><div class="stat-value">${fmtNum(comm.members)}</div><div class="stat-label">Members</div></div>
            <div class="stat-item"><div class="stat-value">${Math.floor(comm.members * 0.012)}</div><div class="stat-label">Online</div></div>
          </div>
          <div class="sidebar-cta">
            <button class="btn ${joined ? 'btn-ghost' : 'btn-primary'}"
              onclick="App.toggleJoin('${comm.id}')">
              ${joined ? '✓ Joined' : '+ Join Community'}
            </button>
            <button class="btn btn-ghost" onclick="App.navigate('create')">Create Post</button>
          </div>
        </div>
      </div>
    ` : `
      <div class="sidebar-card sidebar-intro">
        <div class="sidebar-card-body">
          <div class="sidebar-intro-logo">🌿</div>
          <div class="sidebar-intro-title">GrassRoots</div>
          <div class="sidebar-intro-sub">The uncensored cannabis community. 18+ only. Grow, share, connect.</div>
          <div class="sidebar-stats">
            <div class="stat-item"><div class="stat-value">2.4M</div><div class="stat-label">Members</div></div>
            <div class="stat-item"><div class="stat-value">18.2k</div><div class="stat-label">Online</div></div>
          </div>
          <div class="sidebar-cta">
            <button class="btn btn-primary" onclick="${state.user ? "App.navigate('create')" : "App.showModal('login')"}">
              ${state.user ? '+ Create Post' : '🌿 Join GrassRoots'}
            </button>
          </div>
        </div>
      </div>`;

    const topComms = `
      <div class="sidebar-card">
        <div class="sidebar-card-header">🔥 Top Communities</div>
        <div class="sidebar-card-body" style="padding:8px 14px">
          <ul class="community-list">
            ${COMMUNITIES.slice(0,5).map((c,i) => `
              <li class="community-list-item" onclick="App.navigate('community',{id:'${c.id}'})">
                <span style="font-size:11px;font-weight:700;color:var(--text-dim);width:18px">${i+1}</span>
                <div class="community-list-icon">${c.icon}</div>
                <div class="community-list-info">
                  <div class="community-list-name">g/${c.id}</div>
                  <div class="community-list-members">${fmtNum(c.members)} members</div>
                </div>
                <button class="community-list-join ${state.joined.has(c.id)?'joined':''}"
                  onclick="event.stopPropagation();App.toggleJoin('${c.id}')">
                  ${state.joined.has(c.id) ? '✓' : '+'}
                </button>
              </li>`).join('')}
          </ul>
        </div>
      </div>`;

    const rules = `
      <div class="sidebar-card">
        <div class="sidebar-card-header">📋 Community Rules</div>
        <div class="sidebar-card-body">
          <ol class="rules-list">
            <li>Be respectful — no hate speech or harassment</li>
            <li>Stay on topic — cannabis content only</li>
            <li>No sourcing or dealing</li>
            <li>18+ only — no exceptions</li>
            <li>No misinformation — back your claims</li>
            <li>Mark NSFW content appropriately</li>
          </ol>
          <div class="freedom-badge" style="margin-top:12px">
            <span class="freedom-badge-icon">🔒</span>
            <span>This community supports harm reduction, education, and cannabis freedom.</span>
          </div>
        </div>
      </div>`;

    return introCard + topComms + rules;
  }

  function renderComments(postId) {
    const comments = COMMENTS[postId] || [];

    function commentHTML(c, depth = 0) {
      return `
        <li class="comment" style="${depth > 0 ? 'padding-left:0' : ''}">
          <div class="comment-left">
            <div class="comment-avatar">${c.author[0].toUpperCase()}</div>
            ${c.replies && c.replies.length ? '<div class="comment-line"></div>' : ''}
          </div>
          <div class="comment-right">
            <div class="comment-meta">
              <a class="comment-author">u/${c.author}</a>
              <span class="comment-age">${c.age}</span>
              <span class="comment-karma ${c.score > 0 ? 'pos' : 'neg'}">${fmtNum(c.score)} points</span>
            </div>
            <div class="comment-content">${c.body}</div>
            <div class="comment-actions">
              <button class="comment-vote-btn" onclick="App.vote('c${c.id}','up')">▲</button>
              <span class="comment-vote-count">${fmtNum(c.score)}</span>
              <button class="comment-vote-btn" onclick="App.vote('c${c.id}','down')">▼</button>
              <button class="comment-reply-btn" onclick="App.toast('${state.user ? 'Replying…' : 'Log in to reply'}')">Reply</button>
              <button class="comment-reply-btn" onclick="App.toast('Link copied!')">Share</button>
            </div>
            ${c.replies && c.replies.length ? `<ul class="comment-thread replies">${c.replies.map(r => commentHTML(r, depth+1)).join('')}</ul>` : ''}
          </div>
        </li>`;
    }

    return `
      <div class="comments-section">
        <div class="comments-header">💬 ${comments.length} Comments</div>
        ${state.user ? `
          <div class="comment-form">
            <textarea placeholder="What are your thoughts?"></textarea>
            <div class="comment-form-actions">
              <button class="btn btn-ghost btn-sm">Cancel</button>
              <button class="btn btn-primary btn-sm" onclick="App.toast('Comment posted!')">Comment</button>
            </div>
          </div>` : `
          <div style="padding:16px;background:var(--bg-elevated);border-radius:var(--radius);margin-bottom:20px;text-align:center">
            <a onclick="App.showModal('login')" style="color:var(--green-primary);font-weight:600;cursor:pointer">Log in</a>
            <span style="color:var(--text-dim)"> or </span>
            <a onclick="App.showModal('login')" style="color:var(--green-primary);font-weight:600;cursor:pointer">sign up</a>
            <span style="color:var(--text-dim)"> to leave a comment.</span>
          </div>`}
        <ul class="comment-thread">
          ${comments.length ? comments.map(c => commentHTML(c)).join('') : '<li style="color:var(--text-dim);padding:20px 0;text-align:center">No comments yet. Be the first!</li>'}
        </ul>
      </div>`;
  }

  // ── Pages ──────────────────────────────────────────────────────────────────
  function pageHome() {
    const posts = getSortedPosts();
    return {
      main: `
        <div class="home-hero">
          <h1>🌿 GrassRoots</h1>
          <p>The uncensored cannabis community — grow, share, and connect with ${fmtNum(2400000)}+ members.</p>
        </div>
        ${renderSortBar('')}
        ${posts.map(renderPostCard).join('')}`,
      rail: renderSidebar()
    };
  }

  function pageCommunity(id) {
    const comm = COMMUNITIES.find(c => c.id === id);
    if (!comm) return pageNotFound();

    const posts = getSortedPosts(id);
    const joined = state.joined.has(id);

    return {
      main: `
        <div class="community-banner">
          <div class="community-banner-top" style="background:linear-gradient(135deg, ${comm.color}88, ${comm.color}33)">
            <span style="font-size:32px">${comm.icon}</span>
          </div>
          <div class="community-header-info">
            <div class="community-icon-large" style="background:${comm.color}44">${comm.icon}</div>
            <div style="flex:1">
              <div class="community-title">g/${comm.id}</div>
              <div class="community-name">${comm.description}</div>
            </div>
            <button class="btn ${joined ? 'btn-ghost' : 'btn-primary'} btn-sm"
              onclick="App.toggleJoin('${comm.id}')">
              ${joined ? '✓ Joined' : '+ Join'}
            </button>
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('create')">Create Post</button>
          </div>
        </div>
        ${renderSortBar(id)}
        ${posts.length ? posts.map(renderPostCard).join('') : `
          <div class="empty-state">
            <div class="empty-state-icon">${comm.icon}</div>
            <h3>No posts yet</h3>
            <p>Be the first to post in g/${comm.id}</p>
          </div>`}`,
      rail: renderSidebar(id)
    };
  }

  function pagePost(id) {
    const post = POSTS.find(p => p.id === Number(id));
    if (!post) return pageNotFound();

    const v = state.votes[post.id];
    const score = getScore(post);
    const comm = COMMUNITIES.find(c => c.id === post.community);

    const bodyHTML = (post.body || '')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    return {
      main: `
        <a class="back-link" onclick="App.navigate('community',{id:'${post.community}'})">← Back to g/${post.community}</a>
        <div class="post-full">
          <div class="post-full-inner">
            <div class="post-full-vote">
              <button class="vote-btn ${v==='up'?'upvoted':''}" onclick="App.vote(${post.id},'up')">▲</button>
              <span class="vote-count ${v==='up'?'upvoted':v==='down'?'downvoted':''}">${fmtNum(score)}</span>
              <button class="vote-btn ${v==='down'?'downvoted':''}" onclick="App.vote(${post.id},'down')">▼</button>
            </div>
            <div class="post-full-content">
              <div class="post-meta" style="margin-bottom:10px">
                <a class="post-community" onclick="App.navigate('community',{id:'${post.community}'})">${comm ? comm.icon : '🌿'} g/${post.community}</a>
                <span>•</span>
                <span style="color:var(--text-dim)">Posted by u/${post.author} • ${post.age}</span>
                ${post.flair ? `<span style="background:var(--green-dark);color:var(--green-primary);padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700">${post.flair}</span>` : ''}
              </div>
              <div class="post-full-title">${post.title} ${post.awards ? post.awards.join('') : ''}</div>
              <div class="post-full-text">${bodyHTML}</div>
            </div>
          </div>
          <div class="post-full-actions">
            <button class="post-action-btn">💬 ${fmtNum(post.comments)} Comments</button>
            <button class="post-action-btn" onclick="App.toast('Link copied!')">🔗 Share</button>
            <button class="post-action-btn" onclick="App.toast('Post saved!')">🔖 Save</button>
            <button class="post-action-btn" onclick="App.toast('Reported')">🚩 Report</button>
          </div>
        </div>
        ${renderComments(post.id)}`,
      rail: renderSidebar(post.community)
    };
  }

  function pageCreate() {
    if (!state.user) {
      setTimeout(() => showModal('login'), 50);
      return pageHome();
    }
    return {
      main: `
        <div class="create-post-wrap">
          <div class="create-post-title">Create a Post</div>
          <div class="post-type-tabs">
            <button class="post-type-tab active" onclick="App.setActiveTab(this)">📝 Text</button>
            <button class="post-type-tab" onclick="App.setActiveTab(this)">🖼 Image</button>
            <button class="post-type-tab" onclick="App.setActiveTab(this)">🔗 Link</button>
            <button class="post-type-tab" onclick="App.setActiveTab(this)">📊 Poll</button>
          </div>
          <div class="form-group">
            <label class="form-label">Community</label>
            <select>
              <option value="">Choose a community…</option>
              ${COMMUNITIES.map(c => `<option value="${c.id}">${c.icon} g/${c.id}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" id="post-title-input" placeholder="Give your post an interesting title" maxlength="300"
              oninput="document.getElementById('title-count').textContent=this.value.length+'/300'" />
            <div class="char-count"><span id="title-count">0</span>/300</div>
          </div>
          <div class="form-group">
            <label class="form-label">Body <span style="opacity:.5;font-weight:400">(optional)</span></label>
            <textarea placeholder="Share your thoughts, grow tips, reviews…" id="post-body-input"></textarea>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
            <button class="btn btn-ghost" onclick="App.navigate('home')">Cancel</button>
            <button class="btn btn-primary" onclick="App.submitPost()">Post</button>
          </div>
        </div>`,
      rail: renderSidebar()
    };
  }

  function pageProfile() {
    if (!state.user) { navigate('home'); return pageHome(); }
    const userPosts = POSTS.slice(0, 3);
    return {
      main: `
        <div class="profile-header">
          <div class="profile-avatar">${state.user.username[0].toUpperCase()}</div>
          <div>
            <div class="profile-info-name">u/${state.user.username}</div>
            <div class="profile-info-karma">Karma: <span>${fmtNum(state.user.karma)}</span></div>
            <div class="profile-info-joined">Member since ${state.user.joined}</div>
          </div>
        </div>
        <div class="sort-bar" style="margin-bottom:12px">
          <span style="color:var(--text-dim);font-size:13px;font-weight:600;padding:6px 10px">Posts</span>
          <span style="color:var(--text-dim);font-size:13px;font-weight:600;padding:6px 10px;opacity:.5">Comments</span>
        </div>
        ${userPosts.map(renderPostCard).join('')}`,
      rail: `
        <div class="sidebar-card">
          <div class="sidebar-card-header">👤 About</div>
          <div class="sidebar-card-body">
            <div class="sidebar-stats">
              <div class="stat-item"><div class="stat-value">${fmtNum(state.user.karma)}</div><div class="stat-label">Karma</div></div>
              <div class="stat-item"><div class="stat-value">${state.joined.size}</div><div class="stat-label">Communities</div></div>
            </div>
            <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
              <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="App.navigate('create')">+ Create Post</button>
              <button class="btn btn-danger btn-sm" style="width:100%;justify-content:center" onclick="App.logout()">Log Out</button>
            </div>
          </div>
        </div>`
    };
  }

  function pageNotFound() {
    return {
      main: `
        <div class="empty-state">
          <div class="empty-state-icon">🌵</div>
          <h3>Page not found</h3>
          <p>This page doesn't exist or was removed.</p>
          <button class="btn btn-primary" style="margin-top:16px" onclick="App.navigate('home')">Go Home</button>
        </div>`,
      rail: renderSidebar()
    };
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  function setSort(s, communityId) {
    state.sort = s;
    if (communityId) navigate('community', { id: communityId });
    else render();
  }

  function toggleJoin(id) {
    if (!state.user) { showModal('login'); return; }
    if (state.joined.has(id)) {
      state.joined.delete(id);
      toast(`Left g/${id}`);
    } else {
      state.joined.add(id);
      toast(`Joined g/${id}!`);
    }
    render();
  }

  function setActiveTab(btn) {
    btn.closest('.post-type-tabs').querySelectorAll('.post-type-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  function submitPost() {
    const title = (document.getElementById('post-title-input') || {}).value || '';
    if (title.trim().length < 5) { toast('Title must be at least 5 characters'); return; }
    toast('Post submitted!');
    navigate('home');
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    renderHeader();

    const { page, params } = state.route;
    let view;

    switch (page) {
      case 'home':      view = pageHome();                   break;
      case 'community': view = pageCommunity(params.id);     break;
      case 'post':      view = pagePost(params.id);          break;
      case 'create':    view = pageCreate();                 break;
      case 'profile':   view = pageProfile();                break;
      default:          view = pageNotFound();
    }

    document.getElementById('content').innerHTML = view.main;
    document.getElementById('right-rail').innerHTML = view.rail;
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    document.getElementById('modal-backdrop').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
    render();
  }

  return { navigate, vote, showModal, closeModal, submitLogin, logout, setSort, toggleJoin, setActiveTab, submitPost, toast, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
