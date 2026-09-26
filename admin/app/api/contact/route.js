import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Allow preflight requests from the main website (needed in production)
export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "*";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, subject, message, recipient } = body;
    const selectedRecipient = recipient || "Abhivriddhi Team (abhivriddhi@vit.edu)";

    // ── Server-side validation ──────────────────────────────────────────────
    const errors = {};
    if (!name?.trim())    errors.name    = "Name is required";
    if (!email?.trim())   errors.email   = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = "Invalid email address";
    if (!subject?.trim()) errors.subject = "Subject is required";
    if (!message?.trim()) errors.message = "Message is required";

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    // ── Check if valid SMTP credentials are configured ─────────────────────
    const isPlaceholder =
      !process.env.EMAIL ||
      process.env.EMAIL === "your_email@gmail.com" ||
      !process.env.EMAIL_PASSWORD ||
      process.env.EMAIL_PASSWORD === "your_app_password_here";

    const recipientEmail = process.env.CONTACT_RECIPIENT_EMAIL || process.env.EMAIL || "abhivriddhi@vit.edu";

    if (isPlaceholder) {
      console.log("\n=======================================================");
      console.log("📨 [CONTACT FORM RECEIVED - DEV MODE]");
      console.log("To Person: ", selectedRecipient);
      console.log("To Email:  ", recipientEmail);
      console.log("From:      ", `${name} <${email}>`);
      console.log("Subject:   ", subject);
      console.log("Message:\n", message);
      console.log("ℹ️ To send real emails via Gmail, update EMAIL and EMAIL_PASSWORD in admin/.env");
      console.log("=======================================================\n");

      return NextResponse.json(
        {
          success: true,
          recipient: selectedRecipient,
          message: `Message sent to ${selectedRecipient}! (Logged to console - configure admin/.env for real email delivery)`,
          devMode: true,
        },
        {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
          },
        }
      );
    }

    // ── Nodemailer transporter (same Gmail creds used by send-tickets) ──────
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // ── Email to the Abhivriddhi team ───────────────────────────────────────
    await transporter.sendMail({
      from: `"Abhivriddhi Contact Form" <${process.env.EMAIL}>`,
      to: recipientEmail,
      replyTo: email,
      subject: `[Contact Form] ${subject} (Attn: ${selectedRecipient})`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0a0d0f 0%, #111418 100%); padding: 32px 36px; border-bottom: 1px solid rgba(184,204,138,0.2);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: #b8cc8a;"></div>
              <span style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #b8cc8a;">New Message</span>
            </div>
            <h1 style="font-size: 26px; font-weight: 300; margin: 0; color: #ffffff;">Contact Form Submission</h1>
          </div>

          <!-- Body -->
          <div style="padding: 32px 36px; background: #0f1115;">
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.45); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; width: 110px;">Recipient</td>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #b8cc8a; font-size: 15px; font-weight: 600;">${escapeHtml(selectedRecipient)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.45); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">Name</td>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #ffffff; font-size: 15px;">${escapeHtml(name)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: rgba(255,255,255,0.45); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); color: #b8cc8a; font-size: 15px;">
                  <a href="mailto:${escapeHtml(email)}" style="color: #b8cc8a; text-decoration: none;">${escapeHtml(email)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: rgba(255,255,255,0.45); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase;">Subject</td>
                <td style="padding: 10px 0; color: #ffffff; font-size: 15px;">${escapeHtml(subject)}</td>
              </tr>
            </table>

            <div style="margin-top: 4px;">
              <div style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 12px;">Message</div>
              <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 20px 22px; font-size: 14px; line-height: 1.8; color: rgba(255,255,255,0.85); white-space: pre-wrap;">${escapeHtml(message)}</div>
            </div>

          </div>

          <!-- Footer -->
          <div style="padding: 20px 36px; background: #0a0d0f; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
            <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.3);">
              Sent via Abhivriddhi Contact Form — directed to ${escapeHtml(selectedRecipient)}.
            </p>
          </div>

        </div>
      `,
    });

    // ── Auto-reply to the sender ────────────────────────────────────────────
    await transporter.sendMail({
      from: `"Abhivriddhi" <${process.env.EMAIL}>`,
      to: email,
      subject: `We received your message for ${selectedRecipient} — Abhivriddhi`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <div style="background: linear-gradient(135deg, #0a0d0f 0%, #111418 100%); padding: 32px 36px; border-bottom: 1px solid rgba(184,204,138,0.2);">
            <h1 style="font-size: 24px; font-weight: 300; margin: 0; color: #ffffff;">Thank <em style="color: #b8cc8a; font-style: italic;">you</em>, ${escapeHtml(name)}</h1>
          </div>

          <div style="padding: 32px 36px; background: #0f1115;">
            <p style="font-size: 14px; line-height: 1.8; color: rgba(255,255,255,0.75); margin: 0 0 16px 0;">
              Your message for <strong style="color: #b8cc8a;">${escapeHtml(selectedRecipient)}</strong> has been received. Our team will get back to you within <strong style="color: #b8cc8a;">24 hours</strong> on working days.
            </p>
            <p style="font-size: 14px; line-height: 1.8; color: rgba(255,255,255,0.75); margin: 0;">
              For urgent matters, feel free to reach out directly to our team at 
              <a href="tel:+919579654986" style="color: #b8cc8a; text-decoration: none;">+91 95796 54986</a>.
            </p>
          </div>

          <div style="padding: 20px 36px; background: #0a0d0f; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
            <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.3);">
              Abhivriddhi — Vishwakarma Institute of Technology, Pune
            </p>
          </div>

        </div>
      `,
    });

    return NextResponse.json(
      { success: true, message: "Your message has been sent successfully." },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
        },
      }
    );

  } catch (error) {
    console.error("[contact/route] Error:", error);

    let clientMessage = "Failed to send message. Please try again later.";
    if (error.code === "EAUTH") {
      clientMessage = "Email authentication failed. Please verify EMAIL and EMAIL_PASSWORD in admin/.env (use a 16-character Google App Password).";
    }

    return NextResponse.json(
      { error: clientMessage },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
        },
      }
    );
  }
}

// ── Utility ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
