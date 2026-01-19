export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <h1>Terms of Service</h1>

      <p>Last updated: {new Date().toDateString()}</p>

      <p>
        By using BugSnap AI, you agree to the following terms and conditions.
      </p>

      <h2>Service</h2>
      <p>
        BugSnap AI provides an AI-powered tool to generate bug reports and
        optionally push them to third-party tools like Jira.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You are responsible for your account usage</li>
        <li>You must not abuse or attempt to break the system</li>
      </ul>

      <h2>Limitations</h2>
      <p>
        The service is provided "as is" without warranties. We do not guarantee
        that the AI output is always correct.
      </p>

      <h2>Third-party services</h2>
      <p>
        BugSnap AI integrates with third-party services like Jira. We are not
        responsible for their availability or behavior.
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or terminate access if the service is abused.
      </p>

      <h2>Contact</h2>
      <p>
        For any questions, contact: <b>support@bugsnap-ai.com</b>
      </p>
    </div>
  );
}
