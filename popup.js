document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('toggleBlody');
  const boldCountInput = document.getElementById('boldCount');
  const colorOptionSelect = document.getElementById('colorOption');
  const customColorInput = document.getElementById('customColor');
  const randomOptionCheckbox = document.getElementById('randomOption');

  console.debug("Popup chargé. Récupération de l'état depuis le stockage...");

  // Récupérer les paramètres sauvegardés
  chrome.storage.sync.get(['blodyActive', 'blodyBoldCount', 'blodyColorOption', 'blodyCustomColor', 'blodyRandom'], function(data) {
    const isActive = (typeof data.blodyActive === 'undefined') ? true : data.blodyActive;
    toggle.checked = isActive;
    
    boldCountInput.value = data.blodyBoldCount || 1;
    colorOptionSelect.value = data.blodyColorOption || 'auto';
    customColorInput.value = data.blodyCustomColor || '#ff0000';
    randomOptionCheckbox.checked = data.blodyRandom || false;

    // Afficher ou masquer le sélecteur de couleur selon l'option choisie
    if (colorOptionSelect.value === 'custom') {
      customColorInput.style.display = 'inline';
    } else {
      customColorInput.style.display = 'none';
    }
    
    console.debug("Paramètres récupérés :", { isActive, boldCount: boldCountInput.value, colorOption: colorOptionSelect.value, customColor: customColorInput.value, random: randomOptionCheckbox.checked });
  });

  // Fonction pour enregistrer et transmettre les nouveaux réglages
  function updateSettings() {
    const settings = {
      blodyBoldCount: parseInt(boldCountInput.value) || 1,
      blodyColorOption: colorOptionSelect.value,
      blodyCustomColor: customColorInput.value,
      blodyRandom: randomOptionCheckbox.checked
    };
    chrome.storage.sync.set(settings, function() {
      console.debug("Paramètres mis à jour :", settings);
      // Envoi d'un message de mise à jour aux onglets actifs
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'updateBlodySettings', ...settings });
          console.debug("Message de mise à jour envoyé à l'onglet :", tabs[0].id);
        }
      });
    });
  }

  // Changement de l'état d'activation
  toggle.addEventListener('change', function() {
    const active = toggle.checked;
    chrome.storage.sync.set({ blodyActive: active }, function() {
      console.debug("État Blody mis à jour :", active);
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'toggleBlody', active: active });
          console.debug("Message de bascule envoyé à l'onglet :", tabs[0].id);
        }
      });
    });
  });

  // Mise à jour lors d'un changement du nombre de lettres
  boldCountInput.addEventListener('change', updateSettings);
  
  // Mise à jour lors d'un changement de l'option de couleur
  colorOptionSelect.addEventListener('change', function() {
    if (colorOptionSelect.value === 'custom') {
      customColorInput.style.display = 'inline';
    } else {
      customColorInput.style.display = 'none';
    }
    updateSettings();
  });
  
  // Mise à jour lors d'un changement de la couleur personnalisée
  customColorInput.addEventListener('change', updateSettings);

  // Mise à jour lors d'un changement de l'option aléatoire
  randomOptionCheckbox.addEventListener('change', updateSettings);
});
