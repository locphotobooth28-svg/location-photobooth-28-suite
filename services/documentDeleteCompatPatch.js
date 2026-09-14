// LP28 - Compatibilite suppression documents Drive
// Certains anciens documents peuvent rester affiches dans une modale ouverte
// alors qu'ils ont deja ete deplaces/supprimes de Drive. La suppression doit
// rester idempotente : si le fichier n'existe plus dans le dossier de
// l'evenement, on considere l'operation comme terminee afin que l'interface
// puisse se recharger proprement.

const googleService = require("./googleService");

const originalDeleteEventDocument = googleService.deleteEventDocument;

if (typeof originalDeleteEventDocument === "function") {
  googleService.deleteEventDocument = async function patchedDeleteEventDocument(req, eventId, fileId) {
    try {
      return await originalDeleteEventDocument(req, eventId, fileId);
    } catch (err) {
      const message = String(err?.message || "");

      if (/document introuvable/i.test(message)) {
        console.warn(
          "LP28 documents : suppression d'un lien deja absent de Drive, nettoyage de l'interface :",
          { eventId, fileId }
        );

        return {
          ok: true,
          id: fileId,
          alreadyMissing: true
        };
      }

      throw err;
    }
  };
}

module.exports = googleService;
