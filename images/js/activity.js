(function () {
  window.S21_recordGameScore = async function (gameKey, score, details) {
    if (!gameKey || !Number.isFinite(Number(score))) return false;
    try {
      const response = await fetch('/api/activity/game-score', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameKey, score: Number(score), details: details || {} }),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };
})();