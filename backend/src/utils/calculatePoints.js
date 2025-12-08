const calculatePoints = (prediction, actualResult) => {
  let points = 0;

  const predictedOutcome = prediction.outcome;
  const predictedHomeScore = prediction.homeScore;
  const predictedAwayScore = prediction.awayScore;

  const actualHomeScore = actualResult.homeScore;
  const actualAwayScore = actualResult.awayScore;
  const actualOutcome = actualResult.outcome;

  if (predictedOutcome === actualOutcome) {
    points += 1;
  }

  if (predictedHomeScore === actualHomeScore) {
    points += 2;
  }

  if (predictedAwayScore === actualAwayScore) {
    points += 2;
  }

  if (predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore) {
    points += 3;
  }

  return points;
};

module.exports = calculatePoints;
