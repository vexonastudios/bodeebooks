// Keep parent activity accents consistent with the built-in student cards.
const activityColors = {
  'app://audiobooks':'#fb923c','app://music':'#c084fc','app://videos':'#fbbf24',
  'app://writing':'#ec4899','app://word-processor':'#ec4899','app://journal':'#ec4899','app://notebook':'#ec4899',
  'app://reading':'#22c55e','app://typing':'#38bdf8','app://logic':'#a78bfa','app://words':'#f472b6',
  'app://spelling':'#f97316','app://vocabulary':'#70cbb5','app://poems':'#f7c948',
  'app://quizzes':'#818cf8','app://worksheets':'#38bdf8','app://geography':'#22c55e',
  'app://learning-videos':'#22d3ee','app://spanish':'#fb923c','app://coloring':'#f472b6',
  'app://coloring-studio':'#34d399','app://piano':'#a78bfa','app://math-coach':'#38bdf8','app://games':'#f7c948'
};
export const cardColor = subject => /^#[\da-f]{3,8}$/i.test(subject.color || '') ? subject.color : '#38bdf8';
export function activityAccent(subject) {
  const color = cardColor(subject);
  return color.toLowerCase() === '#38bdf8' ? activityColors[subject.url] || color : color;
}
