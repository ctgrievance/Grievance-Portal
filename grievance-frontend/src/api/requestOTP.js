export async function requestOTP(role, id, phone) {
  const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, id, phone })
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Failed to send OTP");
  }

  return await res.json();   // { message, otpId, otp? }
}
