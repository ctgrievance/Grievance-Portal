// src/api/verifyOTP.js

export async function verifyOTP(id, otp, password, role) {
  // ✅ Backend URL updated to match server.js
  const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/verify-otp-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // ✅ Backend expects password and role too
    body: JSON.stringify({ id, otp, password, role })
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "OTP verification failed");
  }

  return await res.json();   // Returns: { message, id, role, token }
}