const calculatePoints = (prediction, actualResult, betType = 'classic', relativePoints = null, wagerAmount = null) => {
  const predictedOutcome = prediction.outcome;
  const actualOutcome = actualResult.outcome;

  // If prediction is incorrect, always return 0
  if (predictedOutcome !== actualOutcome) {
    return 0;
  }

  // For classic betting, return 1 point
  if (betType === 'classic') {
    return 1;
  }

  // For relative betting with wager system
  if (betType === 'relative' && relativePoints) {
    let multiplier = 1;

    switch (actualOutcome) {
      case '1': // Home win
        multiplier = relativePoints.homeWin || 1;
        break;
      case 'X': // Draw
        multiplier = relativePoints.draw || 1;
        break;
      case '2': // Away win
        multiplier = relativePoints.awayWin || 1;
        break;
      default:
        multiplier = 1;
    }

    // If wagerAmount is provided, calculate credits won (wager * multiplier)
    // Otherwise, just return the multiplier (for non-wager relative betting)
    if (wagerAmount && wagerAmount > 0) {
      return wagerAmount * multiplier;
    }

    return multiplier;
  }

  // Fallback to classic
  return 1;
};

module.exports = calculatePoints;
