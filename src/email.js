// src/email.js
import emailjs from '@emailjs/browser';

// Replace these with your actual keys from the EmailJS dashboard!
const SERVICE_ID = 'service_3ixsdwk';    
const TEMPLATE_ID = 'template_glp9rof';  // This is the one from your screenshot!
const PUBLIC_KEY = '3LQw31VLjecEmrw0D';    

export async function sendOTPEmail(toEmail, otpCode, playerName) {
  return emailjs.send(SERVICE_ID, TEMPLATE_ID, {
    to_email: toEmail,
    player_name: playerName,
    otp_code: otpCode,
  }, PUBLIC_KEY);
}