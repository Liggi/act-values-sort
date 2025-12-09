import { useState } from "react";

// Standard ACT values - curated from Russ Harris / Kelly Wilson work
const VALUES = [
  {
    id: "connection",
    name: "Connection",
    description: "Building and nurturing close relationships with others",
  },
  {
    id: "growth",
    name: "Growth",
    description: "Continuously learning and developing as a person",
  },
  {
    id: "health",
    name: "Health",
    description: "Taking care of your physical and mental wellbeing",
  },
  {
    id: "creativity",
    name: "Creativity",
    description: "Expressing yourself and bringing new ideas to life",
  },
  {
    id: "adventure",
    name: "Adventure",
    description: "Seeking new experiences and embracing the unknown",
  },
  {
    id: "compassion",
    name: "Compassion",
    description: "Showing kindness and care for yourself and others",
  },
  {
    id: "achievement",
    name: "Achievement",
    description: "Setting goals and working hard to accomplish them",
  },
  {
    id: "authenticity",
    name: "Authenticity",
    description: "Being true to yourself and living with integrity",
  },
  {
    id: "contribution",
    name: "Contribution",
    description: "Making a positive difference in the world around you",
  },
  {
    id: "freedom",
    name: "Freedom",
    description: "Having autonomy and independence in your choices",
  },
  {
    id: "security",
    name: "Security",
    description: "Creating stability and safety in your life",
  },
  {
    id: "fun",
    name: "Fun",
    description: "Enjoying life and making time for play and pleasure",
  },
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
  // Build list of all valid pairs (haven't competed yet)
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

  // Score each pair: prefer pairs where neither value was in the last pair,
  // and prefer values that have been compared less often
  const scoredPairs = validPairs.map((pair) => {
    let score = 0;
    const [a, b] = pair;

    // Strongly prefer pairs that don't repeat either value from last comparison
    if (lastPair) {
      const lastIds = new Set([lastPair[0].id, lastPair[1].id]);
      if (!lastIds.has(a.id) && !lastIds.has(b.id)) {
        score += 100; // Big bonus for completely fresh pair
      } else if (!lastIds.has(a.id) || !lastIds.has(b.id)) {
        score += 30; // Smaller bonus for at least one fresh value
      }
    } else {
      score += 100; // First comparison, no penalty
    }

    // Prefer values with fewer comparisons (balances exposure)
    const aComparisons = scores[a.id].comparisons.size;
    const bComparisons = scores[b.id].comparisons.size;
    score -= (aComparisons + bComparisons) * 2;

    // Slight preference for similar win/loss records (Swiss-style)
    const aNetScore = scores[a.id].wins - scores[a.id].losses;
    const bNetScore = scores[b.id].wins - scores[b.id].losses;
    score -= Math.abs(aNetScore - bNetScore) * 3;

    return { pair, score };
  });

  // Sort by score (highest first) and pick the best
  scoredPairs.sort((a, b) => b.score - a.score);
  return scoredPairs[0].pair;
}

function getRankedValues(scores: Scores): Value[] {
  return [...VALUES].sort((a, b) => {
    const aScore = scores[a.id].wins - scores[a.id].losses;
    const bScore = scores[b.id].wins - scores[b.id].losses;
    if (bScore !== aScore) return bScore - aScore;
    // Tiebreaker: more wins
    return scores[b.id].wins - scores[a.id].wins;
  });
}

// Minimum comparisons before we can show results (Swiss typically needs ~3-4 rounds)
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

    // End if we've done enough comparisons or exhausted all pairs
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

  const progress = Math.min(100, (comparisonCount / MIN_COMPARISONS) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
            Values Sort
          </h1>
          <p className="text-slate-400">Discover what matters most to you</p>
        </div>

        {/* Intro Phase */}
        {phase === "intro" && (
          <div className="space-y-8">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-4 text-amber-300">How it works</h2>
              <ol className="space-y-3 text-slate-300">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-sm flex items-center justify-center">
                    1
                  </span>
                  <span>You'll see two values at a time</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-sm flex items-center justify-center">
                    2
                  </span>
                  <span>Choose which one feels more important to you right now</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-sm flex items-center justify-center">
                    3
                  </span>
                  <span>There are no wrong answers — trust your gut</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-sm flex items-center justify-center">
                    4
                  </span>
                  <span>At the end, you'll see your personal values ranking</span>
                </li>
              </ol>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-xl font-semibold mb-4 text-amber-300">The values</h2>
              <div className="grid grid-cols-2 gap-2">
                {VALUES.map((v) => (
                  <div key={v.id} className="text-sm text-slate-400 py-1">
                    • {v.name}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={startSorting}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-xl font-semibold text-slate-900 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Sorting
            </button>
          </div>
        )}

        {/* Sorting Phase */}
        {phase === "sorting" && currentPair && (
          <div className="space-y-8">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Progress</span>
                <span>
                  {comparisonCount} / {MIN_COMPARISONS}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="text-center text-slate-300 text-lg">
              Which matters more to you right now?
            </div>

            {/* Choice cards - side by side */}
            <div className="grid grid-cols-2 gap-4">
              {currentPair.map((value, i) => (
                <button
                  key={value.id}
                  onClick={() =>
                    handleChoice(value, currentPair[i === 0 ? 1 : 0])
                  }
                  className="p-6 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 hover:border-amber-500/50 rounded-2xl text-left transition-all transform hover:scale-[1.02] active:scale-[0.98] group flex flex-col h-full"
                >
                  <div className="text-xl font-semibold text-white group-hover:text-amber-300 transition-colors">
                    {value.name}
                  </div>
                  <div className="text-slate-400 mt-2 text-sm leading-relaxed flex-1">
                    {value.description}
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setFinalRanking(getRankedValues(scores));
                  setPhase("results");
                }}
                className="text-slate-500 hover:text-slate-300 text-sm underline"
              >
                Skip to results →
              </button>
            </div>
          </div>
        )}

        {/* Results Phase */}
        {phase === "results" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-amber-300">
                Your Values Ranking
              </h2>
              <p className="text-slate-400">
                Drag to adjust if anything feels off
              </p>
            </div>

            <div className="space-y-2">
              {finalRanking.map((value, index) => (
                <div
                  key={value.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-4 p-4 bg-slate-800/80 border rounded-xl cursor-grab active:cursor-grabbing transition-all ${
                    draggedIndex === index
                      ? "border-amber-500 bg-slate-700/80 scale-[1.02]"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index < 3
                        ? "bg-amber-500/20 text-amber-400"
                        : index < 6
                        ? "bg-slate-600/50 text-slate-300"
                        : "bg-slate-700/50 text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{value.name}</div>
                    <div className="text-sm text-slate-500">
                      {value.description}
                    </div>
                  </div>
                  <div className="text-slate-600">⋮⋮</div>
                </div>
              ))}
            </div>

            {/* Top 3 summary */}
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl p-6">
              <h3 className="font-semibold text-amber-300 mb-3">Your top 3 values</h3>
              <div className="space-y-2">
                {finalRanking.slice(0, 3).map((value, i) => (
                  <div key={value.id} className="flex items-center gap-3">
                    <span className="text-amber-400">{["🥇", "🥈", "🥉"][i]}</span>
                    <span className="font-medium">{value.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={restart}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={() => {
                  const text = finalRanking
                    .map((v, i) => `${i + 1}. ${v.name}`)
                    .join("\n");
                  navigator.clipboard.writeText(text);
                  alert("Copied to clipboard!");
                }}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-medium transition-colors"
              >
                Copy Results
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-slate-600">
          Based on Acceptance and Commitment Therapy (ACT) values work
        </div>
      </div>
    </div>
  );
}

export default App;
