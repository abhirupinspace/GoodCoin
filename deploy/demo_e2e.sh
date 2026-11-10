#!/usr/bin/env bash
# End-to-end run of the whole GOODCOIN loop against a live testnet deployment (demo config).
# Doubles as the integration test: every step asserts on contract state read back from chain.
#
# usage: deploy/demo_e2e.sh <contract-account> <team-account>
# Flow: challenge -> 3 deeds -> 3x3 attestations -> epoch SUCCEEDS -> 3 reward mints (+streak)
#       -> verified contributors propose & vote -> treasury disbursement
#       -> dispute overturns a deed -> next epoch FAILS -> streak resets, 0.1% treasury burn.
set -euo pipefail
C=$1; TEAM=$2; NET=testnet
a() { echo "$1.$TEAM"; }
log() { printf '\n\033[1;32m== %s\033[0m\n' "$*"; }

view() { # view <method> <json>
  near contract call-function as-read-only "$C" "$1" json-args "${2:-{\}}" network-config $NET now 2>/dev/null \
    | sed -n '/^[\[{"0-9tfn]/,$p'
}
call() { # call <signer> <method> <json> [deposit]
  near contract call-function as-transaction "$C" "$2" json-args "$3" prepaid-gas '100.0 Tgas' \
    attached-deposit "${4:-0.02 NEAR}" sign-as "$1" network-config $NET sign-with-legacy-keychain send 2>&1 \
    | grep -E "Transaction ID|Error|panicked|Smart contract panicked" | sed 's/^/   /' || true
}
jqv() { view "$1" "${2:-{\}}" | jq -r "$3"; }
chain_now() { jqv get_stats '{}' '.now_ns'; }
wait_until() { # wait_until <ns> <why>
  local target=$1
  while :; do
    local now; now=$(chain_now)
    (( now > target )) && break
    local left=$(( (target - now) / 1000000000 + 1 ))
    printf '\r   waiting %4ss for %s ' "$left" "$2"; sleep $(( left > 15 ? 15 : left ))
  done; sleep 2; echo
}
sha() { printf '%s' "$1" | shasum -a 256 | cut -d' ' -f1; }
must() { [[ "$1" == "$2" ]] || { echo "ASSERTION FAILED: $3 (got '$1', want '$2')"; exit 1; }; }

log "Config label: $(jqv get_config '{}' .label) | locked keys check:"
near account list-keys "$C" network-config $NET now 2>/dev/null | tail -3 || true

E=$(jqv get_stats '{}' .current_epoch); END=$(jqv get_stats '{}' .current_epoch_end_ns); NOW=$(chain_now)
if (( (END - NOW) / 1000000000 < 200 )); then
  log "Less than 200s left in epoch $E; starting in the next epoch"; wait_until "$END" "epoch $((E+1))"
fi
E=$(jqv get_stats '{}' .current_epoch); NOW=$(chain_now)
log "Working in epoch $E"

log "1. Organizer creates and publishes a challenge"
START=$NOW; SUBEND=$(( NOW + 3600 * 1000000000 )); VEND=$(( SUBEND + 600 * 1000000000 ))
CH=$(jqv get_stats '{}' .challenges)
call "$(a org)" create_challenge "{\"input\":{\"name\":\"Teach someone a skill\",\"description\":\"Spend an hour teaching someone something useful and publish a short public note about it.\",\"kind\":\"Digital\",\"category\":\"education\",\"instructions\":\"Teach, then link a public write-up (blog, gist, PR) describing what was taught.\",\"evidence_requirements\":\"Public URL; SHA-256 of the linked content\",\"eligibility\":\"Any NEAR account\",\"open_to\":\"Anyone\",\"start_ns\":\"$START\",\"end_ns\":\"$SUBEND\",\"verification_deadline_ns\":\"$VEND\",\"max_approved\":100,\"target_participants\":3,\"target_approved\":3}}" '0.05 NEAR'
call "$(a org)" publish_challenge "{\"challenge_id\":$CH}" '0 NEAR'
must "$(jqv get_challenge "{\"challenge_id\":$CH}" .phase)" "Active" "challenge active"

log "2. Alice, Bob and Carol submit good deeds (evidence URI + SHA-256)"
SUB0=$(jqv get_stats '{}' .submissions)
for who in alice bob carol; do
  URI="https://github.com/near/docs/pull/$RANDOM-$who"
  call "$(a $who)" submit_deed "{\"challenge_id\":$CH,\"evidence_hash\":\"$(sha "$URI")\",\"evidence_uri\":\"$URI\",\"description\":\"$who taught a friend how to create a NEAR wallet\"}" '0.05 NEAR'
done

log "3. Three independent reviewers attest each submission"
for i in 0 1 2; do for r in r0 r1 r2; do call "$(a $r)" attest "{\"submission_id\":\"$((SUB0+i))\",\"approve\":true}"; done; done
must "$(jqv get_epoch "{\"epoch\":\"$E\"}" .record.approved_deeds)" "3" "3 approved deeds"
must "$(jqv get_epoch "{\"epoch\":\"$E\"}" .record.participants)" "3" "3 participants"
echo "   epoch $E progress: 3/3 deeds, 3/3 participants -> target met"

log "4. Wait for epoch $E to end + dispute window, then anyone settles"
wait_until "$(jqv get_epoch "{\"epoch\":\"$E\"}" .settleable_at_ns)" "epoch $E settlement"
call "$(a dave)" settle_epochs '{}' '0 NEAR'
must "$(jqv get_epoch "{\"epoch\":\"$E\"}" .record.status)" "Succeeded" "epoch succeeded"
jqv get_stats '{}' '"   streak=\(.current_streak) longest=\(.longest_streak)"'

log "5. Participants claim GOOD (minted from the reserve)"
for who in alice bob carol; do call "$(a $who)" claim_reward "{\"epoch\":\"$E\"}" '0.01 NEAR'; done
jqv ft_balance_of "{\"account_id\":\"$(a alice)\"}" '"   alice balance (yocto-GOOD): \(.)"'
jqv get_supply '{}' '"   total_supply=\(.total_supply) minted=\(.total_minted) burned=\(.total_burned)"'

log "6. Treasury: Alice proposes, Bob & Carol vote, anyone executes"
P=$(jqv get_stats '{}' .proposals)
call "$(a alice)" create_proposal "{\"input\":{\"title\":\"Wallet workshop snacks\",\"description\":\"Snacks and printed guides for a 30-person beginner wallet workshop.\",\"bucket\":\"Education\",\"amount\":\"150000000000000000000000000\",\"beneficiary\":\"$(a dave)\",\"beneficiary_name\":\"Dave's Workshop\",\"evidence_uri\":\"https://example.org/workshop-plan\",\"voting_duration_ns\":\"60000000000\"}}" '0.05 NEAR'
for who in bob carol; do call "$(a $who)" vote_proposal "{\"proposal_id\":\"$P\",\"support\":true}"; done
wait_until "$(jqv list_proposals "{\"from_index\":$P,\"limit\":1}" '.[0].voting_end')" "voting end"
call "$(a dave)" finalize_proposal "{\"proposal_id\":\"$P\"}" '0.01 NEAR'
must "$(jqv list_proposals "{\"from_index\":$P,\"limit\":1}" '.[0].status')" "Executed" "proposal executed"
jqv ft_balance_of "{\"account_id\":\"$(a dave)\"}" '"   dave received (yocto-GOOD): \(.)"'

E2=$(jqv get_stats '{}' .current_epoch)
log "7. Epoch $E2: Dave submits, gets approved, r3 disputes, r4+r5 overturn it"
URI="https://example.org/fake-$RANDOM"
SD=$(jqv get_stats '{}' .submissions)
call "$(a dave)" submit_deed "{\"challenge_id\":$CH,\"evidence_hash\":\"$(sha "$URI")\",\"evidence_uri\":\"$URI\",\"description\":\"dave claims he taught a class\"}" '0.05 NEAR'
for r in r0 r1 r2; do call "$(a $r)" attest "{\"submission_id\":\"$SD\",\"approve\":true}"; done
D=$(jqv get_stats '{}' .disputes)
call "$(a r3)" open_dispute "{\"submission_id\":\"$SD\",\"reason\":\"The linked page does not exist\"}" '0.05 NEAR'
for r in r4 r5; do call "$(a $r)" vote_dispute "{\"dispute_id\":\"$D\",\"valid\":false}"; done
must "$(jqv get_submission "{\"submission_id\":\"$SD\"}" .submission.status)" "Rejected" "dispute overturned deed"

log "8. Epoch $E2 misses its targets -> fails: streak resets, 0.1% of locked treasury burns"
wait_until "$(jqv get_epoch "{\"epoch\":\"$E2\"}" .settleable_at_ns)" "epoch $E2 settlement"
call "$(a dave)" settle_epochs '{}' '0 NEAR'
must "$(jqv get_epoch "{\"epoch\":\"$E2\"}" .record.status)" "Failed" "epoch failed"
jqv get_epoch "{\"epoch\":\"$E2\"}" '"   burned (yocto-GOOD): \(.record.burned)"'
jqv get_stats '{}' '"   streak=\(.current_streak) longest=\(.longest_streak) ok=\(.successful_epochs) failed=\(.failed_epochs)"'

log "9. On-chain invariants"
view check_invariants '{}'
must "$(jqv check_invariants '{}' '[.[]]|all')" "true" "all invariants hold"
log "E2E PASSED"
