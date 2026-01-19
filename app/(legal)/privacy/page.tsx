export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <h1>Privacy Policy</h1>

      <p>Last updated: {new Date().toDateString()}</p>

      <p>
        BugSnap AI ("we", "our", "us") respects your privacy. This Privacy Policy
        explains how we collect, use, and protect your information.
      </p>

      <h2>What data we collect</h2>
      <ul>
        <li>Your email address (for login and account identification)</li>
        <li>Bug reports you generate inside the app</li>
        <li>Integration tokens (e.g., Jira) to make the integration work</li>
      </ul>

      <h2>What we do NOT do</h2>
      <ul>
        <li>We do not sell your data</li>
        <li>We do not use your data for advertising</li>
        <li>We do not track you across other products</li>
      </ul>

      <h2>How we use your data</h2>
      <ul>
        <li>To authenticate you</li>
        <li>To generate and store bug reports</li>
        <li>To push bugs to Jira when you request it</li>
      </ul>

      <h2>Data security</h2>
      <p>
        We take reasonable technical measures to protect your data from
        unauthorized access.
      </p>

      <h2>Contact</h2>
      <p>
        If you have any questions, contact us at:{" "}
        <b>support@bugsnap-ai.com</b>
      </p>
    </div>
  );
}
