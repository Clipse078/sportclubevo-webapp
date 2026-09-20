import { describe, expect, it } from "vitest";
import { renderNotificationEmailHtml, renderNotificationEmailText } from "../email/template";

describe("notification email template", () => {
  it("escapes user-controlled HTML in html output", () => {
    const html = renderNotificationEmailHtml({
      tenantName: 'Evil <script>alert(1)</script>',
      platformName: "SportClubEvo",
      notificationTitle: 'Task "A" & B',
      body: "<img onerror=alert(1)>",
      ctaLabel: "Open",
      ctaUrl: "https://app.example.com/dashboard/aufgaben/t1",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
  });

  it("keeps plain-text rendering readable", () => {
    const text = renderNotificationEmailText({
      tenantName: "Club",
      platformName: "SportClubEvo",
      notificationTitle: "Title",
      body: "Line",
      ctaLabel: "Open",
      ctaUrl: "https://app.example.com/x",
    });
    expect(text).toContain("Title");
    expect(text).toContain("Open: https://app.example.com/x");
  });
});
