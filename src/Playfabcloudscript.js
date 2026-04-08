// ============================================================
//  PlayFab CloudScript — Easy Express
// ============================================================
//  HOW TO DEPLOY:
//    1. Go to PlayFab Game Manager → your title → Automation
//    2. Click "Cloud Script (Legacy)" in the left sidebar
//    3. Paste this ENTIRE file into the editor
//    4. Click "Save as revision"
//    5. Click "Deploy revision" on the new revision
//
//  REQUIRED SETUP:
//    Title Settings → Email Templates:
//      Make sure a password recovery email template exists.
//      (PlayFab creates a default one automatically.)
// ============================================================

function generateOTP() {
    var code = "";
    for (var i = 0; i < 6; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
}

// ── Registration OTP ─────────────────────────────────────────

handlers.sendOTP = function (args, context) {
    var code = generateOTP();
    var expiry = Date.now() + (10 * 60 * 1000);

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            "otp_code": code,
            "otp_expiry": expiry.toString()
        }
    });

    return { code: code };
};

handlers.verifyOTP = function (args, context) {
    var submitted = args.code;

    var result = server.GetUserInternalData({
        PlayFabId: currentPlayerId,
        Keys: ["otp_code", "otp_expiry"]
    });

    var stored = result.Data;
    if (!stored || !stored.otp_code || !stored.otp_expiry) {
        return { success: false, error: "No OTP found. Please request a new code." };
    }
    if (Date.now() > parseInt(stored.otp_expiry.Value, 10)) {
        return { success: false, error: "Code expired. Please request a new one." };
    }
    if (submitted !== stored.otp_code.Value) {
        return { success: false, error: "Incorrect code. Please try again." };
    }

    server.UpdateUserInternalData({
        PlayFabId: currentPlayerId,
        Data: {
            "otp_code": null,
            "otp_expiry": null,
            "email_verified": "true"
        }
    });

    return { success: true };
};

// ── Forgot Password: Step 1 — Generate & return OTP ──────────

handlers.sendPasswordResetOTP = function (args, context) {
    var email = args.email;

    if (!email || email.indexOf("@") === -1) {
        return { error: "Invalid email address." };
    }

    var accountInfo;
    try {
        accountInfo = server.GetUserAccountInfo({ Email: email });
    } catch (e) {
        // Security: don't reveal if email exists
        return { code: generateOTP() };
    }

    var targetId = accountInfo.UserInfo.PlayFabId;
    var code = generateOTP();
    var expiry = Date.now() + (10 * 60 * 1000);

    server.UpdateUserInternalData({
        PlayFabId: targetId,
        Data: {
            "pw_reset_code": code,
            "pw_reset_expiry": expiry.toString(),
            "pw_reset_email": email.toLowerCase()
        }
    });

    return { code: code };
};

// ── Forgot Password: Step 2 — Verify OTP, then trigger reset ─
//
//  After OTP is confirmed, this triggers PlayFab's built-in
//  SendAccountRecoveryEmail so the user gets a secure reset link.
//
//  WHY THIS APPROACH:
//  PlayFab has no "SetPassword" admin API. The only way to
//  change a password is through their token-based recovery flow.
//  Our OTP adds an extra identity verification layer on TOP of
//  PlayFab's secure reset — best of both worlds.

handlers.verifyPasswordResetOTP = function (args, context) {
    var email = args.email;
    var submitted = args.code;

    if (!email || !submitted) {
        return { success: false, error: "Email and code are required." };
    }

    var accountInfo;
    try {
        accountInfo = server.GetUserAccountInfo({ Email: email });
    } catch (e) {
        return { success: false, error: "No account found with that email." };
    }

    var targetId = accountInfo.UserInfo.PlayFabId;

    var result = server.GetUserInternalData({
        PlayFabId: targetId,
        Keys: ["pw_reset_code", "pw_reset_expiry"]
    });

    var stored = result.Data;
    if (!stored || !stored.pw_reset_code || !stored.pw_reset_expiry) {
        return { success: false, error: "No reset code found. Please request a new one." };
    }
    if (Date.now() > parseInt(stored.pw_reset_expiry.Value, 10)) {
        return { success: false, error: "Code expired. Please request a new one." };
    }
    if (submitted !== stored.pw_reset_code.Value) {
        return { success: false, error: "Incorrect code. Please try again." };
    }

    // ── OTP verified! Trigger PlayFab's password reset email ──
    try {
        http.request({
            url: "https://164227.playfabapi.com/Client/SendAccountRecoveryEmail",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                TitleId: "164227",
                Email: email
            })
        });
    } catch (e) {
        log.error("SendAccountRecoveryEmail failed: " + e.message);
        return { success: false, error: "Could not send reset email. Please try again." };
    }

    // Clean up
    server.UpdateUserInternalData({
        PlayFabId: targetId,
        Data: {
            "pw_reset_code": null,
            "pw_reset_expiry": null,
            "pw_reset_email": null
        }
    });

    return { success: true };
};

// ── Download counter ─────────────────────────────────────────

handlers.incrementDownloadCount = function (args, context) {
    try {
        var result = server.GetTitleInternalData({ Keys: ["DownloadCount"] });
        var current = 0;
        if (result.Data && result.Data.DownloadCount) {
            current = parseInt(result.Data.DownloadCount.Value, 10) || 0;
        }
        server.SetTitleInternalData({
            Key: "DownloadCount",
            Value: (current + 1).toString()
        });
    } catch (e) {
        log.error("incrementDownloadCount failed: " + e.message);
    }
    return { success: true };
};