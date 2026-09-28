import type { Email } from './email.service.js';

type Content = Omit<Email, 'to'>;

export function invitationEmail(fullName: string, link: string): Content {
  return linkEmail({
    subject: 'Votre invitation à eFactura',
    greeting: `Bonjour ${fullName},`,
    body: 'Vous êtes invité à rejoindre l’équipe sur eFactura. Choisissez votre mot de passe pour activer votre compte.',
    button: 'Choisir mon mot de passe',
    expiry: 'Ce lien est valable 7 jours et ne fonctionne qu’une fois.',
    link,
  });
}

export function passwordResetEmail(fullName: string, link: string): Content {
  return linkEmail({
    subject: 'Réinitialisation de votre mot de passe eFactura',
    greeting: `Bonjour ${fullName},`,
    body: 'Une réinitialisation de votre mot de passe a été demandée. Si ce n’est pas vous, ignorez cet email.',
    button: 'Choisir un nouveau mot de passe',
    expiry: 'Ce lien est valable 1 heure et ne fonctionne qu’une fois.',
    link,
  });
}

interface LinkEmail {
  subject: string;
  greeting: string;
  body: string;
  button: string;
  expiry: string;
  link: string;
}

function linkEmail(email: LinkEmail): Content {
  const text = [
    email.greeting,
    email.body,
    `${email.button} : ${email.link}`,
    email.expiry,
  ].join('\n\n');

  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#f5f5f4;font-family:Arial,sans-serif;color:#1c1917">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <p>${escape(email.greeting)}</p>
    <p>${escape(email.body)}</p>
    <p style="margin:28px 0">
      <a href="${escape(email.link)}" style="background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${escape(email.button)}</a>
    </p>
    <p style="font-size:13px;color:#57534e">${escape(email.expiry)}</p>
    <p style="font-size:12px;color:#78716c;word-break:break-all">${escape(email.link)}</p>
  </div>
</body>
</html>`;

  return { subject: email.subject, text, html };
}

// Names are typed by people: never trusted as HTML
function escape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
