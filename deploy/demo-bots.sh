#!/usr/bin/env bash
# Demo activity: N bot accounts each give the minimum (+ record fee) into a fire's current cycle, as real
# testnet transactions. Use it to watch the live feed, a catch, and the keeper settle it.
# usage: deploy/demo-bots.sh <fire-contract> [N=3]
# Bots: {alice..jane}.gcteam-ab92.testnet with keys in ~/.near-credentials (nothing secret in the repo).
set -euo pipefail
FIRE=$1; N=${2:-3}
RPC=https://test.rpc.fastnear.com
view() {
  local args=${2:-'{}'}
  curl -s $RPC -H 'content-type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"finality\":\"optimistic\",\"account_id\":\"$FIRE\",\"method_name\":\"$1\",\"args_base64\":\"$(printf '%s' "$args" | base64 | tr -d '\n')\"}}" \
    | python3 -c 'import sys,json;print(bytes(json.load(sys.stdin)["result"]["result"]).decode())'
}
CUR=$(view current_fire); CFG=$(view get_config)
WEEK=$(echo "$CUR" | python3 -c 'import sys,json;print(json.load(sys.stdin)["week"])')
CAUSE=$(echo "$CUR" | python3 -c 'import sys,json;print(json.load(sys.stdin)["cause"])')
GIFT=$(echo "$CFG" | python3 -c 'import sys,json;c=json.load(sys.stdin);print(int(c["min_gift"])+int(c["record_fee"]))')
echo "fire $FIRE week $WEEK cause $CAUSE gift $GIFT yocto x $N"
i=0
for b in alice bob carol dave erin frank gina hank ivan jane; do
  [ $i -ge $N ] && break
  acct=$b.gcteam-ab92.testnet
  if [ "$(view get_gift "{\"week\":\"$WEEK\",\"account_id\":\"$acct\"}")" != "null" ]; then continue; fi
  near contract call-function as-transaction "$FIRE" give json-args "{\"week\":\"$WEEK\",\"cause\":$CAUSE}" \
    prepaid-gas '80.0 Tgas' attached-deposit "$GIFT yoctoNEAR" sign-as "$acct" network-config testnet \
    sign-with-legacy-keychain send 2>&1 | grep -E "Transaction ID" | sed "s/^/$b /" || true
  i=$((i+1))
done
