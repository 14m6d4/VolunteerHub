/** Every demo account (see GLOSSARY.md) has an email at this domain; the seed creates them. */
export const DEMO_EMAIL_DOMAIN = 'demo.volunteerhub.test';

export const isDemoAccount = (email: string) => email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
