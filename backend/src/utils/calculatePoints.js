const calculatePoints = (prediction, actualResult) => {
  // Simple points system: 1 point for correct outcome (win/draw)
  const predictedOutcome = prediction.outcome;
  const actualOutcome = actualResult.outcome;

  return predictedOutcome === actualOutcome ? 1 : 0;
};

module.exports = calculatePoints;
