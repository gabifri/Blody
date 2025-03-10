document.addEventListener('DOMContentLoaded', function() {
  // Sélecteurs
  const toggle = document.getElementById('toggleBlody');
  const boldCountInput = document.getElementById('boldCount');
  const colorOptionSelect = document.getElementById('colorOption');
  const customColorInput = document.getElementById('customColor');
  const randomOptionCheckbox = document.getElementById('randomOption');

  const blacklistInput = document.getElementById('blacklistInput');
  const addCurrentSiteBtn = document.getElementById('addCurrentSite');
  const toggleBlacklistViewBtn = document.getElementById('toggleBlacklistView');
  const blacklistContainer = document.getElementById('blacklistContainer');
  const blacklistList = document.getElementById('blacklistList');

  const shortcutInput = document.getElementById('shortcutInput');
  const recordShortcutBtn = document.getElementById('recordShortcutBtn');

  const resetSettingsBtn = document.getElementById('resetSettings');

  // Lecture audio
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playPauseIcon = document.getElementById('playPauseIcon');
  const playPauseLabel = document.getElementById('playPauseLabel');
  const speedSlider = document.getElementById('speedSlider');
  const speedText = document.getElementById('speedText');

  // Convertit la blacklist (chaîne) en tableau
  function parseBlacklist(str) {
    return str.split(',').map(s => s.trim()).filter(s => s);
  }

  // Met à jour l'affichage de la blacklist
  function updateBlacklistDisplay(blacklistStr) {
    const blacklist = parseBlacklist(blacklistStr);
    blacklistList.innerHTML = '';
    blacklist.forEach((domain, index) => {
      const li = document.createElement('li');
      li.textContent = domain;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Supprimer';
      removeBtn.style.backgroundColor = '#F8C999';
      removeBtn.style.border = '1px solid #D9A676';
      removeBtn.style.borderRadius = '4px';
      removeBtn.style.color = '#8B5E34';
      removeBtn.style.cursor = 'pointer';
      removeBtn.addEventListener('click', function() {
        const updatedList = blacklist.filter((d, i) => i !== index);
        const updatedStr = updatedList.join(', ');
        blacklistInput.value = updatedStr;
        updateSettings();
        updateBlacklistDisplay(updatedStr);
      });
      li.appendChild(removeBtn);
      blacklistList.appendChild(li);
    });
  }

  // Charge les réglages depuis le stockage
  chrome.storage.sync.get([
    'blodyActive',
    'blodyBoldCount',
    'blodyColorOption',
    'blodyCustomColor',
    'blodyRandom',
    'blodyBlacklist',
    'blodyShortcut',
    'blodyReadRate'
  ], function(data) {
    // Activation
    const isActive = (typeof data.blodyActive === 'undefined') ? true : data.blodyActive;
    toggle.checked = isActive;

    // Paramètres
    boldCountInput.value = data.blodyBoldCount || 1;
    colorOptionSelect.value = data.blodyColorOption || 'auto';
    customColorInput.value = data.blodyCustomColor || '#ff0000';
    randomOptionCheckbox.checked = data.blodyRandom || false;

    // Blacklist
    blacklistInput.value = data.blodyBlacklist || "";
    updateBlacklistDisplay(blacklistInput.value);

    // Raccourci
    shortcutInput.value = data.blodyShortcut || "Alt+Shift+B";

    // Vitesse lecture
    speedSlider.value = data.blodyReadRate || 1;
    speedText.value = (data.blodyReadRate || 1).toFixed(1);

    // Affiche ou masque la couleur custom
    if (colorOptionSelect.value === 'custom') {
      customColorInput.style.display = 'inline';
    } else {
      customColorInput.style.display = 'none';
    }
  });

  // Enregistre et transmet les réglages aux onglets actifs
  function updateSettings() {
    const rate = parseFloat(speedSlider.value);
    const settings = {
      blodyBoldCount: parseInt(boldCountInput.value) || 1,
      blodyColorOption: colorOptionSelect.value,
      blodyCustomColor: customColorInput.value,
      blodyRandom: randomOptionCheckbox.checked,
      blodyBlacklist: blacklistInput.value,
      blodyShortcut: shortcutInput.value,
      blodyReadRate: isNaN(rate) ? 1 : rate
    };
    chrome.storage.sync.set(settings, function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'updateBlodySettings',
            ...settings
          });
        }
      });
    });
  }

  // Activation / désactivation
  toggle.addEventListener('change', function() {
    const active = toggle.checked;
    chrome.storage.sync.set({ blodyActive: active }, function() {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'toggleBlody', active: active });
        }
      });
    });
  });

  // Paramètres
  boldCountInput.addEventListener('change', updateSettings);
  colorOptionSelect.addEventListener('change', function() {
    if (colorOptionSelect.value === 'custom') {
      customColorInput.style.display = 'inline';
    } else {
      customColorInput.style.display = 'none';
    }
    updateSettings();
  });
  customColorInput.addEventListener('change', updateSettings);
  randomOptionCheckbox.addEventListener('change', updateSettings);

  // Blacklist
  blacklistInput.addEventListener('change', function() {
    updateBlacklistDisplay(blacklistInput.value);
    updateSettings();
  });
  addCurrentSiteBtn.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        try {
          const url = new URL(tabs[0].url);
          const domain = url.hostname;
          let currentBlacklist = blacklistInput.value;
          let blacklistArray = parseBlacklist(currentBlacklist);
          if (!blacklistArray.includes(domain)) {
            blacklistArray.push(domain);
            const updatedStr = blacklistArray.join(', ');
            blacklistInput.value = updatedStr;
            updateBlacklistDisplay(updatedStr);
            updateSettings();
          }
        } catch (e) {
          console.error("Erreur lors de l'ajout du domaine à la blacklist:", e);
        }
      }
    });
  });
  toggleBlacklistViewBtn.addEventListener('click', function() {
    if (blacklistContainer.style.display === "none") {
      blacklistContainer.style.display = "block";
    } else {
      blacklistContainer.style.display = "none";
    }
  });

  // Raccourci clavier
  recordShortcutBtn.addEventListener('click', function() {
    shortcutInput.value = "";
    shortcutInput.focus();
    shortcutInput.placeholder = "Appuyez sur les touches...";
    function keyHandler(e) {
      e.preventDefault();
      let keys = [];
      if (e.ctrlKey) keys.push("Ctrl");
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");
      if (e.metaKey) keys.push("Meta");
      if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
        keys.push(e.key);
      }
      const shortcut = keys.join("+");
      shortcutInput.value = shortcut;
      shortcutInput.placeholder = "";
      updateSettings();
      document.removeEventListener('keydown', keyHandler);
      shortcutInput.blur();
    }
    document.addEventListener('keydown', keyHandler);
  });

  // Gestion de la vitesse lecture : slider et text
  function syncSpeed(value) {
    let val = parseFloat(value);
    if (isNaN(val)) val = 1;
    if (val < 0.5) val = 0.5;
    if (val > 2) val = 2;
    speedSlider.value = val;
    speedText.value = val.toFixed(1);
    updateSettings();
  }
  speedSlider.addEventListener('input', function() {
    syncSpeed(speedSlider.value);
  });
  speedText.addEventListener('change', function() {
    syncSpeed(speedText.value);
  });

  // Bouton Play/Pause (lecture audio)
  let isPlaying = false; // état local d'affichage du bouton
  playPauseBtn.addEventListener('click', function() {
    const rate = parseFloat(speedSlider.value) || 1;
    // On envoie le message au content script
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'toggleReadPlayPause',
          rate: rate
        });
      }
    });
    // On bascule l’icône
    if (!isPlaying) {
      playPauseIcon.src = "pause.png";
      playPauseLabel.textContent = "Pause";
      isPlaying = true;
    } else {
      playPauseIcon.src = "play.png";
      playPauseLabel.textContent = "Play";
      isPlaying = false;
    }
  });

  // Bouton de réinitialisation
  resetSettingsBtn.addEventListener('click', function() {
    const defaultSettings = {
      blodyActive: true,
      blodyBoldCount: 1,
      blodyColorOption: "auto",
      blodyCustomColor: "#ff0000",
      blodyRandom: false,
      blodyBlacklist: "",
      blodyShortcut: "Alt+Shift+B",
      blodyReadRate: 1
    };
    chrome.storage.sync.set(defaultSettings, function() {
      toggle.checked = true;
      boldCountInput.value = 1;
      colorOptionSelect.value = "auto";
      customColorInput.value = "#ff0000";
      randomOptionCheckbox.checked = false;
      blacklistInput.value = "";
      shortcutInput.value = "Alt+Shift+B";
      speedSlider.value = 1;
      speedText.value = "1.0";
      isPlaying = false;
      playPauseIcon.src = "play.png";
      playPauseLabel.textContent = "Play";
      updateBlacklistDisplay("");
      customColorInput.style.display = 'none';
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'updateBlodySettings',
            ...defaultSettings
          });
        }
      });
    });
  });
});
