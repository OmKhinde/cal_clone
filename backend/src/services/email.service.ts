import { formatInTimeZone } from "date-fns-tz";
import { Resend } from "resend";
import { z } from "zod";
import { env } from "../config/env.js";

const emailAddressSchema = z.string().trim().email().max(255);

type BookingConfirmationEmailInput = {
  bookingId: number;
  bookingUid: string;
  attendeeName: string;
  attendeeEmail: string;
  eventName: string;
  startTimeIso: string;
  endTimeIso: string;
  timezone: string;
  location: string | null;
  meetingUrl: string | null;
  manageUrl: string | null;
  supportEmail: string;
  brandName: string;
};

type SendEmailResult =
  | { status: "sent"; messageId?: string | null }
  | { status: "skipped"; reason: string };

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateRange(startIso: string, endIso: string, timezone: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  return {
    date: formatInTimeZone(start, timezone, "EEEE, MMMM d, yyyy"),
    time: `${formatInTimeZone(start, timezone, "hh:mm a")} - ${formatInTimeZone(end, timezone, "hh:mm a")} (${timezone})`
  };
}

function detailRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding: 0 0 12px; color: #5d6b82; font-size: 14px; width: 132px; vertical-align: top;">${escapeHtml(label)}</td>
      <td style="padding: 0 0 12px; color: #132238; font-size: 14px; font-weight: 600;">${escapeHtml(value)}</td>
    </tr>
  `;
}

function buildBookingConfirmationHtml(input: BookingConfirmationEmailInput) {
  const { date, time } = formatDateRange(input.startTimeIso, input.endTimeIso, input.timezone);
  const locationText = input.meetingUrl ?? input.location ?? "To be shared separately";
  const safeBrand = escapeHtml(input.brandName);
  const safeSupportEmail = escapeHtml(input.supportEmail);
  const manageButton = input.manageUrl
    ? `
      <tr>
        <td style="padding-top: 8px;">
          <a
            href="${escapeHtml(input.manageUrl)}"
            style="display: inline-block; padding: 12px 18px; border-radius: 14px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px;"
          >
            Manage booking
          </a>
        </td>
      </tr>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Booking Confirmation</title>
      </head>
      <body style="margin: 0; padding: 24px 12px; background: #edf3fb; font-family: Manrope, 'Segoe UI', Arial, sans-serif; color: #132238;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto;">
          <tr>
            <td style="padding-bottom: 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius: 30px; overflow: hidden; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%); box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);">
                <tr>
                  <td style="padding: 28px 32px;">
                    <div style="display: inline-block; padding: 10px 14px; border-radius: 999px; background: rgba(255,255,255,0.12); color: #dbeafe; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;">
                      ${safeBrand}
                    </div>
                    <h1 style="margin: 18px 0 0; color: #ffffff; font-size: 30px; line-height: 1.15;">
                      Booking confirmed
                    </h1>
                    <p style="margin: 12px 0 0; color: rgba(255,255,255,0.78); font-size: 15px; line-height: 1.65;">
                      Hi ${escapeHtml(input.attendeeName)}, your booking for ${escapeHtml(input.eventName)} is on the calendar.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius: 30px; background: rgba(255,255,255,0.92); border: 1px solid rgba(148, 163, 184, 0.24); box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);">
                <tr>
                  <td style="padding: 30px 32px;">
                    <p style="margin: 0 0 18px; color: #132238; font-size: 18px; font-weight: 700;">Booking details</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${detailRow("Name", input.attendeeName)}
                      ${detailRow("Event", input.eventName)}
                      ${detailRow("Date", date)}
                      ${detailRow("Time", time)}
                      ${detailRow("Booking ID", `${input.bookingId} (${input.bookingUid})`)}
                      ${detailRow("Location", locationText)}
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${manageButton}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 8px 0; color: #5d6b82; font-size: 13px; line-height: 1.7; text-align: center;">
              Need help with your booking? Contact <a href="mailto:${safeSupportEmail}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${safeSupportEmail}</a>.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildBookingConfirmationText(input: BookingConfirmationEmailInput) {
  const { date, time } = formatDateRange(input.startTimeIso, input.endTimeIso, input.timezone);

  return [
    `Hi ${input.attendeeName},`,
    "",
    `Your booking for ${input.eventName} is confirmed.`,
    "",
    `Date: ${date}`,
    `Time: ${time}`,
    `Booking ID: ${input.bookingId} (${input.bookingUid})`,
    `Location: ${input.meetingUrl ?? input.location ?? "To be shared separately"}`,
    ...(input.manageUrl ? [`Manage booking: ${input.manageUrl}`] : []),
    "",
    `Need help? Contact ${input.supportEmail}.`
  ].join("\n");
}

export async function sendBookingConfirmationEmail(
  input: BookingConfirmationEmailInput
): Promise<SendEmailResult> {
  if (!resend) {
    return { status: "skipped", reason: "RESEND_API_KEY is not configured." };
  }

  if (!env.RESEND_FROM_EMAIL) {
    return { status: "skipped", reason: "RESEND_FROM_EMAIL is not configured." };
  }

  const attendeeEmail = emailAddressSchema.safeParse(input.attendeeEmail);
  const fromEmail = emailAddressSchema.safeParse(env.RESEND_FROM_EMAIL);

  if (!attendeeEmail.success) {
    return { status: "skipped", reason: "Recipient email is invalid." };
  }

  if (!fromEmail.success) {
    return { status: "skipped", reason: "Configured sender email is invalid." };
  }

  const response = await resend.emails.send({
    from: fromEmail.data,
    to: attendeeEmail.data,
    subject: `Booking Confirmation - ${input.eventName}`,
    html: buildBookingConfirmationHtml(input),
    text: buildBookingConfirmationText(input),
    replyTo: input.supportEmail
  });

  return { status: "sent", messageId: response.data?.id ?? null };
}
