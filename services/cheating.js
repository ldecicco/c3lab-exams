"use strict";

const createCheatingService = () => {
  const normalizeAnswerSet = (arr) =>
    Array.from(new Set(arr))
      .sort((a, b) => a - b)
      .join(",");

  const getSelectedOriginalAnswers = (student, questionIndex, mapping) => {
    const answers = Array.isArray(student.answers) ? student.answers : [];
    const versionIdx = Number(student.versione || 0) - 1;
    const qdict = mapping.questiondictionary?.[versionIdx];
    const adict = mapping.randomizedanswersdictionary?.[versionIdx];
    if (!qdict || !adict) return [];
    const displayedToOriginal = [];
    qdict.forEach((displayed, original) => {
      displayedToOriginal[displayed - 1] = original;
    });
    const displayedIndex = displayedToOriginal.indexOf(questionIndex);
    if (displayedIndex === -1) return [];
    const selectedLetters = String(answers[displayedIndex] || "").split("");
    const order = adict[questionIndex];
    const orderSafe = Array.isArray(order) ? order : [];
    return orderSafe
      .map((originalAnswerIndex, idx) =>
        selectedLetters.includes(String.fromCharCode(65 + idx)) ? originalAnswerIndex : null
      )
      .filter(Boolean);
  };

  const computeSuspiciousPairs = ({
    students,
    mapping,
    permutations,
    pairSample,
    alpha,
  }) => {
    const questionCount = Math.min(
      Number(mapping.Nquestions || 0) || mapping.correctiondictionary?.length || 0,
      mapping.correctiondictionary?.length || 0
    );
    if (!questionCount) {
      return { threshold: null, pairs: [], totalPairs: 0, pairSample: 0, permutations: 0 };
    }

    const correctSets = mapping.correctiondictionary.map((row) =>
      normalizeAnswerSet(
        row
          .map((val, idx) => (val > 0 ? idx + 1 : null))
          .filter(Boolean)
      )
    );

    const signaturesByQuestion = Array.from({ length: questionCount }, () =>
      Array.from({ length: students.length }, () => null)
    );
    const correctCounts = Array.from({ length: questionCount }, () => 0);
    const totalCounts = Array.from({ length: questionCount }, () => 0);

    students.forEach((student, sIdx) => {
      for (let q = 0; q < questionCount; q += 1) {
        const selected = getSelectedOriginalAnswers(student, q, mapping);
        const signature = normalizeAnswerSet(selected);
        const isCorrect = signature && signature === correctSets[q];
        totalCounts[q] += 1;
        if (isCorrect) {
          correctCounts[q] += 1;
          signaturesByQuestion[q][sIdx] = null;
        } else if (signature) {
          signaturesByQuestion[q][sIdx] = signature;
        } else {
          signaturesByQuestion[q][sIdx] = null;
        }
      }
    });

    const pCorr = correctCounts.map((count, idx) =>
      totalCounts[idx] ? count / totalCounts[idx] : 0.01
    );
    const weights = pCorr.map((p) => -Math.log(Math.max(p, 1e-6)));

    const pairs = [];
    for (let i = 0; i < students.length; i += 1) {
      for (let j = i + 1; j < students.length; j += 1) {
        let score = 0;
        const matches = [];
        for (let q = 0; q < questionCount; q += 1) {
          const sigI = signaturesByQuestion[q][i];
          if (!sigI) continue;
          const sigJ = signaturesByQuestion[q][j];
          if (sigI && sigI === sigJ) {
            score += weights[q];
            matches.push(q + 1);
          }
        }
        if (matches.length) {
          pairs.push({
            studentA: students[i],
            studentB: students[j],
            score: Math.round(score * 1000) / 1000,
            matchCount: matches.length,
            matchQuestions: matches,
          });
        }
      }
    }

    const totalPairs = (students.length * (students.length - 1)) / 2;
    const samplePairs = [];
    const maxSample = Math.min(pairSample, totalPairs);
    if (maxSample === totalPairs) {
      for (let i = 0; i < students.length; i += 1) {
        for (let j = i + 1; j < students.length; j += 1) {
          samplePairs.push([i, j]);
        }
      }
    } else {
      const seen = new Set();
      while (samplePairs.length < maxSample) {
        const i = Math.floor(Math.random() * students.length);
        const j = Math.floor(Math.random() * students.length);
        if (i === j) continue;
        const a = Math.min(i, j);
        const b = Math.max(i, j);
        const key = `${a}-${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        samplePairs.push([a, b]);
      }
    }

    const nullScores = [];
    for (let p = 0; p < permutations; p += 1) {
      const permuted = signaturesByQuestion.map((col) => {
        const copy = col.slice();
        for (let i = copy.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = copy[i];
          copy[i] = copy[j];
          copy[j] = temp;
        }
        return copy;
      });
      for (let k = 0; k < samplePairs.length; k += 1) {
        const [i, j] = samplePairs[k];
        let score = 0;
        for (let q = 0; q < questionCount; q += 1) {
          const sigI = permuted[q][i];
          if (!sigI) continue;
          if (sigI === permuted[q][j]) score += weights[q];
        }
        nullScores.push(score);
      }
    }
    nullScores.sort((a, b) => a - b);
    const cutoffIndex = Math.floor(nullScores.length * alpha);
    const threshold = nullScores[Math.min(cutoffIndex, nullScores.length - 1)] || null;

    const suspicious = threshold
      ? pairs.filter((pair) => pair.score >= threshold)
      : [];
    suspicious.sort((a, b) => b.score - a.score);

    return {
      threshold,
      permutations,
      pairSample: maxSample,
      totalPairs,
      pairs: suspicious,
    };
  };

  return {
    computeSuspiciousPairs,
  };
};

module.exports = createCheatingService;
