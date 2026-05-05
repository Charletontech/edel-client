Edel.initIcons();
EdelModules.auth.initInteractiveEffects();

const authPage = EdelModules.auth.createPageController();

if (EdelModules.auth.isLoggedIn()) {
  const currentUser = EdelModules.auth.getUser();
  EdelModules.auth.redirectAfterLogin(currentUser?.role);
}

window.switchAuthView = (view) => authPage.activateView(view);
window.updateRoleUI = () => authPage.updateRoleUI();
window.goToStep = (step) => authPage.goToStep(step);
window.handleAuth = (event, type) => authPage.handleSubmit(event, type);
