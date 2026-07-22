export async function registerUser(user) {
  const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || "Registration failed");
  }

  return await res.json();   // { message, user }
}
