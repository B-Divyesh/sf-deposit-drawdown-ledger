# Demo sandbox

Open <https://deposit-drawdown-ledger.sociobot.in/demo> or use `/demo` from a
local preview. The page immediately shows the Elm Street kitchen joinery job
for Hawthorn Café: a $4,800 deposit request, two received payments, an approved
drawdown, and a visible adjustment.

Demo mode uses the IndexedDB database `demo:retainer-ledger-v1` and the
`demo:retainer-ledger:selected-job` localStorage key. Real mode uses different
names without the `demo:` prefix. While the banner is visible, the application
only opens the demo database; it never reads or writes the real ledger.

Use **Reset demo** to discard changes and reseed that sample. Use **Start for
real** to discard the demo database and open the empty real ledger. No demo
entry is copied into real data.
