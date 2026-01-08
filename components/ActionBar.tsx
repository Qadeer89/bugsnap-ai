type Props = {
  bug: string;
};

export default function ActionBar({ bug }: Props) {
  function copy() {
    navigator.clipboard.writeText(bug);
    alert("Bug copied to clipboard");
  }

  return (
    <div className="section">
      <button onClick={copy}>Copy for Jira</button>
    </div>
  );
}
