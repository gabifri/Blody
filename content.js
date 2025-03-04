(function() {
  console.debug("Blody extension : content script chargé.");

  // Variable globale pour stocker les réglages
  let settings = {
    boldCount: 1,
    colorOption: "auto",
    customColor: "",
    random: false
  };

  // Ajoute (ou met à jour) le style pour les lettres en gras en fonction des réglages
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

  // Vérifie si un nœud est déjà contenu dans un élément traité
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

  // Transformation d'un nœud texte :
  // Pour chaque mot, on met en gras les premières lettres.
  // Si l'option aléatoire est activée, le nombre de lettres à mettre en gras sera choisi aléatoirement entre 1 et le nombre maximum.
  // Si le mot est trop court, seule la première lettre sera en gras.
  function processTextNode(node) {
    if (node.parentNode && ['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT'].includes(node.parentNode.nodeName)) {
      return;
    }
    if (isInsideProcessed(node)) {
      console.debug("Nœud déjà traité, on saute :", node.textContent.slice(0, 30));
      return;
    }
    const text = node.textContent;
    if (!text || !text.trim()) return;
    
    console.debug("Traitement d'un nœud texte :", text.slice(0, 30) + "...");
    
    // Création d'un conteneur marqué comme traité
    const container = document.createElement('span');
    container.setAttribute('data-blody-processed', 'true');
    
    // Découper le texte en mots et espaces
    const parts = text.split(/(\s+)/);
    parts.forEach(part => {
      if (part && !/^\s+$/.test(part)) {
        const wordSpan = document.createElement('span');
        // Détermine le nombre de lettres à mettre en gras
        let count = settings.boldCount;
        if (settings.random) {
          count = Math.floor(Math.random() * settings.boldCount) + 1;
        }
        // Si le mot est trop court, on ne met en gras que la première lettre
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
        container.appendChild(document.createTextNode(part));
      }
    });
    node.parentNode.replaceChild(container, node);
    console.debug("Nœud texte transformé.");
  }

  // Utilise requestIdleCallback (ou fallback) pour traiter les tâches en batch
  function idleCallback(callback) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback);
    } else {
      setTimeout(callback, 50);
    }
  }

  // Traite les nœuds texte par lots pour limiter l'impact sur le fil principal
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
    console.debug("Transformation des nœuds textuels dans :", root);
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_REJECT;
          if (node.parentNode && ['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT'].includes(node.parentNode.nodeName)) return NodeFilter.FILTER_REJECT;
          if (isInsideProcessed(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let textNodes = [];
    let currentNode;
    while (currentNode = walker.nextNode()) {
      textNodes.push(currentNode);
    }
    console.debug("Nombre de nœuds texte trouvés :", textNodes.length);
    processTextNodesBatch(textNodes, function() {
      console.debug("Traitement en batch des nœuds texte terminé.");
    });
  }

  // Debounce pour regrouper les mutations du DOM
  let mutationQueue = [];
  let mutationTimeout;
  function processMutationQueue() {
    console.debug("Traitement des mutations, nombre d'éléments :", mutationQueue.length);
    let queue = mutationQueue.slice();
    mutationQueue = [];
    queue.forEach(function(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        processTextNode(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        transformTextNodes(node);
      }
    });
  }
  function debouncedMutationObserver(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        mutationQueue.push(node);
      });
    });
    if (mutationTimeout) clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(processMutationQueue, 100);
  }

  // Initialisation de l'extension
  function initBlody() {
    console.debug("Initialisation de Blody.");
    chrome.storage.sync.get(['blodyActive','blodyBoldCount','blodyColorOption','blodyCustomColor','blodyRandom'], function(data) {
      const isActive = (typeof data.blodyActive === 'undefined') ? true : data.blodyActive;
      if (isActive) {
        document.documentElement.classList.add('blody-active');
        console.debug("Blody est activé.");
      } else {
        document.documentElement.classList.remove('blody-active');
        console.debug("Blody est désactivé.");
      }
      settings.boldCount = parseInt(data.blodyBoldCount) || 1;
      if (settings.boldCount > 4) settings.boldCount = 4;
      settings.colorOption = data.blodyColorOption || "auto";
      settings.customColor = data.blodyCustomColor || "";
      settings.random = data.blodyRandom || false;
      addBlodyStyle();
      idleCallback(function() {
        console.debug("Transformation initiale du document.body.");
        transformTextNodes(document.body);
      });
    });

    const observer = new MutationObserver(debouncedMutationObserver);
    observer.observe(document.body, { childList: true, subtree: true });
    console.debug("MutationObserver mis en place.");
  }

  // Écoute des messages pour basculer l'état et mettre à jour les réglages
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'toggleBlody') {
      if (message.active) {
        document.documentElement.classList.add('blody-active');
        console.debug("Message reçu : activation de Blody.");
      } else {
        document.documentElement.classList.remove('blody-active');
        console.debug("Message reçu : désactivation de Blody.");
      }
      sendResponse({ status: 'ok' });
    }
    if (message.type === 'updateBlodySettings') {
      settings.boldCount = parseInt(message.blodyBoldCount) || 1;
      if (settings.boldCount > 4) settings.boldCount = 4;
      settings.colorOption = message.blodyColorOption || "auto";
      settings.customColor = message.blodyCustomColor || "";
      settings.random = message.blodyRandom || false;
      console.debug("Mise à jour des paramètres reçus :", settings);
      addBlodyStyle();
      sendResponse({ status: 'ok' });
    }
  });

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initBlody();
  } else {
    document.addEventListener("DOMContentLoaded", initBlody);
  }
})();
