const LABELS = ['Response A', 'Response B', 'Response C'];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function anonymize(responses) {
  const successful = responses.filter((r) => r.status === 'success');
  const shuffled = shuffle(successful);
  return shuffled.map((r, i) => ({
    label: LABELS[i],
    text: r.response_text,
    responseId: r.id,
  }));
}

module.exports = { anonymize };
