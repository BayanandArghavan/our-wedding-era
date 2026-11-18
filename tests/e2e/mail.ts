const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/** Waits for the newest email to `to` whose subject matches, and returns the first link matching `linkPattern`. */
export async function linkFromEmail(to: string, subject: RegExp, linkPattern: RegExp, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const body = (await res.json()) as { messages: { ID: string; Subject: string }[] };
    const msg = body.messages.find((m) => subject.test(m.Subject));
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { HTML: string };
      const hrefs = [...full.HTML.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
      const link = hrefs.find((h) => linkPattern.test(h));
      if (link) return link;
      throw new Error(`Email found but no matching link. Links: ${hrefs.join(", ")}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${to} matching ${subject}`);
}
