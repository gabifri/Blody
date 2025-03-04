(function() {
  console.debug("Blody extension : content script chargé.");

  // Ajoute le style nécessaire pour que la classe "blody-bold" rende le texte en gras
  function addBlodyStyle() {
    if (!document.getElementById('blody-style')) {
      const style = document.createElement('style');
      style.id = 'blody-style';
      style.innerHTML = ".blody-active .blody-bold { font-weight: bold; }";
      document.head.appendChild(style);
      console.debug("Style Blody ajouté.");
    }
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

  // Transformation d'un nœud texte en enveloppant la première lettre de chaque mot,
  // et en marquant le conteneur pour éviter un retraitement ultérieur.
  function processTextNode(node) {
    // On évite de traiter les nœuds dans les balises sensibles
    if (node.parentNode && ['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT'].includes(node.parentNode.nodeName)) {
      return;
    }
    // Si le nœud est déjà dans un conteneur traité, on ne le retraitera pas
    if (isInsideProcessed(node)) {
      console.debug("Nœud déjà traité, on saute :", node.textContent.slice(0, 30));
      return;
    }
    const text = node.textContent;
    if (!text || !text.trim()) return;
    
    console.debug("Traitement d'un nœud texte :", text.slice(0, 30) + "...");
    
    // Création d'un conteneur qui sera marqué comme traité
    const container = document.createElement('span');
    container.setAttribute('data-blody-processed', 'true');
    
    // Découpe le texte en mots et espaces
    const parts = text.split(/(\s+)/);
    parts.forEach(part => {
      if (part && !/^\s+$/.test(part)) {
        const wordSpan = document.createElement('span');
        // Premier caractère dans un span dédié
        const firstCharSpan = document.createElement('span');
        firstCharSpan.className = 'blody-bold';
        firstCharSpan.textContent = part.charAt(0);
        wordSpan.appendChild(firstCharSpan);
        // Ajoute le reste du mot s'il existe
        if (part.length > 1) {
          wordSpan.appendChild(document.createTextNode(part.slice(1)));
        }
        container.appendChild(wordSpan);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    });
    node.parentNode.replaceChild(container, node);
    console.debug("Nœud texte transformé.");
  }

  // Utilise requestIdleCallback (ou fallback) pour exécuter les tâches en batch
  function idleCallback(callback) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback);
    } else {
      setTimeout(callback, 50);
    }
  }

  // Traite les nœuds texte en petits lots pour limiter l'impact sur le fil principal
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

  // Parcourt et transforme les nœuds texte d'un élément racine en s'assurant qu'ils ne sont pas déjà traités
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
    addBlodyStyle();

    // Applique la classe active selon l'état enregistré (activé par défaut)
    chrome.storage.sync.get('blodyActive', function(data) {
      const isActive = (typeof data.blodyActive === 'undefined') ? true : data.blodyActive;
      if (isActive) {
        document.documentElement.classList.add('blody-active');
        console.debug("Blody est activé.");
      } else {
        document.documentElement.classList.remove('blody-active');
        console.debug("Blody est désactivé.");
      }
    });

    // Transformation initiale différée de document.body
    idleCallback(function() {
      console.debug("Transformation initiale du document.body.");
      transformTextNodes(document.body);
    });

    // Mise en place du MutationObserver avec debounce
    const observer = new MutationObserver(debouncedMutationObserver);
    observer.observe(document.body, { childList: true, subtree: true });
    console.debug("MutationObserver mis en place.");
  }

  // Écoute les messages pour basculer l'état de l'extension
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
  });

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initBlody();
  } else {
    document.addEventListener("DOMContentLoaded", initBlody);
  }
})();
