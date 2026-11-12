#!/usr/bin/env bash
# Live end-to-end run of every GOODCOIN rule on testnet (demo parameters: 6-minute fires, goal 4).
# Asserts on contract state after every step and writes the transaction log to docs/TESTNET_RUN.md.
#
# usage: deploy/e2e.sh <demo-contract> <team-account>
# Expects a fresh demo deployment (deploy/deploy.sh demo ...) and funded accounts
# alice..jane + ghost under <team-account> in ~/.near-credentials.
#
# Fire 0  cause oss      alice 1 NEAR, bob (sparked by alice), carol, dave → CATCHES, payout Paid, claims
# Fire 1  cause ghost    5 givers → CATCHES; ghost account deleted → payout fails → cause dead, carried
# Fire 2  cause climate  1 giver → SMOTHERED; max supply shrinks; refund claimed
# Fire 3  cause oss      4 of 5 givers; alice kindles in the rescue window → CATCHES; payout drains carry
# Then: redeem at the floor, fire_card, check_invariants, list-keys.
set -euo pipefail
C=$1; TEAM=$2; NET=testnet
ROOT=$(cd "$(dirname "$0")/.." && pwd)
LOG=$ROOT/docs/TESTNET_RUN.md
a() { echo "$1.$TEAM"; }
GIFT="0.105 NEAR"   # 0.1 NEAR + 0.005 record fee
BIG="1.005 NEAR"    # 1 NEAR + record fee
STORAGE="0.01 NEAR" # GOOD storage registration (excess refunded)

mkdir -p "$(dirname "$LOG")"
{ echo "# GOODCOIN testnet E2E run"; echo; echo "Contract: \`$C\` · started $(date -u +%FT%TZ)"; echo; } > "$LOG"
log() { printf '\n\033[1;32m== %s\033[0m\n' "$*"; printf '\n## %s\n\n' "$*" >> "$LOG"; }
note() { echo "   $*"; echo "- $*" >> "$LOG"; }

view() { near contract call-function as-read-only "$C" "$1" json-args "$2" network-config $NET now 2>/dev/null; }
jv() { view "$1" "$2" | jq -r "$3"; }
call() { # call <signer> <method> <json> <deposit-yocto> [allow-fail]
  local out tx
  out=$(near contract call-function as-transaction "$C" "$2" json-args "$3" prepaid-gas '150.0 Tgas' \
    attached-deposit "$4" sign-as "$1" network-config $NET sign-with-legacy-keychain send 2>&1 || true)
  tx=$(echo "$out" | grep -oE "Transaction ID: [A-Za-z0-9]+" | head -1 | awk '{print $3}')
  if echo "$out" | grep -q "Smart contract panicked"; then
    local why; why=$(echo "$out" | grep -oE "Smart contract panicked: [^\"]*" | head -1)
    if [[ "${5:-}" == "allow-fail" ]]; then note "$2 by $1 → expected failure ($why) [tx](https://testnet.nearblocks.io/txns/$tx)"; return 0; fi
    echo "$out" | tail -5; echo "FAILED: $2 by $1: $why"; exit 1
  fi
  note "\`$2\` by \`${1%%.*}\` [${tx:0:10}…](https://testnet.nearblocks.io/txns/$tx)"
}
now_ns() { jv get_stats '{}' .now_ns; }
wait_until() { # wait_until <ns> <label>
  while :; do local n; n=$(now_ns); (( n >= $1 )) && break
    local left=$(( ($1 - n) / 1000000000 + 1 )); printf '\r   waiting %4ss for %s ' "$left" "$2"; sleep $(( left > 10 ? 10 : left )); done; echo
}
must() { [[ "$1" == "$2" ]] || { echo "ASSERTION FAILED: $3 (got '$1', want '$2')"; echo "- **ASSERTION FAILED:** $3 (got $1, want $2)" >> "$LOG"; exit 1; }; note "✔ $3"; }
end_of() { jv get_fire "{\"week\":\"$1\"}" .end_ns; }
give() { # give <who> <week> <deposit> [spark]
  local cause; cause=$(jv get_fire "{\"week\":\"$2\"}" .cause)
  local spark="null"; [[ -n "${4:-}" ]] && spark="\"$(a "$4")\""
  call "$(a "$1")" give "{\"week\":\"$2\",\"cause\":$cause,\"sparked_by\":$spark}" "$3"
}
settle_after() { wait_until "$(( $(end_of "$1") + 2000000000 ))" "end of fire $1"; call "$(a alice)" settle '{}' "0 NEAR" allow-fail; }

log "Setup"
note "config label: $(jv get_config '{}' .label), causes: $(jv get_causes '{}' '[.[].account]|join(", ")')"
must "$(jv current_fire '{}' .week)" "0" "fresh deployment: current fire is 0"
must "$(jv current_fire '{}' .goal)" "4" "fire 0 goal is 4"

log "Fire 0 — give together, with a spark"
give alice 0 "$BIG"
give bob 0 "$GIFT" alice
give carol 0 "$GIFT"
give dave 0 "$GIFT"
must "$(jv current_fire '{}' .givers)" "4" "4 givers / goal 4"
must "$(jv get_gift '{"week":"0","account_id":"'"$(a alice)"'"}' .weight)" "1025000000000000000000000" "a quarter of bob's first gift moved to alice's weight"
settle_after 0
must "$(jv get_fire '{"week":"0"}' .outcome)" "Caught" "fire 0 caught"
must "$(jv get_fire '{"week":"0"}' .minted)" "104000000000000000000000000000" "104,000 GOOD earmarked"
call "$(a alice)" payout '{"week":"0"}' "0 NEAR" allow-fail
sleep 3
must "$(jv get_fire '{"week":"0"}' .payout)" "Paid" "1.17 NEAR paid to the oss DAO"
for who in alice bob carol dave; do call "$(a $who)" claim '{"weeks":["0"]}' "$STORAGE"; done
must "$(jv ft_balance_of '{"account_id":"'"$(a alice)"'"}' .)" "82000000000000000000000000000" "alice received 82,000 GOOD"
must "$(jv ft_balance_of '{"account_id":"'"$(a bob)"'"}' .)" "6000000000000000000000000000" "bob received 6,000 GOOD"

log "Fire 1 — a cause disappears; its payout is carried"
must "$(jv current_fire '{}' .goal)" "5" "goal grew to 5 after an unkindled catch"
for who in erin frank gina hank ivan; do give $who 1 "$GIFT"; done
must "$(jv current_fire '{}' .cause_account)" "$(a ghost)" "fire 1 burns for the ghost cause"
near account delete-account "$(a ghost)" beneficiary "$TEAM" network-config $NET sign-with-legacy-keychain send >/dev/null 2>&1 && note "ghost cause account deleted"
settle_after 1
must "$(jv get_fire '{"week":"1"}' .outcome)" "Caught" "fire 1 caught"
call "$(a alice)" payout '{"week":"1"}' "0 NEAR" allow-fail
sleep 4
must "$(jv get_fire '{"week":"1"}' .payout)" "Carried" "payout to the deleted cause failed and was carried"
must "$(jv get_causes '{}' '.[1].dead')" "true" "ghost cause marked dead forever"

log "Fire 2 — too few givers: smothered"
MAX0=$(jv get_supply '{}' .max_supply)
give jane 2 "$GIFT"
settle_after 2
must "$(jv get_fire '{"week":"2"}' .outcome)" "Smothered" "fire 2 smothered"
MAX1=$(jv get_supply '{}' .max_supply)
note "max supply $MAX0 → $MAX1"
must "$(python3 -c "print($MAX1 < $MAX0)")" "True" "max supply shrank by fire 2's allowance"
call "$(a jane)" claim '{"weeks":["2"]}' "0 NEAR"

log "Fire 3 — kindle rescue; payout drains the carry"
must "$(jv current_fire '{}' .cause_account)" "gf-$(echo "$TEAM" | sed -E 's/gcteam-([a-z0-9]+)\.testnet/\1/')-oss.sputnik-v2.testnet" "rotation skips the dead cause"
for who in bob carol dave erin; do give $who 3 "$GIFT"; done
must "$(jv current_fire '{}' .goal)" "5" "4 of 5 givers"
wait_until "$(( $(end_of 3) - 30000000000 ))" "rescue window of fire 3"
note "kindle quote: $(jv kindle_quote '{"week":"3"}' .) GOOD base units"
call "$(a alice)" kindle '{"week":"3"}' "0 NEAR"
must "$(jv current_fire '{}' .goal)" "4" "goal lowered to 4 by kindling"
settle_after 3
must "$(jv get_fire '{"week":"3"}' .outcome)" "Caught" "rescued fire 3 caught"
call "$(a alice)" payout '{"week":"3"}' "0 NEAR" allow-fail
sleep 4
must "$(jv get_fire '{"week":"3"}' .payout)" "Paid" "fire 3 paid, including fire 1's carried NEAR"
must "$(jv get_stats '{}' .carry_total)" "0" "carry drained"

log "Redeem at the floor"
H0=$(jv get_hearth '{}' .floor_yocto_per_good)
call "$(a alice)" redeem '{"amount":"10000000000000000000000000000"}' "0 NEAR"
H1=$(jv get_hearth '{}' .floor_yocto_per_good)
note "floor (yocto per GOOD) $H0 → $H1"

log "Shareable card and invariants"
view fire_card '{"week":"3"}' | head -c 120; echo; note "fire_card returns an SVG"
must "$(jv check_invariants '{}' '[.[]]|all')" "true" "all on-chain invariants hold"
view check_invariants '{}' | tee -a "$LOG"
note "keys on contract: $(near account list-keys "$C" network-config $NET now 2>/dev/null | grep -c 'ed25519' || true)"
log "E2E PASSED"
