/** Every demo account (see GLOSSARY.md) has an email at this domain; the seed creates them. */
export const DEMO_EMAIL_DOMAIN = 'demo.volunteerhub.test';

/** The account one-click demo login signs in as, per role. There is no demo admin. */
export const DEMO_LOGIN_EMAILS = {
  volunteer: `demo-dan@${DEMO_EMAIL_DOMAIN}`,
  manager: `demo-ava@${DEMO_EMAIL_DOMAIN}`,
} as const;
export type DemoRole = keyof typeof DEMO_LOGIN_EMAILS;

export const isDemoAccount = (email: string) => email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
