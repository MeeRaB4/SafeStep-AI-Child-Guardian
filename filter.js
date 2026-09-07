// ---------------------------------------------------------------------------
// SafeStep content filter: age-based keyword / category / site rules used by
// the Kid portal to classify every search, link, video and app in real time.
// ---------------------------------------------------------------------------

export const BLOCKABLE_CATEGORIES = ['adult', 'violence', 'gambling', 'scam', 'social'];

const RULES = [
  {
    category: 'adult',
    severity: 'high',
    keywords: ['porn', 'xxx', 'nude', 'naked', 'sex', 'onlyfans', 'playboy', 'hentai', 'erotica', 'nsfw'],
    reason: 'Explicit adult content is never appropriate for a child profile.',
  },
  {
    category: 'violence',
    severity: 'high',
    keywords: ['gore', 'real fight', 'school shooting', 'behead', 'torture', 'graphic violence', 'kill', 'blood video'],
    reason: 'Graphic or violent material classified as age-inappropriate by SafeStep AI.',
  },
  {
    category: 'gambling',
    severity: 'medium',
    keywords: ['casino', 'betting', 'bet ', 'poker', 'slots', 'jackpot', 'free spins', 'lottery'],
    reason: 'Gambling content. Always blocked for child profiles.',
  },
  {
    category: 'scam',
    severity: 'high',
    keywords: ['free robux', 'free gems', 'free vbucks', 'generator', 'hack wifi', 'hack ', 'phishing', 'giveaway password', 'no survey', 'steal'],
    reason: 'Known scam / phishing pattern that steals accounts or personal details.',
  },
  {
    category: 'drugs',
    severity: 'high',
    keywords: ['buy weed', 'cocaine', 'fentanyl', 'vape', 'buy drugs', 'ecstasy', 'lsd'],
    reason: 'Drug-related content flagged by SafeStep AI.',
  },
  {
    category: 'violence',
    severity: 'high',
    keywords: ['buy a gun', 'make a bomb', 'explosive', '3d printed gun'],
    reason: 'Weapons-related content flagged by SafeStep AI.',
  },
];

const SOCIAL_DOMAINS = [
  'tiktok.com', 'instagram.com', 'facebook.com', 'x.com', 'twitter.com',
  'reddit.com', 'discord.com', 'snapchat.com', 'twitch.tv',
];

const MONITORED_KEYWORDS = ['fortnite', 'roblox', 'minecraft pvp', 'prank', 'unboxing', 'chat with'];

const EDUCATION_KEYWORDS = ['learn', 'school', 'math', 'science', 'homework', 'khan', 'duolingo', 'read', 'volcano', 'history', 'lesson', 'quiz'];
const GAMES_KEYWORDS = ['game', 'minecraft', 'roblox', 'puzzle', 'level'];

export const SAFE_APPS = [
  { id: 'funzone', name: 'Fun Zone', icon: '🎪' },
  { id: 'ytkids', name: 'YouTube Kids', icon: '📺' },
  { id: 'games', name: 'Games', icon: '🎮' },
  { id: 'learn', name: 'Learning', icon: '📚' },
  { id: 'music', name: 'Music', icon: '🎵' },
];

export const SAFE_VIDEOS = [
  { id: 'XqZsoesa55w', title: 'Baby Shark Dance' },
  { id: 'aqz-KE-bpKQ', title: 'Big Buck Bunny (Blender)' },
  { id: 'WhWc3b3KhnY', title: 'Spring (Blender short)' },
  { id: 'pRpeEdMmmQ0', title: 'Shakira – Waka Waka' },
  { id: 'SkVqJ1SGeL0', title: 'Caminandes 3 (Blender)' },
  { id: 'eRsGyueVLvQ', title: 'Nature documentary for kids' },
];

export const domainOf = (url) => {
  try {
    const withProto = /^https?:\/\//.test(url) ? url : `https://${url}`;
    return new URL(withProto).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// ---------------------------------------------------------------------------
// AI block reasoning — the same verdict is explained two ways: a calm,
// contextual explanation for the parent and a friendly, age-appropriate one
// for the child.
// ---------------------------------------------------------------------------

const CHILD_REASONS = {
  adult: 'That page is for grown-ups only — it is not made for kids your age.',
  violence: 'That shows scary things that are not good for kids. Let’s find something fun instead!',
  gambling: 'That is a betting page — it tricks people out of their money. Not for kids!',
  scam: 'That page pretends to give away free stuff, but it really wants to steal accounts. Sneaky tricksters!',
  drugs: 'That talks about things that are dangerous and against the rules for kids.',
  social: 'Grown-ups need to check social apps first — there are strangers there.',
};

export const childReasonFor = (category) =>
  CHILD_REASONS[category] ||
  'This is not safe for kids right now. Your grown-up is checking it for you.';

export function parentReasonFor({ category = 'general', age = 9, reason = '' } = {}) {
  const base = reason || 'Flagged by SafeStep AI.';
  const context = {
    adult: ` Explicit material is never appropriate at age ${age} — best blocked and briefly discussed together.`,
    violence: ` Graphic violence is age-inappropriate at ${age} and blocked by default for all child profiles.`,
    gambling: ` Gambling sites hook young players with bright “free” offers — a habit best avoided entirely at ${age}.`,
    scam: ` “Free” generators like this are classic phishing: they harvest game and email passwords. A friendly chat about scams is a good idea at ${age}.`,
    drugs: ` Drug-related content is blocked for every child profile regardless of age.`,
    social: ` Social platforms have open chat with strangers — under-13 accounts need a parent’s judgment.`,
  }[category];
  return base + (context || ` Flagged as ${category} content — review recommended for age ${age}.`);
}

/**
 * Classify a child action.
 * @returns {{flagged:boolean, status:string, category:string, severity?:string, reason?:string, whitelisted?:boolean}}
 */
export function checkContent({ type, text = '', url = '', age = 9, blockedCategories = [], autoBlock = true, whitelist = [] }) {
  const t = ` ${text.toLowerCase()} `;
  const domain = domainOf(url || text);

  // 0) Parent whitelist — always allowed, no questions asked
  const bare = domain.toLowerCase();
  if (whitelist.some((w) => bare === w || bare.endsWith(`.${w}`))) {
    return { flagged: false, status: 'safe', category: 'general', whitelisted: true };
  }

  // 1) Hard category rules (respect the parent's blocked-category toggles)
  for (const rule of RULES) {
    const enabled =
      blockedCategories.includes(rule.category) ||
      ['adult', 'violence', 'drugs'].includes(rule.category); // always on for kids
    if (!enabled) continue;
    if (rule.keywords.some((k) => t.includes(` ${k}`) || t.includes(k))) {
      return {
        flagged: true,
        status: autoBlock ? 'awaiting' : 'monitored',
        category: rule.category,
        severity: rule.severity,
        reason: rule.reason,
      };
    }
  }

  // 2) Social media: blocked if toggled, approval-needed under 13, else monitored
  if (SOCIAL_DOMAINS.some((d) => domain.endsWith(d))) {
    if (blockedCategories.includes('social')) {
      return {
        flagged: true,
        status: autoBlock ? 'awaiting' : 'monitored',
        category: 'social',
        severity: 'medium',
        reason: 'Social media is fully blocked by your parent’s settings.',
      };
    }
    if (age < 13) {
      return {
        flagged: true,
        status: autoBlock ? 'awaiting' : 'monitored',
        category: 'social',
        severity: 'medium',
        reason: `Social media for ages under 13 needs a parent's approval.`,
      };
    }
    return { flagged: false, status: 'monitored', category: 'social' };
  }

  // 3) Soft monitoring keywords
  if (MONITORED_KEYWORDS.some((k) => t.includes(k))) {
    return { flagged: false, status: 'monitored', category: type === 'app' ? 'games' : 'entertainment' };
  }

  // 4) Safe – guess a friendly category for reports
  let category = 'entertainment';
  if (EDUCATION_KEYWORDS.some((k) => t.includes(k))) category = 'education';
  else if (GAMES_KEYWORDS.some((k) => t.includes(k))) category = 'games';
  else if (type === 'video') category = 'video';
  return { flagged: false, status: 'safe', category };
}
