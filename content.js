(function() {
  console.debug("Blody extension : content script chargé.");

  // Paramètres stockés
  let settings = {
    boldCount: 1,
    colorOption: "auto",
    customColor: "",
    random: false,
    blacklist: "",
    shortcut: "Alt+Shift+B",
    readRate: 1
  };

  // Lecture audio
  let readingUtterance = null;
  let readingState = "stopped"; // "stopped", "playing", "paused"

  // Applique le style en fonction des réglages
  function addBlodyStyle() {
    let style = document.getElementById('blody-style');
    if (style) style.remove();
    style = document.createElement('style');
    style.id = 'blody-style';

    let colorCSS = "";
    if (settings.colorOption === "custom" && settings.customColor) {
      colorCSS = `color: ${settings.customColor};`;
    }
    style.innerHTML = `.blody-active .blody-bold { font-weight: bold; ${colorCSS} }`;
    document.head.appendChild(style);
    console.debug("Style Blody ajouté avec settings :", settings);
  }

  // Vérifie si un nœud est déjà transformé
  function isInsideProcessed(node) {
    let current = node.parentNode;
    while (current) {
      if (current.nodeType === Node.ELEMENT_NODE && current.hasAttribute("data-blody-processed")) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }

  // Vérifie si un nœud se trouve dans un champ de saisie ou éditable
  function isInInputOrEditable(node) {
    if (!node.parentNode || !node.parentNode.tagName) return false;
    const tag = node.parentNode.tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return true;
    if (node.parentNode.isContentEditable || node.parentNode.getAttribute('contenteditable') === "true") return true;
    return false;
  }

  // Transforme un nœud texte en mettant en gras les premières lettres
  function processTextNode(node) {
    if (node.parentNode && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentNode.nodeName)) return;
    if (node.parentNode && ['TEXTAREA', 'INPUT', 'SELECT'].includes(node.parentNode.nodeName)) return;
    if (isInInputOrEditable(node)) return;
    if (isInsideProcessed(node)) return;

    const text = node.textContent;
    if (!text || !text.trim()) return;

    const container = document.createElement('span');
    container.setAttribute('data-blody-processed', 'true');

    // Séparation par mots + espaces
    const parts = text.split(/(\s+)/);
    parts.forEach(part => {
      if (part && !/^\s+$/.test(part)) {
        const wordSpan = document.createElement('span');
        let count = settings.boldCount;
        if (settings.random) {
          count = Math.floor(Math.random() * settings.boldCount) + 1;
        }
        if (part.length <= count) {
          count = 1;
        }
        const boldText = part.substring(0, count);
        const restText = part.substring(count);

        const boldSpan = document.createElement('span');
        boldSpan.className = 'blody-bold';
        boldSpan.textContent = boldText;
        wordSpan.appendChild(boldSpan);

        if (restText) {
          wordSpan.appendChild(document.createTextNode(restText));
        }
        container.appendChild(wordSpan);
      } else {
        // Espace ou mot vide
        container.appendChild(document.createTextNode(part));
      }
    });
    node.parentNode.replaceChild(container, node);
  }

  // Exécute la callback lors d'un temps d'inactivité
  function idleCallback(callback) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback);
    } else {
      setTimeout(callback, 50);
    }
  }

  // Transforme par lots les nœuds texte
  function processTextNodesBatch(nodes, doneCallback) {
    let index = 0;
    function processBatch(deadline) {
      while (index < nodes.length && (deadline.timeRemaining() > 0 || deadline.didTimeout)) {
        processTextNode(nodes[index]);
        index++;
      }
      if (index < nodes.length) {
        idleCallback(processBatch);
      } else {
        if (doneCallback) doneCallback();
      }
    }
    idleCallback(processBatch);
  }

  // Parcourt et transforme les nœuds texte d'un élément racine
  function transformTextNodes(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
          if (node.parentNode && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentNode.nodeName)) return NodeFilter.FILTER_REJECT;
          if (node.parentNode && ['TEXTAREA', 'INPUT', 'SELECT'].includes(node.parentNode.nodeName)) return NodeFilter.FILTER_REJECT;
          if (isInInputOrEditable(node)) return NodeFilter.FILTER_REJECT;
          if (isInsideProcessed(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    const textNodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      textNodes.push(currentNode);
    }
    processTextNodesBatch(textNodes);
  }

  // Récupère le texte lisible : si <article> existe, sinon <body>
  function getReadableText() {
    const articleElement = document.querySelector("article");
    return articleElement ? articleElement.innerText : document.body.innerText;
  }

  // Gère la lecture Play/Pause/Resume
  function toggleReadPlayPause(rate) {
    if (readingState === "stopped") {
      const text = getReadableText();
      if (!text.trim()) {
        console.debug("Aucun texte à lire.");
        return;
      }
      readingUtterance = new SpeechSynthesisUtterance(text);
      readingUtterance.lang = "fr-FR";
      readingUtterance.rate = rate;
      readingState = "playing";
      speechSynthesis.speak(readingUtterance);

      readingUtterance.onend = function() {
        readingState = "stopped";
        console.debug("Lecture terminée.");
      };
      console.debug("Lecture démarrée, rate =", rate);
    }
    else if (readingState === "playing") {
      speechSynthesis.pause();
      readingState = "paused";
      console.debug("Lecture mise en pause.");
    }
    else if (readingState === "paused") {
      speechSynthesis.resume();
      readingState = "playing";
      console.debug("Lecture reprise.");
    }
  }

  // Vérifie si le site courant est dans la blacklist
  function isSiteBlacklisted(blacklistString) {
    if (!blacklistString) return false;
    const blacklist = blacklistString.split(',').map(s => s.trim()).filter(s => s);
    const currentHost = window.location.hostname;
    return blacklist.some(domain => currentHost === domain || currentHost.endsWith("." + domain));
  }

  // Vérifie si la combinaison de touches correspond au raccourci
  function isShortcutPressed(e, shortcut) {
    if (!shortcut) return false;
    const keys = shortcut.toLowerCase().split('+').map(s => s.trim());
    const alt = keys.includes('alt');
    const shift = keys.includes('shift');
    const ctrl = keys.includes('ctrl');
    const meta = keys.includes('meta');
    const nonModifier = keys.find(k => !['alt', 'shift', 'ctrl', 'meta'].includes(k));

    if (e.altKey !== alt) return false;
    if (e.shiftKey !== shift) return false;
    if (e.ctrlKey !== ctrl) return false;
    if (e.metaKey !== meta) return false;
    if (nonModifier && e.key.toLowerCase() !== nonModifier) return false;

    return true;
  }

  // Active/désactive Blody via le raccourci
  document.addEventListener('keydown', function(e) {
    if (isShortcutPressed(e, settings.shortcut)) {
      if (document.documentElement.classList.contains('blody-active')) {
        document.documentElement.classList.remove('blody-active');
        console.debug("Blody désactivé via raccourci.");
      } else {
        document.documentElement.classList.add('blody-active');
        console.debug("Blody activé via raccourci.");
      }
      e.preventDefault();
    }
  });

  // Initialisation
  function initBlody() {
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
      const isActive = (typeof data.blodyActive === 'undefined') ? true : data.blodyActive;
      if (isActive) {
        document.documentElement.classList.add('blody-active');
      } else {
        document.documentElement.classList.remove('blody-active');
      }

      settings.boldCount = parseInt(data.blodyBoldCount) || 1;
      if (settings.boldCount > 4) settings.boldCount = 4;
      settings.colorOption = data.blodyColorOption || "auto";
      settings.customColor = data.blodyCustomColor || "";
      settings.random = data.blodyRandom || false;
      settings.blacklist = data.blodyBlacklist || "";
      settings.shortcut = data.blodyShortcut || "Alt+Shift+B";
      settings.readRate = data.blodyReadRate || 1;

      // Blacklist
      if (isSiteBlacklisted(settings.blacklist)) {
        console.debug("Site en blacklist, Blody n'est pas exécuté sur ce domaine :", window.location.hostname);
        return;
      }

      addBlodyStyle();

      // Si PDF (visionneuse Chrome), on attend la zone textLayer
      if (window.location.pathname.endsWith(".pdf")) {
        const checkPDFLayer = setInterval(function() {
          const textLayer = document.querySelector(".textLayer");
          if (textLayer) {
            clearInterval(checkPDFLayer);
            transformTextNodes(textLayer);
          }
        }, 500);
      } else {
        // Sur page HTML classique
        idleCallback(function() {
          transformTextNodes(document.body);
        });
      }
    });

    // Observe les ajouts de nœuds
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            transformTextNodes(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Écoute des messages
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'toggleBlody') {
      if (message.active) {
        document.documentElement.classList.add('blody-active');
      } else {
        document.documentElement.classList.remove('blody-active');
      }
      sendResponse({ status: 'ok' });
    }
    else if (message.type === 'updateBlodySettings') {
      settings.boldCount = parseInt(message.blodyBoldCount) || 1;
      if (settings.boldCount > 4) settings.boldCount = 4;
      settings.colorOption = message.blodyColorOption || "auto";
      settings.customColor = message.blodyCustomColor || "";
      settings.random = message.blodyRandom || false;
      settings.blacklist = message.blodyBlacklist || "";
      settings.shortcut = message.blodyShortcut || "Alt+Shift+B";
      settings.readRate = message.blodyReadRate || 1;
      addBlodyStyle();
      sendResponse({ status: 'ok' });
    }
    else if (message.type === 'toggleBlodyShortcut') {
      if (document.documentElement.classList.contains('blody-active')) {
        document.documentElement.classList.remove('blody-active');
      } else {
        document.documentElement.classList.add('blody-active');
      }
      sendResponse({ status: 'ok' });
    }
    else if (message.type === 'toggleReadPlayPause') {
      toggleReadPlayPause(message.rate);
      sendResponse({ status: 'ok' });
    }
  });

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initBlody();
  } else {
    document.addEventListener("DOMContentLoaded", initBlody);
  }
})();
