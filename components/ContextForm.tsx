type Props = {
  intent: string;
  setIntent: (v: string) => void;
  environment: string;
  setEnvironment: (v: string) => void;
  browser: string;
  setBrowser: (v: string) => void;
};

export default function ContextForm(props: Props) {
  return (
    <div className="section">
      

      {/* Intent */}
      <label>What were you trying to do?</label>
      <input
        placeholder="e.g. Validating card selection on checkout"
        value={props.intent}
        onChange={(e) => props.setIntent(e.target.value)}
      />

      <p className="note">
        Short description helps generate a more accurate bug.
      </p>

      {/* Grid for Environment + Browser */}
      <div className="grid">
        <div>
          <label>Environment</label>
          <select
            value={props.environment}
            onChange={(e) => props.setEnvironment(e.target.value)}
          >
            <option>QA</option>
            <option>UAT</option>
            <option>Prod</option>
            <option>Dev</option>
          </select>
        </div>

        <div>
          <label>Browser / App</label>
          <input
            placeholder="e.g. Chrome 122 / iOS App"
            value={props.browser}
            onChange={(e) => props.setBrowser(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
