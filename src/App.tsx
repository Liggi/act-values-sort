import { useState } from "react";

// Standard ACT values - curated from Russ Harris / Kelly Wilson work
const VALUES = [
  {
    id: "connection",
    name: "Connection",
    description: "To engage fully in whatever I am doing, and be fully present with others",
  },
  {
    id: "growth",
    name: "Growth",
    description: "To keep learning, developing, and expanding my capabilities",
  },
  {
    id: "health",
    name: "Health",
    description: "To take care of my physical and mental wellbeing",
  },
  {
    id: "creativity",
    name: "Creativity",
    description: "To express myself and bring new ideas to life",
  },
  {
    id: "adventure",
    name: "Adventure",
    description: "To seek new experiences and embrace the unknown",
  },
  {
    id: "compassion",
    name: "Compassion",
    description: "To show kindness and care for myself and others",
  },
  {
    id: "achievement",
    name: "Achievement",
    description: "To set meaningful goals and work hard to accomplish them",
  },
  {
    id: "authenticity",
    name: "Authenticity",
    description: "To be true to myself and live with integrity",
  },
  {
    id: "contribution",
    name: "Contribution",
    description: "To make a positive difference in the world around me",
  },
  {
    id: "freedom",
    name: "Freedom",
    description: "To have autonomy and independence in my choices",
  },
  {
    id: "security",
    name: "Security",
    description: "To create stability and safety in my life",
  },
  {
    id: "fun",
    name: "Fun",
    description: "To enjoy life and make time for play and pleasure",
  },
];

// Card gradient colors (sunset palette)
const GRADIENTS = [
  "from-rose-400 via-pink-400 to-orange-300",
  "from-violet-400 via-purple-400 to-pink-300",
  "from-amber-300 via-orange-400 to-rose-400",
  "from-teal-400 via-cyan-400 to-blue-300",
  "from-emerald-400 via-teal-400 to-cyan-300",
  "from-fuchsia-400 via-pink-400 to-rose-300",
  "from-sky-400 via-blue-400 to-indigo-300",
  "from-lime-400 via-emerald-400 to-teal-300",
  "from-orange-400 via-amber-400 to-yellow-300",
  "from-indigo-400 via-violet-400 to-purple-300",
  "from-pink-400 via-rose-400 to-red-300",
  "from-cyan-400 via-sky-400 to-blue-300",
];

type Value = (typeof VALUES)[number];
type Phase = "intro" | "sorting" | "results";

// Track win/loss record for each value
type Scores = Record<string, { wins: number; losses: number; comparisons: Set<string> }>;

function initScores(): Scores {
  const scores: Scores = {};
  VALUES.forEach((v) => {
    scores[v.id] = { wins: 0, losses: 0, comparisons: new Set() };
  });
  return scores;
}

// Get next pair, preferring to vary both cards and balance comparison counts
function getNextPair(scores: Scores, lastPair: [Value, Value] | null): [Value, Value] | null {
  const validPairs: [Value, Value][] = [];
  for (let i = 0; i < VALUES.length; i++) {
    for (let j = i + 1; j < VALUES.length; j++) {
      const a = VALUES[i];
      const b = VALUES[j];
      if (!scores[a.id].comparisons.has(b.id)) {
        validPairs.push([a, b]);
      }
    }
  }

  if (validPairs.length === 0) return null;

  const scoredPairs = validPairs.map((pair) => {
    let score = 0;
    const [a, b] = pair;

    if (lastPair) {
      const lastIds = new Set([lastPair[0].id, lastPair[1].id]);
      if (!lastIds.has(a.id) && !lastIds.has(b.id)) {
        score += 100;
      } else if (!lastIds.has(a.id) || !lastIds.has(b.id)) {
        score += 30;
      }
    } else {
      score += 100;
    }

    const aComparisons = scores[a.id].comparisons.size;
    const bComparisons = scores[b.id].comparisons.size;
    score -= (aComparisons + bComparisons) * 2;

    const aNetScore = scores[a.id].wins - scores[a.id].losses;
    const bNetScore = scores[b.id].wins - scores[b.id].losses;
    score -= Math.abs(aNetScore - bNetScore) * 3;

    return { pair, score };
  });

  scoredPairs.sort((a, b) => b.score - a.score);
  return scoredPairs[0].pair;
}

function getRankedValues(scores: Scores): Value[] {
  return [...VALUES].sort((a, b) => {
    const aScore = scores[a.id].wins - scores[a.id].losses;
    const bScore = scores[b.id].wins - scores[b.id].losses;
    if (bScore !== aScore) return bScore - aScore;
    return scores[b.id].wins - scores[a.id].wins;
  });
}

function getGradient(valueId: string): string {
  const index = VALUES.findIndex((v) => v.id === valueId);
  return GRADIENTS[index % GRADIENTS.length];
}

const MIN_COMPARISONS = 20;

function App() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [scores, setScores] = useState<Scores>(initScores);
  const [currentPair, setCurrentPair] = useState<[Value, Value] | null>(null);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [finalRanking, setFinalRanking] = useState<Value[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const startSorting = () => {
    const pair = getNextPair(scores, null);
    setCurrentPair(pair);
    setPhase("sorting");
  };

  const handleChoice = (winner: Value, loser: Value) => {
    const newScores = { ...scores };
    newScores[winner.id] = {
      ...newScores[winner.id],
      wins: newScores[winner.id].wins + 1,
      comparisons: new Set([...newScores[winner.id].comparisons, loser.id]),
    };
    newScores[loser.id] = {
      ...newScores[loser.id],
      losses: newScores[loser.id].losses + 1,
      comparisons: new Set([...newScores[loser.id].comparisons, winner.id]),
    };
    setScores(newScores);

    const newCount = comparisonCount + 1;
    setComparisonCount(newCount);

    const justCompared: [Value, Value] = [winner, loser];
    const nextPair = getNextPair(newScores, justCompared);

    if (!nextPair || newCount >= MIN_COMPARISONS) {
      setFinalRanking(getRankedValues(newScores));
      setPhase("results");
    } else {
      setCurrentPair(nextPair);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newRanking = [...finalRanking];
    const [draggedItem] = newRanking.splice(draggedIndex, 1);
    newRanking.splice(index, 0, draggedItem);
    setFinalRanking(newRanking);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const restart = () => {
    setPhase("intro");
    setScores(initScores());
    setCurrentPair(null);
    setComparisonCount(0);
    setFinalRanking([]);
  };

  const remaining = MIN_COMPARISONS - comparisonCount;

  return (
    <div className="min-h-screen bg-[#FDF8F3] text-slate-800">
      <div className="max-w-lg mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Intro Phase */}
        {phase === "intro" && (
          <div className="flex-1 flex flex-col">
            {/* Hero image placeholder */}
            <div className="relative rounded-2xl overflow-hidden mb-6 aspect-[4/3] bg-gradient-to-br from-rose-300 via-orange-200 to-amber-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-slate-800/20 rounded-3xl rotate-12" />
              </div>
              <button className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                <span className="text-slate-600">←</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <span>⏱ 2 min</span>
              <span>•</span>
              <span>Activity</span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-3">Values Sorting</h1>

            <p className="text-slate-600 leading-relaxed mb-8">
              Understanding your core values can transform how you make decisions.
              By identifying what truly matters to you, you can align your actions
              with your authentic self. Let's discover your top values together.
            </p>

            <div className="mt-auto">
              <button
                onClick={startSorting}
                className="w-full py-4 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Begin
              </button>
            </div>
          </div>
        )}

        {/* Sorting Phase */}
        {phase === "sorting" && currentPair && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setPhase("intro")}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <span className="text-slate-600">←</span>
              </button>
              <div className="flex items-center gap-2 text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="font-medium">{remaining} left</span>
              </div>
            </div>

            <div className="text-center text-slate-600 mb-6">
              Which matters more to you?
            </div>

            {/* Card stack area */}
            <div className="flex-1 flex items-center justify-center gap-4 mb-8">
              {currentPair.map((value, i) => (
                <button
                  key={value.id}
                  onClick={() => handleChoice(value, currentPair[i === 0 ? 1 : 0])}
                  className={`relative flex-1 max-w-[160px] aspect-[3/4] rounded-3xl bg-gradient-to-b ${getGradient(value.id)} p-4 flex flex-col items-center justify-center text-center shadow-lg hover:shadow-xl transition-all transform hover:scale-105 hover:-translate-y-1 active:scale-95`}
                >
                  {/* Card content */}
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {value.name}
                  </h3>
                  <p className="text-sm text-slate-700/80 leading-snug">
                    {value.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Skip link */}
            <div className="text-center">
              <button
                onClick={() => {
                  setFinalRanking(getRankedValues(scores));
                  setPhase("results");
                }}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                Skip to results →
              </button>
            </div>
          </div>
        )}

        {/* Results Phase */}
        {phase === "results" && (
          <div className="flex-1 flex flex-col">
            {/* Hero image */}
            <div className="relative rounded-2xl overflow-hidden mb-6 aspect-[4/3] bg-gradient-to-br from-violet-300 via-purple-200 to-pink-200">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-slate-800/20 rounded-3xl rotate-12" />
              </div>
              <button
                onClick={restart}
                className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center"
              >
                <span className="text-slate-600">←</span>
              </button>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Your Top {Math.min(5, finalRanking.length)} Values
            </h2>
            <p className="text-slate-500 mb-6">
              These values emerged as most important to you
            </p>

            {/* Top values list */}
            <div className="space-y-4 mb-8">
              {finalRanking.slice(0, 5).map((value, index) => (
                <div
                  key={value.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 rounded-xl bg-white border-2 cursor-grab active:cursor-grabbing transition-all ${
                    draggedIndex === index
                      ? "border-violet-400 shadow-lg scale-[1.02]"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getGradient(value.id)} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{value.name}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{value.description}</p>
                    </div>
                    <div className="text-slate-300 cursor-grab">⋮⋮</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-auto">
              <button
                onClick={restart}
                className="w-full py-4 bg-violet-600 hover:bg-violet-700 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Sort Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
