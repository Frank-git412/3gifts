// Language is explicit in the URL. Never store or transfer questionnaire answers.
document.addEventListener("click", event => {
  const link = event.target.closest?.(".language-switch");
  if (!link) return;
  const inProgress = ["questionnaire", "results"].some(id => {
    const node = document.getElementById(id); return node && !node.hidden;
  });
  if (inProgress && !window.confirm(document.documentElement.lang.startsWith("en")
    ? "Changing language starts a new questionnaire. Your answers will not be transferred. Continue?"
    : "Cambiando lingua inizi un nuovo questionario. Le risposte non vengono trasferite. Continuare?")) event.preventDefault();
});
