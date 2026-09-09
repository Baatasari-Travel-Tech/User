// Predefined mailto: URLs for the various support channels. Each entry
// renders to a link the user can click in their browser — opens their
// mail client with subject + body pre-populated so they don't have to
// retype context every time.
//
// IMPORTANT: keep bodies plain text. mailto links can't carry HTML or
// rich formatting; every mail client treats the `body` param as plain
// text. Newlines via "\n".

const SUPPORT_EMAIL = "contact-us@baatasari.com";

const buildMailto = (subject: string, body?: string): string => {
  const params = new URLSearchParams();
  params.set("subject", subject);
  if (body) params.set("body", body);
  // URLSearchParams encodes spaces as `+`, which most mail clients DO
  // accept in subject, but a few (older Outlook, some webmail) interpret
  // literally. Switch back to %20 to be safe — RFC-correct anyway.
  return `mailto:${SUPPORT_EMAIL}?${params.toString().replace(/\+/g, "%20")}`;
};

const joinLines = (lines: string[]): string => lines.join("\n");

// Each entry returns a fresh string so callers can compose with extra
// context if needed (e.g. injecting an order ID into the body before
// rendering). For static use, just call the function inline.
export const supportMailto = {
  retrieveAccount: () =>
    buildMailto(
      "Retrieve my deleted account",
      joinLines([
        "Hi Baatasari support team,",
        "",
        "I'd like to retrieve my account which is pending deletion.",
        "",
        "Registered email: ",
        "Reason for retrieval: ",
        "",
        "Please restore my account at the earliest. Thanks!",
      ]),
    ),

  paymentIssue: () =>
    buildMailto(
      "Payment issue",
      joinLines([
        "Hi Baatasari support team,",
        "",
        "I'm facing a payment issue. Details below:",
        "",
        "Order ID: ",
        "Event name: ",
        "What happened: ",
        "Transaction reference (if available): ",
        "",
        "Thanks.",
      ]),
    ),

  organizerOnboarding: () =>
    buildMailto(
      "Organizer onboarding help",
      joinLines([
        "Hi Baatasari support team,",
        "",
        "I'm trying to onboard as an organizer and need help with:",
        "",
        "Step / form field: ",
        "What's happening: ",
        "",
        "Thanks.",
      ]),
    ),

  organizerReviewAppeal: (context?: { reason?: string; note?: string }) =>
    buildMailto(
      "Organizer application — review question",
      joinLines([
        "Hi Baatasari support team,",
        "",
        "My organizer application was rejected / changes were requested, and I'd like to understand more or appeal the decision.",
        "",
        `Reason given: ${context?.reason ?? ""}`,
        `Note from the team: ${context?.note ?? ""}`,
        "",
        "My question / appeal: ",
        "",
        "Thanks.",
      ]),
    ),

  ticketHelp: () =>
    buildMailto(
      "Ticket / event help",
      joinLines([
        "Hi Baatasari support team,",
        "",
        "I need help with a ticket or event:",
        "",
        "Order ID (if applicable): ",
        "Event name: ",
        "Issue: ",
        "",
        "Thanks.",
      ]),
    ),

  generalHelp: () =>
    buildMailto(
      "Help — Baatasari",
      joinLines([
        "Hi Baatasari support team,",
        "",
        "I need help with: ",
        "",
        "Thanks.",
      ]),
    ),
};

export const SUPPORT_EMAIL_ADDRESS = SUPPORT_EMAIL;
