document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('toggleBlody');

  console.debug("Popup chargé. Récupération de l'état depuis le stockage...");

  // Récupère l'état enregistré (par défaut : activé)
  chrome.storage.sync.get('blodyActive', function(data) {
    const isActive = (typeof data.blodyActive === 'undefined') ? true : data.blodyActive;
    toggle.checked = isActive;
    console.debug("État Blody récupéré :", isActive);
  });

  // Au changement, enregistre l'état et envoie un message à l'onglet actif
  toggle.addEventListener('change', function() {
    const active = toggle.checked;
    chrome.storage.sync.set({ blodyActive: active }, function() {
      console.debug("État Blody mis à jour :", active);
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
          console.debug("Envoi du message de bascule à l'onglet :", tabs[0].id);
          chrome.tabs.sendMessage(tabs[0].id, { type: 'toggleBlody', active: active });
        } else {
          console.warn("Aucun onglet actif trouvé pour envoyer le message.");
        }
      });
    });
  });
});
