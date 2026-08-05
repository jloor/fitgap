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
      <h2 style={{ fontSize: '1rem', marginTop: '2rem' }}>Failing on purpose</h2>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>
        Most integration time is spent on the bad days, so they are reproducible here.
        Send <code>X-Fitgap-Simulate</code> with <code>500</code>, <code>502</code>, <code>429</code>,
        <code> 401</code>, <code>slow</code> or <code>timeout</code> — or use an id ending
        <code> _500</code>, <code>_429</code>, <code>_slow</code>, <code>_timeout</code> when you
        cannot set headers.
      </p>
      <ul style={{ color: '#555', fontSize: '0.9rem', paddingLeft: '1.1rem' }}>
        <li>Requests need <code>Authorization: Bearer &lt;any-token&gt;</code>; a missing or malformed
          header returns <code>401</code>.</li>
        <li>Bodies are validated against the schema. A <code>422</code> lists every offending field by
          JSON Pointer, e.g. <code>/sourceUrl</code>.</li>
        <li>Unknown ids return <code>404</code> rather than someone else&rsquo;s example.</li>
        <li>Collections take <code>?limit=</code> and <code>?cursor=</code>, and return a
          <code> pagination.next</code> cursor plus a <code>Link</code> header.</li>
        <li>Reads carry an <code>ETag</code>; send it back as <code>If-None-Match</code> for a
          <code> 304</code>.</li>
        <li>Every response carries <code>X-Request-Id</code>, echoed into error bodies. Send your own
          and it is preserved.</li>
      </ul>
    </main>
  )
}
