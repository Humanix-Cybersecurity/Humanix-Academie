/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Add-on Gmail Humanix - bouton « Signaler un phishing » (parité Outlook).
 *
 * Tourne dans Google Apps Script (côté Google) : UrlFetchApp envoie le
 * signalement à l'endpoint Humanix POST /api/phishing/report, EXACTEMENT le
 * même que le plugin Outlook (auth par email pro, minimisation RGPD).
 * Aucun appel IA côté add-on : zéro coût token.
 *
 * Déploiement : voir README.md de ce dossier.
 */

// === CONFIG ===
// Domaine de votre instance Humanix. À adapter en self-host (Scaleway/OVH/on-prem).
var HUMANIX_BASE_URL = "https://humanix-cybersecurity.fr";
var REPORT_ENDPOINT = HUMANIX_BASE_URL + "/api/phishing/report";
var ICON_URL = HUMANIX_BASE_URL + "/outlook/icon-64.png";

/**
 * Carte d'accueil (add-on ouvert hors d'un message).
 */
function onHomepage() {
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("Humanix")
        .setSubtitle("Signaler un phishing"),
    )
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText(
          "Ouvrez un email suspect, puis cliquez sur « Signaler comme " +
            "phishing ». Le message est transmis à votre équipe sécurité et " +
            "vous gagnez des points sur Humanix.",
        ),
      ),
    )
    .build();
}

/**
 * Carte contextuelle affichée à l'ouverture d'un message Gmail.
 */
function onGmailMessageOpen(e) {
  var section = CardService.newCardSection();

  // On lit les métadonnées du message courant (accès délégué au message ouvert).
  var meta = getMessageMeta_(e);
  if (meta) {
    section.addWidget(
      CardService.newDecoratedText()
        .setTopLabel("Expéditeur")
        .setText(meta.fromDisplayName || meta.from || "(inconnu)"),
    );
    section.addWidget(
      CardService.newDecoratedText()
        .setTopLabel("Objet")
        .setText(meta.subject || "(sans objet)")
        .setWrapText(true),
    );
  }

  section.addWidget(
    CardService.newTextParagraph().setText(
      "Ce mail vous semble suspect ? Signalez-le en 1 clic. Seules les " +
        "métadonnées (expéditeur, objet, longueur) sont transmises.",
    ),
  );

  var reportAction = CardService.newAction().setFunctionName("reportPhishing");
  section.addWidget(
    CardService.newTextButton()
      .setText("🚨 Signaler comme phishing")
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(reportAction),
  );

  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("Humanix")
        .setImageUrl(ICON_URL)
        .setSubtitle("Signaler un phishing"),
    )
    .addSection(section)
    .build();
}

/**
 * Lit les métadonnées du message courant via le token d'accès délégué.
 * Scope : gmail.addons.current.message.metadata (pas le corps complet).
 */
function getMessageMeta_(e) {
  try {
    var accessToken = e.gmail.accessToken;
    GmailApp.setCurrentMessageAccessToken(accessToken);
    var message = GmailApp.getMessageById(e.gmail.messageId);
    var rawFrom = message.getFrom() || ""; // "Nom <email@x.fr>"
    var parsed = parseFrom_(rawFrom);
    return {
      from: parsed.email,
      fromDisplayName: parsed.display,
      subject: message.getSubject() || "",
      messageId: e.gmail.messageId,
      date: message.getDate(),
    };
  } catch (err) {
    return null;
  }
}

/**
 * Action du bouton : envoie le signalement à Humanix.
 */
function reportPhishing(e) {
  var meta = getMessageMeta_(e);
  var userEmail = Session.getActiveUser().getEmail();

  if (!userEmail) {
    return notify_("Impossible de lire votre adresse Gmail. Réessayez.");
  }

  var payload = {
    userEmail: userEmail,
    from: meta ? meta.from : null,
    fromDisplayName: meta ? meta.fromDisplayName : null,
    subject: meta ? meta.subject : "(sans objet)",
    receivedAt: meta && meta.date ? meta.date.toISOString() : null,
    internetMessageId: meta ? meta.messageId : null,
    bodyExcerpt: "",
    source: "gmail-addon",
  };

  try {
    var resp = UrlFetchApp.fetch(REPORT_ENDPOINT, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    var code = resp.getResponseCode();
    if (code === 200) {
      var json = JSON.parse(resp.getContentText() || "{}");
      return notify_(json.message || "Merci ! Signalement enregistré.");
    }
    if (code === 403) {
      return notify_(
        "Votre adresse (" +
          userEmail +
          ") n'est pas reconnue sur Humanix. Contactez votre admin.",
      );
    }
    if (code === 429) {
      return notify_("Trop de signalements. Réessayez dans 1 heure.");
    }
    return notify_("Erreur lors de l'envoi (code " + code + "). Réessayez.");
  } catch (err) {
    return notify_("Réseau indisponible. Réessayez plus tard.");
  }
}

/** Notification éphémère dans Gmail. */
function notify_(text) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(text))
    .build();
}

/** Découpe "Nom <email@x.fr>" -> { display, email }. */
function parseFrom_(raw) {
  var m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) {
    return { display: (m[1] || "").trim() || null, email: m[2].trim() };
  }
  // Pas de display name : "email@x.fr" seul.
  return { display: null, email: raw.trim() || null };
}
