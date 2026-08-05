export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '4rem auto', padding: '0 1.5rem', lineHeight: 1.6 }}>
      <h1 style={{ marginBottom: '0.25rem' }}>Fitgap mock API</h1>
      <p style={{ color: '#555', marginTop: 0 }}>
        Every response here is derived from the OpenAPI definition, not hand-written fixtures.
      </p>
      <pre style={{ background: '#0f2b46', color: '#e8f3f2', padding: '1rem', borderRadius: 8, overflowX: 'auto' }}>
{`curl https://api.fitgap.org/v1/targets \\
  -H "Authorization: Bearer anything"`}
      </pre>
      <p>
        Docs: <a href="https://docs.fitgap.org">docs.fitgap.org</a> ·
        Source: <a href="https://github.com/jloor/fitgap">github.com/jloor/fitgap</a>
      </p>
      <p style={{ color: '#777', fontSize: '0.9rem' }}>
        Two behaviours are simulated: a target id beginning <code>tgt_fail</code> makes
        <code> POST /targets/&#123;id&#125;/analyses</code> return <code>409 gate_failed</code> unless the body sets
        <code> overrideGate: true</code>; and <code>POST /gaps/&#123;id&#125;/excavations</code> always resolves the gap.
      </p>
    </main>
  )
}
