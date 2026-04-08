// ============================================================
//  src/email.js
//  Easy Express – Thesis Project
// ============================================================
//  Uses EmailJS to send transactional emails.
//
//  EMAILJS DASHBOARD SETUP:
//    You need two Email Templates. Go to emailjs.com → Email Templates:
//
//  Template 1 (OTP / Registration): template_glp9rof  ← existing
//    Variables used:
//      {{to_email}}    — recipient
//      {{player_name}} — username
//      {{otp_code}}    — 6-digit code
//
//  Template 2 (Forgot Password): template_forgotpw
//    Template ID: template_forgotpw
//    Subject: "Easy Express — Password Reset Request"
//    Body example:
//      Hi {{player_name}},
//      Someone requested a password reset for your Easy Express account.
//      Use this code to reset your password: {{otp_code}}
//      This code expires in 10 minutes.
//      If you didn't request this, ignore this email.
//    Variables: {{to_email}}, {{player_name}}, {{otp_code}}
// ============================================================

import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_3ixsdwk';
const PUBLIC_KEY = '3LQw31VLjecEmrw0D';

// Template IDs
const TEMPLATE_OTP        = 'template_glp9rof';  // Registration OTP — existing
const TEMPLATE_FORGOT_PW  = 'template_glp9rof'; // Reuses the same OTP template

// ─────────────────────────────────────────────────────────────────────────────
//  REGISTRATION OTP
//  Sends a 6-digit verification code after a user registers.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a registration OTP to the user's email.
 * @param {string} toEmail - Recipient email address.
 * @param {string} otpCode - 6-digit numeric code.
 * @param {string} playerName - Username to personalise the email.
 */
export async function sendOTPEmail(toEmail, otpCode, playerName) {
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_OTP,
    {
      to_email:    toEmail,
      player_name: playerName,
      otp_code:    otpCode,
    },
    PUBLIC_KEY
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FORGOT PASSWORD — CUSTOM OTP EMAIL
//  Sends the 6-digit OTP for the custom forgot-password flow.
//  Called by ForgotPasswordModal after CloudScript generates the code.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a forgot-password OTP to the user's email.
 * @param {string} toEmail - Recipient email address.
 * @param {string} otpCode - 6-digit numeric code from CloudScript.
 * @param {string} playerName - Username for personalisation.
 */
export async function sendForgotPasswordOTP(toEmail, otpCode, playerName) {
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_FORGOT_PW,
    {
      to_email:    toEmail,
      player_name: playerName || "Player",
      otp_code:    otpCode,
    },
    PUBLIC_KEY
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FORGOT PASSWORD — SUPPLEMENTARY NOTIFICATION (LEGACY)
//  Kept for backwards compatibility. No longer called by the new modal.
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPasswordResetNotification(toEmail, playerName) {
  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_FORGOT_PW,
    {
      to_email:    toEmail,
      player_name: playerName || "Player",
      otp_code:    "Check the link in the PlayFab email below.",
    },
    PUBLIC_KEY
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITY: CLIENT-SIDE OTP GENERATOR
//  Generates a cryptographically random 6-digit code.
//  Store this in React state; don't send it to your server
//  until the user submits (or let CloudScript generate it).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a secure 6-digit OTP code.
 * Use crypto.getRandomValues for security — never Math.random().
 * @returns {string} e.g. "482901"
 */
export function generateOTPCode() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}