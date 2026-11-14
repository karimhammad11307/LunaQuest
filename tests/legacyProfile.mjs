/** Existing regression flows begin with an experienced player, so onboarding cannot mask gameplay controls. */
export async function useExistingPlayer(page) {
  await page.addInitScript(() => {
    const key = 'lunaquest.onboarding.v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1,
      progress: { introSeen: true, tutorialLearned: true, tutorialStep: null, introPage: 0 } }));
  });
}
