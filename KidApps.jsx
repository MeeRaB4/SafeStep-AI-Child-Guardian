// ---------------------------------------------------------------------------
// SafeStep Kids — real working mini-apps for the Games / Music / Learning
// tiles. Everything runs locally on the child device; each milestone is
// reported to the parent via the onEvent callback.
// ---------------------------------------------------------------------------
import React, { useEffect, useRef, useState } from 'react';
import { SAFE_VIDEOS } from '../lib/filter';

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
            active === t.key
              ? 'bg-violet-400 text-white shadow-md shadow-violet-200'
              : 'bg-violet-50 text-slate-500 hover:bg-violet-100'
          }`}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

// ===========================================================================
// GAMES
// ===========================================================================

const MEMORY_EMOJI = ['🐶', '🐱', '🦊', '🐸', '🐼', '🦄'];

function MemoryMatch({ onEvent }) {
  const [cards, setCards] = useState(() => shuffle([...MEMORY_EMOJI, ...MEMORY_EMOJI]));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);

  const won = matched.length === cards.length;

  const flip = (i) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.includes(i) || won) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a] === cards[b]) {
        setTimeout(() => {
          setMatched((m) => {
            const nm = [...m, a, b];
            if (nm.length === cards.length) onEvent(`finished Memory Match in ${moves + 1} moves 🏆`);
            return nm;
          });
          setFlipped([]);
        }, 350);
      } else {
        setTimeout(() => setFlipped([]), 700);
      }
    }
  };

  const reset = () => {
    setCards(shuffle([...MEMORY_EMOJI, ...MEMORY_EMOJI]));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  return (
    <div className="text-center">
      <p className="mb-3 text-xs font-bold text-slate-500">
        Find all the animal pairs! Moves: {moves}
      </p>
      {won && (
        <p className="mb-3 rounded-2xl bg-emerald-50 p-3 text-sm font-extrabold text-emerald-600">
          🎉 You found them all in {moves} moves! Amazing memory!
        </p>
      )}
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c, i) => {
          const shown = flipped.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              className={`flex aspect-square items-center justify-center rounded-2xl text-3xl transition ${
                matched.includes(i)
                  ? 'bg-emerald-50 ring-2 ring-emerald-200'
                  : shown
                    ? 'bg-white ring-2 ring-violet-300'
                    : 'bg-gradient-to-br from-violet-300 to-pink-300 hover:scale-105'
              }`}
            >
              {shown ? c : '❓'}
            </button>
          );
        })}
      </div>
      <button onClick={reset} className="mt-4 rounded-2xl bg-violet-100 px-5 py-2 text-xs font-bold text-violet-600 hover:bg-violet-200">
        🔀 New game
      </button>
    </div>
  );
}

const WINS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const winnerOf = (b) => WINS.find(([x, y, z]) => b[x] && b[x] === b[y] && b[x] === b[z]);

function TicTacToe({ onEvent }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState('X');
  const win = winnerOf(board);
  const full = board.every(Boolean);

  useEffect(() => {
    if (turn !== 'O' || win || full) return;
    const t = setTimeout(() => {
      setBoard((b) => {
        const empty = b.map((v, i) => (v ? null : i)).filter((i) => i !== null);
        // prefer winning, then blocking, then center, then random
        const tryFind = (mark) =>
          WINS.map(([x, y, z]) => [b[x], b[y], b[z], [x, y, z]])
            .find(([a, bb, c]) => [a, bb, c].filter((v) => v === mark).length === 2 && [a, bb, c].includes(null))?.[3]
            .find((i) => b[i] === null);
        const move = tryFind('O') ?? tryFind('X') ?? (b[4] === null ? 4 : null) ?? empty[Math.floor(Math.random() * empty.length)];
        const nb = [...b];
        nb[move] = 'O';
        return nb;
      });
      setTurn('X');
    }, 500);
    return () => clearTimeout(t);
  }, [turn, win, full]);

  useEffect(() => {
    if (!win && !full) return;
    const winner = win ? board[win[0]] : null;
    if (winner === 'X') onEvent('won Tic-tac-toe! 🏆');
    else if (winner === 'O') onEvent('lost Tic-tac-toe to the computer');
    else onEvent('finished Tic-tac-toe in a draw');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win, full]);

  const play = (i) => {
    if (board[i] || turn !== 'X' || win || full) return;
    const nb = [...board];
    nb[i] = 'X';
    setBoard(nb);
    setTurn('O');
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
  };

  return (
    <div className="text-center">
      <p className="mb-3 text-xs font-bold text-slate-500">
        You are ⭕… no wait — you are ❌! Beat the computer!
      </p>
      {(win || full) && (
        <p className="mb-3 rounded-2xl bg-emerald-50 p-3 text-sm font-extrabold text-emerald-600">
          {win ? (board[win[0]] === 'X' ? '🎉 You win! Champion!' : '🤖 The computer won this time — rematch?') : "🤝 It's a draw!"}
        </p>
      )}
      <div className="mx-auto grid max-w-64 grid-cols-3 gap-2">
        {board.map((v, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            className="flex aspect-square items-center justify-center rounded-2xl bg-violet-50 text-3xl font-extrabold text-violet-500 transition hover:bg-violet-100"
          >
            {v === 'X' ? '❌' : v === 'O' ? '⭕' : ''}
          </button>
        ))}
      </div>
      <button onClick={reset} className="mt-4 rounded-2xl bg-violet-100 px-5 py-2 text-xs font-bold text-violet-600 hover:bg-violet-200">
        🔁 Play again
      </button>
    </div>
  );
}

const makeQuestion = () => {
  const add = Math.random() > 0.4;
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * (add ? 10 : a)) + 1;
  const answer = add ? a + b : a - b;
  const text = add ? `${a} + ${b}` : `${a} − ${b}`;
  const opts = shuffle([answer, answer + 1 + Math.floor(Math.random() * 2), Math.max(0, answer - 1 - Math.floor(Math.random() * 2))]);
  return { text, answer, opts: [...new Set(opts)].slice(0, 3) };
};

function MathQuiz({ onEvent }) {
  const [round, setRound] = useState(() => makeQuestion());
  const [q, setQ] = useState(1);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(false);

  const answer = (v) => {
    if (feedback !== null) return;
    const ok = v === round.answer;
    setFeedback(ok);
    const ns = score + (ok ? 1 : 0);
    setScore(ns);
    setTimeout(() => {
      if (q === 5) {
        setDone(true);
        onEvent(`scored ${ns}/5 on the Math Quiz ➗`);
      } else {
        setQ(q + 1);
        setScore(ns);
        setRound(makeQuestion());
        setFeedback(null);
      }
    }, 800);
  };

  if (done) {
    return (
      <div className="text-center">
        <p className="text-5xl">{score >= 4 ? '🌟' : score >= 2 ? '👏' : '💪'}</p>
        <p className="mt-2 text-lg font-extrabold text-slate-800">You scored {score} out of 5!</p>
        <button
          onClick={() => { setDone(false); setQ(1); setScore(0); setRound(makeQuestion()); setFeedback(null); }}
          className="mt-4 rounded-2xl bg-violet-100 px-5 py-2 text-xs font-bold text-violet-600 hover:bg-violet-200"
        >
          🔁 Play again
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="mb-2 text-xs font-bold text-slate-500">Question {q} of 5 · Score {score}</p>
      <p className="rounded-2xl bg-violet-50 p-5 text-3xl font-extrabold text-violet-600">{round.text} = ?</p>
      <div className="mt-4 flex justify-center gap-3">
        {round.opts.map((o) => (
          <button
            key={o}
            onClick={() => answer(o)}
            className={`h-14 w-14 rounded-2xl text-xl font-extrabold transition ${
              feedback !== null && o === round.answer
                ? 'bg-emerald-400 text-white'
                : feedback === false && o !== round.answer
                  ? 'bg-violet-50 text-slate-400'
                  : 'bg-white ring-2 ring-violet-200 hover:bg-violet-100'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      {feedback !== null && (
        <p className={`mt-3 text-sm font-extrabold ${feedback ? 'text-emerald-600' : 'text-rose-500'}`}>
          {feedback ? '✅ Correct!' : `Not quite — it's ${round.answer}.`}
        </p>
      )}
    </div>
  );
}

// ===========================================================================
// FUN ZONE — curated cartoon videos, mini browser games (puzzle/memory),
// coloring and educational activities. The parent enables/disables each
// category from the dashboard; `enabled` carries those toggles.
// ===========================================================================

const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];

const neighborsOf = (i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  const out = [];
  if (r > 0) out.push(i - 3);
  if (r < 2) out.push(i + 3);
  if (c > 0) out.push(i - 1);
  if (c < 2) out.push(i + 1);
  return out;
};

function scrambledBoard() {
  // Random moves from the solved state — always solvable
  let b = [...GOAL];
  let blank = 8;
  for (let i = 0; i < 90; i++) {
    const opts = neighborsOf(blank);
    const pick = opts[Math.floor(Math.random() * opts.length)];
    [b[blank], b[pick]] = [b[pick], b[blank]];
    blank = pick;
  }
  return b;
}

function SlidePuzzle({ onEvent }) {
  const [board, setBoard] = useState(scrambledBoard);
  const [moves, setMoves] = useState(0);
  const won = board.every((v, i) => v === GOAL[i]);

  useEffect(() => {
    if (won && moves > 0) onEvent(`solved the Slide Puzzle in ${moves} moves 🧩`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const move = (i) => {
    if (won || !neighborsOf(board.indexOf(0)).includes(i)) return;
    setBoard((b) => {
      const nb = [...b];
      const z = nb.indexOf(0);
      [nb[z], nb[i]] = [nb[i], nb[z]];
      return nb;
    });
    setMoves((m) => m + 1);
  };

  const reset = () => {
    setBoard(scrambledBoard());
    setMoves(0);
  };

  return (
    <div className="text-center">
      <p className="mb-3 text-xs font-bold text-slate-500">
        Slide the tiles into order 1–8! Moves: {moves}
      </p>
      {won && (
        <p className="mb-3 rounded-2xl bg-emerald-50 p-3 text-sm font-extrabold text-emerald-600">
          🎉 You solved it in {moves} moves! Puzzle master!
        </p>
      )}
      <div className="mx-auto grid max-w-64 grid-cols-3 gap-2">
        {board.map((v, i) => (
          <button
            key={i}
            onClick={() => move(i)}
            className={`flex aspect-square items-center justify-center rounded-2xl text-2xl font-extrabold transition ${
              v === 0
                ? 'bg-violet-50/50'
                : 'bg-gradient-to-br from-violet-300 to-pink-300 text-white hover:scale-105'
            }`}
          >
            {v === 0 ? '' : v}
          </button>
        ))}
      </div>
      <button onClick={reset} className="mt-4 rounded-2xl bg-violet-100 px-5 py-2 text-xs font-bold text-violet-600 hover:bg-violet-200">
        🔀 Shuffle again
      </button>
    </div>
  );
}

const PALETTE = ['#f87171', '#fb923c', '#fbbf24', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6', '#94a3b8'];
const PICTURE = [
  'sky', 'sun', 'cloud', 'hill', 'treeTop', 'trunk', 'house', 'roof', 'door', 'window',
];

function ColoringBook({ onEvent }) {
  const [color, setColor] = useState(PALETTE[4]);
  const [fills, setFills] = useState({});
  const doneRef = useRef(false);

  const paint = (id) =>
    setFills((f) => {
      const next = { ...f, [id]: color };
      if (!doneRef.current && PICTURE.every((p) => next[p])) {
        doneRef.current = true;
        onEvent('finished coloring a whole picture 🎨');
      }
      return next;
    });

  const reset = () => {
    setFills({});
    doneRef.current = false;
  };

  const stroke = { stroke: '#cbd5e1', strokeWidth: 1.5 };
  const filledCount = Object.keys(fills).length;

  return (
    <div className="text-center">
      <p className="mb-3 text-xs font-bold text-slate-500">
        Pick a color, then tap a part of the picture! ({filledCount}/{PICTURE.length} painted)
      </p>
      <div className="mb-3 flex justify-center gap-1.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            className={`h-8 w-8 rounded-full shadow-inner transition ${
              color === c ? 'scale-110 ring-4 ring-violet-300' : 'hover:scale-105'
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
      <svg viewBox="0 0 400 240" className="mx-auto w-full max-w-md rounded-2xl bg-white ring-1 ring-violet-100">
        <rect x="0" y="0" width="400" height="240" fill={fills.sky || '#f8fafc'} onClick={() => paint('sky')} className="cursor-pointer" />
        <ellipse cx="95" cy="52" rx="40" ry="17" fill={fills.cloud || '#f8fafc'} onClick={() => paint('cloud')} className="cursor-pointer" {...stroke} />
        <ellipse cx="130" cy="62" rx="28" ry="13" fill={fills.cloud || '#f8fafc'} onClick={() => paint('cloud')} className="cursor-pointer" {...stroke} />
        <circle cx="335" cy="55" r="30" fill={fills.sun || '#f8fafc'} onClick={() => paint('sun')} className="cursor-pointer" {...stroke} />
        <ellipse cx="60" cy="265" rx="240" ry="95" fill={fills.hill || '#f8fafc'} onClick={() => paint('hill')} className="cursor-pointer" {...stroke} />
        <ellipse cx="330" cy="275" rx="180" ry="80" fill={fills.hill || '#f8fafc'} onClick={() => paint('hill')} className="cursor-pointer" {...stroke} />
        <rect x="112" y="186" width="16" height="34" fill={fills.trunk || '#f8fafc'} onClick={() => paint('trunk')} className="cursor-pointer" {...stroke} />
        <circle cx="120" cy="168" r="30" fill={fills.treeTop || '#f8fafc'} onClick={() => paint('treeTop')} className="cursor-pointer" {...stroke} />
        <rect x="215" y="128" width="100" height="82" fill={fills.house || '#f8fafc'} onClick={() => paint('house')} className="cursor-pointer" {...stroke} />
        <polygon points="205,128 325,128 265,78" fill={fills.roof || '#f8fafc'} onClick={() => paint('roof')} className="cursor-pointer" {...stroke} />
        <rect x="255" y="162" width="24" height="48" fill={fills.door || '#f8fafc'} onClick={() => paint('door')} className="cursor-pointer" {...stroke} />
        <rect x="224" y="146" width="20" height="20" fill={fills.window || '#f8fafc'} onClick={() => paint('window')} className="cursor-pointer" {...stroke} />
      </svg>
      <button onClick={reset} className="mt-4 rounded-2xl bg-violet-100 px-5 py-2 text-xs font-bold text-violet-600 hover:bg-violet-200">
        🧽 Start over
      </button>
    </div>
  );
}

function FunGames({ onEvent }) {
  const [tab, setTab] = useState('memory');
  return (
    <div>
      <TabBar
        tabs={[
          { key: 'memory', icon: '🃏', label: 'Memory' },
          { key: 'slide', icon: '🧩', label: 'Puzzle' },
          { key: 'ttt', icon: '⭕', label: 'Tic-tac-toe' },
          { key: 'quiz', icon: '➗', label: 'Math Quiz' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'memory' && <MemoryMatch onEvent={onEvent} />}
      {tab === 'slide' && <SlidePuzzle onEvent={onEvent} />}
      {tab === 'ttt' && <TicTacToe onEvent={onEvent} />}
      {tab === 'quiz' && <MathQuiz onEvent={onEvent} />}
    </div>
  );
}

function FunLearning({ onEvent }) {
  const [tab, setTab] = useState('quiz');
  return (
    <div>
      <TabBar
        tabs={[
          { key: 'quiz', icon: '🐾', label: 'Animal Quiz' },
          { key: 'facts', icon: '💡', label: 'Fun Facts' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'quiz' && <AnimalQuiz onEvent={onEvent} />}
      {tab === 'facts' && <Flashcards />}
    </div>
  );
}

export function FunZoneHub({ enabled = {}, onEvent, onVideo }) {
  const tabs = [
    { key: 'videos', icon: '🎬', label: 'Cartoons' },
    { key: 'games', icon: '🎮', label: 'Games' },
    { key: 'coloring', icon: '🎨', label: 'Coloring' },
    { key: 'learning', icon: '📚', label: 'Learning' },
  ].filter((t) => enabled[t.key] !== false);

  const [tab, setTab] = useState(tabs[0]?.key || 'videos');
  const active = tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  if (tabs.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        Your grown-up paused the Fun Zone for now. Ask them nicely 💜
      </p>
    );
  }

  return (
    <div>
      <TabBar tabs={tabs} active={active} onChange={setTab} />
      {active === 'videos' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SAFE_VIDEOS.map((v) => (
            <button
              key={v.id}
              onClick={() => onVideo(v)}
              className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3 text-left transition hover:bg-violet-100"
            >
              <span className="text-2xl">🎬</span>
              <p className="mt-1 text-xs font-bold text-slate-700">{v.title}</p>
            </button>
          ))}
        </div>
      )}
      {active === 'games' && <FunGames onEvent={onEvent} />}
      {active === 'coloring' && <ColoringBook onEvent={onEvent} />}
      {active === 'learning' && <FunLearning onEvent={onEvent} />}
    </div>
  );
}

export function GamesHub({ onEvent }) {
  const [tab, setTab] = useState('memory');
  return (
    <div>
      <TabBar
        tabs={[
          { key: 'memory', icon: '🃏', label: 'Memory Match' },
          { key: 'ttt', icon: '⭕', label: 'Tic-tac-toe' },
          { key: 'quiz', icon: '➗', label: 'Math Quiz' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'memory' && <MemoryMatch onEvent={onEvent} />}
      {tab === 'ttt' && <TicTacToe onEvent={onEvent} />}
      {tab === 'quiz' && <MathQuiz onEvent={onEvent} />}
    </div>
  );
}

// ===========================================================================
// MUSIC — real playable piano + sing-along melodies via Web Audio
// ===========================================================================

let audioCtx = null;
const getCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const NOTE_FREQ = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88, C2: 523.25 };

function playNote(freq, start = 0, dur = 0.35) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

const MELODIES = [
  {
    name: 'Twinkle Twinkle Little Star', icon: '⭐',
    notes: ['C', 'C', 'G', 'G', 'A', 'A', 'G', 'F', 'F', 'E', 'E', 'D', 'D', 'C'],
    beats: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
    lyrics: 'Twinkle, twinkle, little star, how I wonder what you are…',
  },
  {
    name: 'Mary Had a Little Lamb', icon: '🐑',
    notes: ['E', 'D', 'C', 'D', 'E', 'E', 'E', 'D', 'D', 'D', 'E', 'G', 'G'],
    beats: [1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2],
    lyrics: 'Mary had a little lamb, little lamb, little lamb…',
  },
  {
    name: 'Ode to Joy', icon: '🎻',
    notes: ['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'C', 'D', 'E', 'E', 'D', 'D'],
    beats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2],
    lyrics: 'Joyful, joyful, we adore thee…',
  },
];

export function MusicHub({ onEvent }) {
  const [tab, setTab] = useState('sing');
  const [playing, setPlaying] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const playMelody = (m) => {
    if (playing) return;
    setPlaying(m.name);
    let t = 0.1;
    m.notes.forEach((n, i) => {
      const dur = m.beats[i] * 0.4;
      playNote(NOTE_FREQ[n], t, Math.max(0.25, dur * 0.9));
      t += dur;
    });
    timerRef.current = setTimeout(() => {
      setPlaying(null);
      onEvent(`finished singing "${m.name}" 🎤`);
    }, t * 1000 + 200);
  };

  const KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C2'];
  const KEY_COLORS = ['bg-rose-200', 'bg-orange-200', 'bg-amber-200', 'bg-emerald-200', 'bg-sky-200', 'bg-indigo-200', 'bg-violet-200', 'bg-pink-200'];

  return (
    <div>
      <TabBar
        tabs={[
          { key: 'sing', icon: '🎤', label: 'Sing-along' },
          { key: 'piano', icon: '🎹', label: 'Piano' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'sing' && (
        <div className="space-y-2">
          {MELODIES.map((m) => (
            <button
              key={m.name}
              onClick={() => playMelody(m)}
              disabled={Boolean(playing)}
              className={`flex w-full items-center gap-3 rounded-2xl border border-violet-100 p-3.5 text-left transition ${
                playing === m.name ? 'bg-violet-100 ring-2 ring-violet-300' : 'bg-violet-50/60 hover:bg-violet-100'
              } disabled:opacity-70`}
            >
              <span className="text-2xl">{m.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">{m.name}</p>
                <p className="text-[11px] italic text-slate-400">{m.lyrics}</p>
              </div>
              <span className="text-lg">{playing === m.name ? '🎶' : '▶️'}</span>
            </button>
          ))}
        </div>
      )}
      {tab === 'piano' && (
        <div className="text-center">
          <p className="mb-3 text-xs font-bold text-slate-500">Tap the keys to play! 🎶</p>
          <div className="flex justify-center gap-1">
            {KEYS.map((k, i) => (
              <button
                key={k}
                onPointerDown={() => playNote(NOTE_FREQ[k], 0, 0.5)}
                className={`h-32 w-10 rounded-b-xl shadow-inner transition active:scale-95 active:brightness-90 sm:w-12 ${KEY_COLORS[i]}`}
              >
                <span className="text-[10px] font-bold text-slate-500">{k === 'C2' ? 'C' : k}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// LEARNING — quizzes, flashcards and watch-and-learn videos
// ===========================================================================

const ANIMAL_QUIZ = [
  { q: 'Who says “Moo”? 🐄', opts: ['Cow', 'Duck', 'Cat'], a: 'Cow', icon: '🐄' },
  { q: 'Who says “Quack”? 🦆', opts: ['Dog', 'Duck', 'Frog'], a: 'Duck', icon: '🦆' },
  { q: 'Who says “Roar”? 🦁', opts: ['Mouse', 'Lion', 'Fish'], a: 'Lion', icon: '🦁' },
  { q: 'Who says “Oink”? 🐷', opts: ['Pig', 'Horse', 'Bee'], a: 'Pig', icon: '🐷' },
  { q: 'Who says “Ribbit”? 🐸', opts: ['Frog', 'Bird', 'Snake'], a: 'Frog', icon: '🐸' },
];

const FACTS = [
  { icon: '🌋', title: 'Volcanoes', text: 'A volcano erupts hot melted rock called lava. Some are under the ocean!' },
  { icon: '🪐', title: 'Space', text: 'Jupiter is the biggest planet — more than 1,300 Earths could fit inside!' },
  { icon: '🐙', title: 'Octopus', text: 'An octopus has 3 hearts and blue blood. It can also change color!' },
  { icon: '🌈', title: 'Rainbows', text: 'Rainbows appear when sunlight bends through raindrops — 7 colors!' },
  { icon: '🦕', title: 'Dinosaurs', text: 'Dinosaurs lived millions of years before humans. Some were as tall as houses!' },
  { icon: '🐝', title: 'Bees', text: 'Bees dance to tell their friends where the flowers are!' },
];

function AnimalQuiz({ onEvent }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const cur = ANIMAL_QUIZ[i];

  const pick = (o) => {
    if (picked) return;
    setPicked(o);
    const ok = o === cur.a;
    setTimeout(() => {
      const ns = score + (ok ? 1 : 0);
      setScore(ns);
      if (i === ANIMAL_QUIZ.length - 1) {
        setDone(true);
        onEvent(`scored ${ns}/${ANIMAL_QUIZ.length} on the Animal Quiz 🐾`);
      } else {
        setI(i + 1);
        setPicked(null);
      }
    }, 900);
  };

  if (done) {
    return (
      <div className="text-center">
        <p className="text-5xl">🐾</p>
        <p className="mt-2 text-lg font-extrabold text-slate-800">You know {score} of {ANIMAL_QUIZ.length} animal sounds!</p>
        <button
          onClick={() => { setI(0); setScore(0); setPicked(null); setDone(false); }}
          className="mt-4 rounded-2xl bg-violet-100 px-5 py-2 text-xs font-bold text-violet-600 hover:bg-violet-200"
        >
          🔁 Play again
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="mb-1 text-xs font-bold text-slate-500">Question {i + 1} of {ANIMAL_QUIZ.length}</p>
      <p className="rounded-2xl bg-violet-50 p-4 text-xl font-extrabold text-slate-700">{cur.q}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {cur.opts.map((o) => (
          <button
            key={o}
            onClick={() => pick(o)}
            className={`rounded-2xl p-3 text-sm font-bold transition ${
              picked && o === cur.a
                ? 'bg-emerald-400 text-white'
                : picked && o !== cur.a
                  ? 'bg-violet-50 text-slate-300'
                  : 'bg-white ring-2 ring-violet-200 hover:bg-violet-100'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      {picked && (
        <p className={`mt-3 text-sm font-extrabold ${picked === cur.a ? 'text-emerald-600' : 'text-rose-500'}`}>
          {picked === cur.a ? '✅ Yes! Well done!' : `Almost! It's the ${cur.a.toLowerCase()}.`}
        </p>
      )}
    </div>
  );
}

function Flashcards() {
  const [i, setI] = useState(0);
  const f = FACTS[i];
  return (
    <div className="text-center">
      <div className="rounded-3xl border-2 border-violet-100 bg-gradient-to-br from-violet-50 to-pink-50 p-6">
        <p className="text-4xl">{f.icon}</p>
        <p className="mt-2 text-sm font-extrabold text-violet-600">{f.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
      </div>
      <button
        onClick={() => setI((i + 1) % FACTS.length)}
        className="mt-4 rounded-2xl bg-violet-100 px-5 py-2 text-xs font-bold text-violet-600 hover:bg-violet-200"
      >
        Next fact ➡️ ({(i % FACTS.length) + 1}/{FACTS.length})
      </button>
    </div>
  );
}

export function LearnHub({ onEvent, onVideo }) {
  const [tab, setTab] = useState('quiz');
  return (
    <div>
      <TabBar
        tabs={[
          { key: 'quiz', icon: '🐾', label: 'Animal Quiz' },
          { key: 'facts', icon: '💡', label: 'Fun Facts' },
          { key: 'watch', icon: '🎬', label: 'Watch & Learn' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'quiz' && <AnimalQuiz onEvent={onEvent} />}
      {tab === 'facts' && <Flashcards />}
      {tab === 'watch' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SAFE_VIDEOS.map((v) => (
            <button
              key={v.id}
              onClick={() => onVideo(v)}
              className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3 text-left transition hover:bg-violet-100"
            >
              <span className="text-2xl">🎬</span>
              <p className="mt-1 text-xs font-bold text-slate-700">{v.title}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
