"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div style={{ marginTop: "10px" }}>
        <span style={{ marginRight: "10px" }}>
          👋 {session.user?.email}
        </span>
        <button onClick={() => signOut()}>Logout</button>
      </div>
    );
  }

  return (
    <button onClick={() => signIn("google")}>
      Login with Google
    </button>
  );
}
