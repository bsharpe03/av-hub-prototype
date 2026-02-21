export default function Footer() {
  return (
    <footer className="text-white/70 mt-12" style={{ backgroundColor: '#004F98' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-2">AV Hub</h3>
            <p className="text-sm">
              A centralized resource for autonomous vehicle policy, deployment,
              funding, and safety data. Developed by Atlas Public Policy.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Data Sources</h3>
            <ul className="text-sm space-y-1">
              <li>NHTSA Standing General Order</li>
              <li>National Conference of State Legislatures</li>
              <li>State DOT Permit Databases</li>
              <li>USDOT Grant Programs</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">About</h3>
            <p className="text-sm">
              This prototype aggregates publicly available data for research
              and policy analysis purposes. Data is updated periodically.
            </p>
          </div>
        </div>
        <div className="border-t border-white/20 mt-8 pt-4 text-sm text-center">
          &copy; {new Date().getFullYear()} Atlas Public Policy. Prototype — not for production use.
        </div>
      </div>
    </footer>
  )
}
